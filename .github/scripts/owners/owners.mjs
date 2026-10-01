import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * @typedef OwnersEntry
 * @property { string } pattern
 * @property { string } owner Team handle or bare group key from OWNERS.
 * @property { string[] } teams Expanded GitHub team handles.
 * @property { boolean } required A member of the team must approve before merge.
 * @property { number } line 1-based line number in the OWNERS file.
 * */

/**
 * @typedef ReviewRequirement
 * @property { string } owner Team handle or bare group key.
 * @property { string[] } teams Teams where one member can satisfy this requirement.
 * @property { string[] } files Files that triggered this requirement.
 * */

/**
 * @typedef { Map<string, string[]> } Ownerships
 * */

/**
 * @typedef Allocation
 * @property { string } team
 * @property { number } fileCount
 * */

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");

// Resolve relative to this file so the path works regardless of cwd
// (workflow runs from repo root; `npm test` runs from .github/scripts).
export const OWNERS_FILE = join(REPO_ROOT, "OWNERS");
export const GROUPS_FILE = join(REPO_ROOT, "GROUPS.json");

// GitHub team handle, e.g. `@n8n-io/catalysts`.
const TEAM_TOKEN = /^@[\w.-]+\/[\w.-]+$/;
const GROUP_TOKEN = /^[\w.-]+$/;

/**
 * Parse the ordered group definitions in GROUPS.json.
 *
 * A group is an object key and its value is an array of team or group
 * handles. Group references must point to a group defined earlier in the
 * object. This makes the file easy to read and prevents forward references.
 *
 * @param { string } content
 * @returns { Map<string, string[]> }
 */
export function parseGroupsContent(content) {
	let parsed;
	try {
		parsed = JSON.parse(content);
	} catch (error) {
		throw new Error(`GROUPS.json is not valid JSON: ${error.message}`);
	}

	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error('GROUPS.json must contain an object of group handles');
	}

	const definitions = parsed;
	const groupNames = Object.keys(definitions);
	const groups = new Map();
	for (const [group, members] of Object.entries(definitions)) {
		if (!GROUP_TOKEN.test(group)) {
			throw new Error(`GROUPS.json: invalid group handle "${group}"`);
		}
		if (!Array.isArray(members) || members.length === 0 || !members.every((member) => typeof member === "string")) {
			throw new Error(`GROUPS.json: group "${group}" must contain a non-empty array of handles`);
		}

		const teams = [];
		for (const member of members) {
			if (!GROUP_TOKEN.test(member)) {
				throw new Error(`GROUPS.json: invalid handle "${member}" in group "${group}"`);
			}
			if (groupNames.includes(member)) {
				const nestedTeams = groups.get(member);
				if (!nestedTeams) {
				throw new Error(`GROUPS.json: group "${group}" can only include groups defined earlier`);
				}
				teams.push(...nestedTeams);
			} else {
				teams.push(`@n8n-io/${member}`);
			}
		}
		groups.set(group, [...new Set(teams)]);
	}

	return groups;
}

/**
 * Line grammar: `<pattern> <@org/team> [required]`
 * New option keywords go here.
 */
const OPTION_TOKENS = new Set(["required"]);

/**
 * @param { string } line
 * @returns { string }
 */
