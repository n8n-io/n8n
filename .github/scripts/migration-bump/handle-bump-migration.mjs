/**
 * Handles a `/bump-migration` PR comment: moves the PR's added migrations after the head of its base branch in a commit that GitHub signs as the App.
 * Only the master copy of the bump script runs; nothing from the PR is installed or executed.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	getEventFromGithubEventPath,
	getPullRequestById,
	initGithub,
	isTeamMember,
	workflowRunUrl,
} from '../github-helpers.mjs';

export const COMMAND_TEAM = 'r-d';

const BUMP_SCRIPT = fileURLToPath(
	new URL('../../../packages/@n8n/db/scripts/bump-migrations.mjs', import.meta.url),
);
const COMMIT_MESSAGE = 'chore: Move migrations after the base branch head (no-changelog)';

// Child stderr is captured, never streamed, so git and script output cannot reach the run log.
const CAPTURE_OUTPUT = /** @type {const} */ (['ignore', 'pipe', 'pipe']);

/**
 * The error type and status code only: messages, stacks and command output can carry repository or token data.
 *
 * @param {unknown} error
 * @returns {string}
 */
function errorSummary(error) {
	const name = error instanceof Error ? error.name : 'Error';
	const status = /** @type {{ status?: unknown }} */ (error)?.status;
	return typeof status === 'number' ? `${name} with status ${status}` : name;
}

/**
 * Logs the error summary to the workflow run and returns the reply sentence that links to the run.
 *
 * @param {unknown} error
 * @returns {string}
 */
function errorInRunLog(error) {
	console.error(`/bump-migration step failed: ${errorSummary(error)}`);
	const url = workflowRunUrl();
	return url ? `The error is in the workflow run: ${url}` : 'The error is in the workflow run.';
}

/**
 * @param {string} cwd
 * @param {string[]} args
 * @returns {string}
 */
function git(cwd, args) {
	return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: CAPTURE_OUTPUT }).trim();
}

/**
 * @param {any} pullRequest
 * @param {string} commenter
 * @param {string} repository `<owner>/<repo>`
 * @returns {Promise<string | undefined>}
 */
async function refusalReason(pullRequest, commenter, repository) {
	const isMember = await isTeamMember(COMMAND_TEAM, commenter);
	const reasons = /** @type {Array<[boolean, string]>} */ ([
		[!isMember, 'Only n8n R&D members can run `/bump-migration`.'],
		[pullRequest.state !== 'open', '`/bump-migration` works only on an open PR.'],
		[pullRequest.head.repo?.full_name !== repository, 'The bot cannot push to a PR from a fork.'],
	]);
	return reasons.find(([applies]) => applies)?.[1];
}

/**
 * Creates the worktree changes as one commit through the Git Data API, with no custom author or committer, so GitHub signs it as the App.
 *
 * @param {{ octokit: any, owner: string, repo: string, worktree: string }} params
 * @returns {Promise<string>} The SHA of the new commit.
 */
async function createSignedCommit({ octokit, owner, repo, worktree }) {
	git(worktree, ['add', '-A']);
	const tree = git(worktree, ['diff', '--cached', '--name-status', '--no-renames', 'HEAD'])
		.split('\n')
		.map((line) => {
			const [status, path] = line.split('\t');
			return status === 'D'
				? { path, mode: '100644', type: 'blob', sha: null }
				: {
						path,
						mode: '100644',
						type: 'blob',
						content: readFileSync(join(worktree, path), 'utf8'),
					};
		});
	const parent = git(worktree, ['rev-parse', 'HEAD']);
	const baseTree = git(worktree, ['rev-parse', 'HEAD^{tree}']);
	const { data: newTree } = await octokit.rest.git.createTree({
		owner,
		repo,
		base_tree: baseTree,
		tree,
	});
	const { data: commit } = await octokit.rest.git.createCommit({
		owner,
		repo,
		message: COMMIT_MESSAGE,
		tree: newTree.sha,
		parents: [parent],
	});
	return commit.sha;
}

