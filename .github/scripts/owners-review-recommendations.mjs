import { readFileSync } from "node:fs";
import { minimatch } from "minimatch";
import { ensureEnvVar, initGithub } from "./github-helpers.mjs";

/**
 * @typedef Owner
 * @property { string } filepath
 * @property { string } team
 * */

/**
 * @typedef Allocation
 * @property { string } team
 * @property { number } fileCount
 * */

/**
 * @typedef { Map<string, string[]> } Ownerships
 * */

/**
 * @returns { Owner[] }
 * */
export function parseOwnersFile() {
	const content = readFileSync(".github/OWNERS", "utf8");

	const owners = content.split("\n")
	.filter(line => line.includes("@n8n-io"))
	.map(line => ({
			filepath: line.match(/^\S+/)?.at(0),
			team: line.match(/@n8n-io\/.*/)?.at(0)
		}))
	.filter(/** @returns { owner is Owner } */ (owner) =>
		owner.filepath !== undefined && owner.team !== undefined
	);

	return owners;
}

/**
 * Translate a CODEOWNERS-style pattern into a minimatch glob.
 *   "*"            -> "**"        (catch-all)
 *   "packages/x/"  -> "packages/x/**"  (directory, recursive)
 *   "path/to/f.ts" -> "path/to/f.ts"   (exact file or already a glob)
 *
 * @param { string } pattern
 * @returns { string }
 * */
function codeownersToMinimatch(pattern) {
	if (pattern === "*") return "**";
	if (pattern.endsWith("/")) return pattern + "**";
	return pattern;
}

/**
 * Map each changed file to the team that owns it, applying CODEOWNERS
 * last-match-wins semantics. Files that match no rule are omitted.
 *
 * @param { Set<string> } files
 * @param { Owner[] } owners
 *
 * @returns { Ownerships } team -> files it owns in this changeset
 * */
export function assignOwnership(files, owners) {
	const compiled = owners.map(owner => ({
		team: owner.team,
		glob: codeownersToMinimatch(owner.filepath),
	}));

	/** @type { Map<string, string[]> } */
	const teamToFiles = new Map();

	for (const file of files) {
		// Walk rules in reverse so the *last* matching rule wins.
		for (let i = compiled.length - 1; i >= 0; i--) {
			if (minimatch(file, compiled[i].glob, { dot: true })) {
				const team = compiled[i].team;
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
 * @param { number } pullRequestNumber
 *
 * @returns { Promise<Set<string>> }
 * */
export async function getChangedFiles(pullRequestNumber) {
	const { octokit, owner, repo, } = initGithub();

	const files = await octokit.paginate(
		octokit.rest.pulls.listFiles,
		{
			owner,
			repo,
			pull_number: pullRequestNumber,
			per_page: 100
		}
	);

	const filenames = new Set([
		...files.map(file => file.filename),
		...files.map(file => file.previous_filename).filter(filename => filename !== undefined)
	]);

	return filenames;
}

/**
 * @param { Ownerships } ownerships
 *
 * @returns { Allocation[] }
 * */
export function ownershipsToAllocations(ownerships) {
	return Array.from(ownerships).map(([team, files]) => ({
			team,
			fileCount: files.length
		}))
}

/**
 * @param { number } pullRequestNumber
 * */
export async function getReviewRecommendations(pullRequestNumber) {
	const changedFiles = await getChangedFiles(pullRequestNumber);
	const owners = parseOwnersFile();

	const ownerships = assignOwnership(changedFiles, owners);
	const allocations = ownershipsToAllocations(ownerships);

	const topAllocations = allocations.sort((a,b) => b.fileCount - a.fileCount).slice(0, 3);

	await commentOnPrWithRecommendations(pullRequestNumber, topAllocations, changedFiles);
}

const BOT_MARKER = "<!-- owners-review-recommendations -->";

/**
 * Build the PR comment body listing the top reviewer teams with their share
 * of ownership over the changed files.
 *
 * @param { Allocation[] } allocations
 * @param { Set<string> } changedFiles
 * @returns { string }
 * */
export function buildRecommendationsBody(allocations, changedFiles) {
	const total = changedFiles.size;

	if (allocations.length === 0 || total === 0) {
		return [
			BOT_MARKER,
			"## Recommended reviewers",
			"",
			"_No owning teams matched the files changed in this PR._",
		].join("\n");
	}

	const rows = allocations.map(({ team, fileCount }) => {
		const pct = Math.round((fileCount / total) * 100);
		return `| ${team} | ${fileCount} | ${pct}% |`;
	});

	return [
		BOT_MARKER,
		"## Recommended reviewers",
		"",
		`Based on ownership of the ${total} changed file${total === 1 ? "" : "s"} in this PR:`,
		"",
		"| Team | Files owned | Share |",
		"| --- | ---: | ---: |",
		...rows,
	].join("\n");
}

/**
 * Post the recommendations as a PR comment, or update the existing one if a
 * previous run already left one (identified by BOT_MARKER).
 *
 * @param { number } pullRequestNumber
 * @param { Allocation[] } allocations
 * @param { Set<string> } changedFiles
 * */
export async function commentOnPrWithRecommendations(pullRequestNumber, allocations, changedFiles) {
	const { octokit, owner, repo } = initGithub();

	const body = buildRecommendationsBody(allocations, changedFiles);

	const comments = await octokit.paginate(octokit.rest.issues.listComments, {
		owner,
		repo,
		issue_number: pullRequestNumber,
		per_page: 100,
	});

	const existing = comments.find(c => c.body?.includes(BOT_MARKER));

	if (existing) {
		await octokit.rest.issues.updateComment({
			owner,
			repo,
			comment_id: existing.id,
			body,
		});
	} else {
		await octokit.rest.issues.createComment({
			owner,
			repo,
			issue_number: pullRequestNumber,
			body,
		});
	}
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	const pullRequestNumber = parseInt(ensureEnvVar("PULL_REQUEST_NUMBER"));

	await getReviewRecommendations(pullRequestNumber);
}