function stripComment(line) {
	const commentStart = line.match(/(^|\s)#/);
	return commentStart ? line.slice(0, commentStart.index) : line;
}

/**
 * Parse OWNERS file content into structured entries.
 *
 * Throws on lines that do not follow the grammar, so a malformed OWNERS
 * file fails loudly in every consumer instead of being silently ignored.
 *
 * @param { string } content
 * @returns { OwnersEntry[] }
 * */
export function parseOwnersContent(content, groups = new Map()) {
	/** @type { OwnersEntry[] } */
	const entries = [];

	content.split("\n").forEach((rawLine, index) => {
		const lineNumber = index + 1;
		const line = stripComment(rawLine).trim();
		if (!line) return;

		const [pattern, ...tokens] = line.split(/\s+/);
		/** @type { string | null } */
		let owner = null;
		let required = false;
		let sawOption = false;

		for (const token of tokens) {
			if (TEAM_TOKEN.test(token) || groups.has(token)) {
				if (sawOption) {
					throw new Error(`OWNERS line ${lineNumber}: team "${token}" must come before options`);
				}
				if (owner) {
					throw new Error(`OWNERS line ${lineNumber}: only one team per pattern is supported`);
				}
				owner = token;
			} else if (token === "required") {
				required = true;
				sawOption = true;
			} else if (OPTION_TOKENS.has(token)) {
				throw new Error(`OWNERS line ${lineNumber}: option "${token}" is not handled`);
			} else {
				throw new Error(`OWNERS line ${lineNumber}: unknown token "${token}"`);
			}
		}

		if (!owner) {
			throw new Error(`OWNERS line ${lineNumber}: no team for pattern "${pattern}"`);
		}

		entries.push({
			pattern,
			owner,
			teams: groups.get(owner) ?? [owner],
			required,
			line: lineNumber,
		});
	});

	return entries;
}

/**
 * Read and parse the OWNERS file.
 *
 * @param { string } [path] Optional override; defaults to OWNERS_FILE.
 * @returns { OwnersEntry[] }
 * */
export function parseOwnersFile(path = OWNERS_FILE) {
	const content = readFileSync(path, "utf8");
	const groups = parseGroupsContent(readFileSync(GROUPS_FILE, "utf8"));
	return parseOwnersContent(content, groups);
}

/**
 * @param { string } pattern
 * @returns { 'file' | 'directory' | null }
 * */
function getPathKind(pattern) {
	const stats = statSync(join(REPO_ROOT, pattern), { throwIfNoEntry: false });
	if (!stats) return null;
	return stats.isDirectory() ? "directory" : "file";
}

/**
 * Validate parsed OWNERS entries beyond the line grammar:
 *   - no duplicate patterns
 *   - directory patterns (trailing `/`) point at existing directories,
 *     all other patterns (except `*`) at existing files
 *
 * @param { OwnersEntry[] } entries
 * @param { (pattern: string) => 'file' | 'directory' | null } [pathKind]
 * @returns { string[] } validation errors, empty when the file is valid
 * */
export function validateOwners(entries, pathKind = getPathKind) {
	const errors = [];
	/** @type { Map<string, number> } */
	const seenPatterns = new Map();

	for (const entry of entries) {
		const firstLine = seenPatterns.get(entry.pattern);
		if (firstLine !== undefined) {
			errors.push(`duplicate pattern "${entry.pattern}" (lines ${firstLine} and ${entry.line})`);
		} else {
			seenPatterns.set(entry.pattern, entry.line);
		}

		if (entry.pattern !== "*") {
			const kind = pathKind(entry.pattern);
			const expectedKind = entry.pattern.endsWith("/") ? "directory" : "file";

			if (kind === null) {
				errors.push(`pattern "${entry.pattern}" (line ${entry.line}) does not exist in the repository`);
			} else if (kind !== expectedKind) {
				errors.push(
					kind === "directory"
						? `pattern "${entry.pattern}" (line ${entry.line}) is a directory; add a trailing "/"`
						: `pattern "${entry.pattern}" (line ${entry.line}) is a file; remove the trailing "/"`,
				);
			}
		}
	}

	return errors;
}

/**
 * Convert an OWNERS team handle (`@n8n-io/catalysts`) into the GitHub team slug
 * (`catalysts`) expected by the teams API.
 *
 * @param { string } team
 * @returns { string }
 */
export function teamHandleToSlug(team) {
	return team.replace(/^@[^/]+\//, "");
}

/**
 * Test whether `file` is matched by a CODEOWNERS-style pattern.
 *
 * The OWNERS file uses three pattern shapes, all handled here:
 *   "*"            catch-all (matches any file)
 *   "packages/x/"  directory pattern (matches every file under packages/x/ recursively)
 *   "path/to/f.ts" exact path
 *
 * If richer globs are ever introduced to OWNERS (e.g. `*.ts`, `**\/foo`),
 * extend this helper rather than reaching for a dependency.
 *
 * @param { string } file
 * @param { string } pattern
 * @returns { boolean }
 * */
export function matchesPattern(file, pattern) {
	if (pattern === "*") return true;
	if (pattern.endsWith("/")) return file.startsWith(pattern);
	return file === pattern;
}

/**
 * Find the entry that owns `file`, applying CODEOWNERS last-match-wins
 * semantics. Returns undefined when no entry matches.
 *
 * @param { string } file
 * @param { OwnersEntry[] } entries
 * @returns { OwnersEntry | undefined }
 * */
export function findOwningEntry(file, entries) {
	for (let i = entries.length - 1; i >= 0; i--) {
		if (matchesPattern(file, entries[i].pattern)) return entries[i];
	}
	return undefined;
}

/**
 * Map each changed file to the team that owns it, applying CODEOWNERS
 * last-match-wins semantics. Files that match no rule are omitted.
 *
 * @param { Set<string> } files
 * @param { OwnersEntry[] } entries
 * @returns { Ownerships } team -> files it owns in this changeset
 * */
export function assignOwnership(files, entries) {
	/** @type { Ownerships } */
	const teamToFiles = new Map();

	for (const file of files) {
		const entry = findOwningEntry(file, entries);
		if (!entry) continue;

		for (const team of entry.teams) {
			const bucket = teamToFiles.get(team);
			if (bucket) {
				bucket.push(file);
			} else {
				teamToFiles.set(team, [file]);
			}
		}
	}

	return teamToFiles;
}

/**
 * Determine which ownership requirements apply to the changeset. Separate
 * required team entries use AND semantics. Teams expanded from one required
 * group use OR semantics.
 *
 * @param { Set<string> } files
 * @param { OwnersEntry[] } entries
 * @returns { ReviewRequirement[] }
 * */
export function resolveReviewRequirements(files, entries) {
	/** @type { ReviewRequirement[] } */
	const requirements = [];

	for (const file of [...files].sort()) {
		const entry = findOwningEntry(file, entries);
		if (!entry?.required) continue;

		const requirement = requirements.find((candidate) => candidate.owner === entry.owner);
		if (requirement) requirement.files.push(file);
		else requirements.push({ owner: entry.owner, teams: entry.teams, files: [file] });
	}

	return requirements;
}

/**
 * @param { Ownerships } ownerships
 * @returns { Allocation[] }
 * */
export function ownershipsToAllocations(ownerships) {
	return Array.from(ownerships).map(([team, files]) => ({
		team,
		fileCount: files.length,
	}));
}

/**
 * Read a newline-delimited list of changed file paths from disk.
 * Empty/whitespace-only lines are skipped.
 *
 * @param { string } path
 * @returns { Set<string> }
 * */
export function readChangedFilesList(path) {
	return new Set(
		readFileSync(path, "utf8")
			.split("\n")
			.map(line => line.trim())
			.filter(Boolean)
	);
}

/**
 * @returns { never }
 */
function exitWithUsage() {
	console.error("Usage: node owners.mjs <changed-files-list> | --check");
	console.error("  <changed-files-list>: path to a file containing one changed path per line");
	console.error("  --check: validate the OWNERS file (syntax, duplicates, dead paths)");
	process.exit(1);
}

function runCheck() {
	/** @type { import('./owners.mjs').OwnersEntry[] } */
	let entries;
	try {
		entries = parseOwnersFile();
	} catch (error) {
		console.error(`OWNERS is invalid: ${error.message}`);
		process.exit(1);
	}

	const errors = validateOwners(entries);
	if (errors.length > 0) {
		for (const error of errors) console.error(`OWNERS is invalid: ${error}`);
		process.exit(1);
	}

	const requiredCount = entries.filter((entry) => entry.required).length;
	console.log(`OWNERS is valid: ${entries.length} entries, ${requiredCount} with required review.`);
}

// CLI: `node owners.mjs <changed-files-list>` prints ownership allocations for
// the given changed paths as JSON. `node owners.mjs --check` validates OWNERS.
if (import.meta.url === `file://${process.argv[1]}`) {
	const arg = process.argv[2];
	if (!arg) exitWithUsage();

	if (arg === "--check") {
		runCheck();
	} else {
		const files = readChangedFilesList(arg);
		const ownerships = assignOwnership(files, parseOwnersFile());
		const totalFiles = files.size;

		const allocations = Array.from(ownerships)
			.map(([team, ownedFiles]) => ({
				team,
				fileCount: ownedFiles.length,
				share: totalFiles === 0 ? 0 : Math.round((ownedFiles.length / totalFiles) * 100),
				files: ownedFiles,
			}))
			.sort((a, b) => b.fileCount - a.fileCount);

		console.log(JSON.stringify({ totalFiles, allocations }, null, 4));
	}
}