/**
 * @param {{ octokit: any, owner: string, repo: string, pullRequest: any, repoDir: string, react: (content: string) => Promise<unknown> }} params
 * @returns {Promise<string>} The reply for the PR.
 */
async function bumpPullRequest(params) {
	const { pullRequest, repoDir } = params;
	const head = pullRequest.head.ref;
	const base = pullRequest.base.ref;
	git(repoDir, [
		'fetch',
		'--quiet',
		'origin',
		`+refs/heads/${head}:refs/remotes/origin/${head}`,
		`+refs/heads/${base}:refs/remotes/origin/${base}`,
	]);
	const tempDir = mkdtempSync(join(tmpdir(), 'bump-migration-'));
	const worktree = join(tempDir, 'pr');
	git(repoDir, ['worktree', 'add', '--quiet', '--detach', worktree, `refs/remotes/origin/${head}`]);
	try {
		return await bumpInWorktree({ ...params, worktree, head, base });
	} finally {
		git(repoDir, ['worktree', 'remove', '--force', worktree]);
		rmSync(tempDir, { recursive: true, force: true });
	}
}

/**
 * @param {{ octokit: any, owner: string, repo: string, worktree: string, head: string, base: string, react: (content: string) => Promise<unknown> }} params
 * @returns {Promise<string>} The reply for the PR.
 */
async function bumpInWorktree({ octokit, owner, repo, worktree, head, base, react }) {
	const moves = execFileSync(
		process.execPath,
		[BUMP_SCRIPT, `--base=refs/remotes/origin/${base}`],
		{
			cwd: worktree,
			encoding: 'utf8',
			stdio: CAPTURE_OUTPUT,
		},
	).trim();
	if (git(worktree, ['status', '--porcelain']) === '') {
		return `Nothing to move. Every migration in this PR is already after the head of \`${base}\`.`;
	}

	const newHead = await createSignedCommit({ octokit, owner, repo, worktree });
	try {
		await octokit.rest.git.updateRef({
			owner,
			repo,
			ref: `heads/${head}`,
			sha: newHead,
			force: false,
		});
	} catch (pushError) {
		return `The bump push failed. Pull the branch and run \`/bump-migration\` again. ${errorInRunLog(pushError)}`;
	}

	await react('rocket');
	return `Moved the migrations after the head of \`${base}\`:\n\n\`\`\`\n${moves}\n\`\`\``;
}

/**
 * @param {{ prNumber: number, commenter: string, commentId: number, repoDir: string }} params
 */
export async function run({ prNumber, commenter, commentId, repoDir }) {
	const { octokit, owner, repo } = initGithub();
	// Reactions only show progress, so a failed one never changes the outcome.
	const react = async (/** @type {string} */ content) => {
		try {
			await octokit.rest.reactions.createForIssueComment({
				owner,
				repo,
				comment_id: commentId,
				content,
			});
		} catch (error) {
			console.error(`/bump-migration reaction failed: ${errorSummary(error)}`);
		}
	};

	const pullRequest = await getPullRequestById(prNumber);
	let reply = await refusalReason(pullRequest, commenter, `${owner}/${repo}`);
	let failure;
	if (reply === undefined) {
		await react('eyes');
		try {
			reply = await bumpPullRequest({ octokit, owner, repo, pullRequest, repoDir, react });
		} catch (error) {
			failure = error;
			reply = `\`/bump-migration\` failed. ${errorInRunLog(error)}`;
		}
	}
	await octokit.rest.issues.createComment({ owner, repo, issue_number: prNumber, body: reply });
	if (failure) throw new Error(`/bump-migration failed: ${errorSummary(failure)}`);
}

export async function main() {
	const event = getEventFromGithubEventPath();
	await run({
		prNumber: event.issue.number,
		commenter: event.comment.user.login,
		commentId: event.comment.id,
		repoDir: process.env.GITHUB_WORKSPACE ?? process.cwd(),
	});
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}
