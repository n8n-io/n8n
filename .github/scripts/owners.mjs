import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * @typedef Owner
 * @property { string } filepath
 * @property { string } team
 * */

/**
 * @typedef { Map<string, string[]> } Ownerships
 * */

/**
 * @typedef Allocation
 * @property { string } team
 * @property { number } fileCount
 * */

// Resolve relative to this file so the path works regardless of cwd
// (workflow runs from repo root; `npm test` runs from .github/scripts).
export const OWNERS_FILE = join(import.meta.dirname, "..", "OWNERS");

/**
 * Parse OWNERS file content into Owner records. Lines without an `@n8n-io/*`
 * team are skipped.
 *
 * @param { string } content
 * @returns { Owner[] }
 * */
export function parseOwnersContent(content) {
	return content.split("\n")
		.filter(line => line.includes("@n8n-io"))
		.map(line => ({
			filepath: line.match(/^\S+/)?.at(0),
			team: line.match(/@n8n-io\/.*/)?.at(0)
		}))
		.filter(/** @returns { owner is Owner } */ (owner) =>
			owner.filepath !== undefined && owner.team !== undefined
		);
}

/**
 * Read and parse the .github/OWNERS file.
 *
 * @param { string } [path] Optional override; defaults to OWNERS_FILE.
 * @returns { Owner[] }
 * */
export function parseOwnersFile(path = OWNERS_FILE) {
	const content = readFileSync(path, "utf8");
	return parseOwnersContent(content);
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
 * Map each changed file to the team that owns it, applying CODEOWNERS
 * last-match-wins semantics. Files that match no rule are omitted.
 *
 * @param { Set<string> } files
 * @param { Owner[] } owners
 * @returns { Ownerships } team -> files it owns in this changeset
 * */
export function assignOwnership(files, owners) {
	/** @type { Ownerships } */
	const teamToFiles = new Map();

	for (const file of files) {
		// Walk rules in reverse so the *last* matching rule wins.
		for (let i = owners.length - 1; i >= 0; i--) {
			if (matchesPattern(file, owners[i].filepath)) {
				const team = owners[i].team;
				const bucket = teamToFiles.get(team);

				if (bucket) {
					bucket.push(file);
				} else {
					teamToFiles.set(team, [file]);
				}
				break;
			}
		}
	}

	return teamToFiles;
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
