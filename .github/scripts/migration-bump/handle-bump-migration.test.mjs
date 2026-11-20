import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/**
 * Run these tests by running
 *
 * node --test --experimental-test-module-mocks ./.github/scripts/migration-bump/handle-bump-migration.test.mjs
 * */

const OWNER = 'n8n-io';
const REPO = 'n8n';
const PR_NUMBER = 42;
const COMMENT_ID = 7;
const MIGRATIONS = 'packages/@n8n/db/src/migrations';
// Far-future timestamps keep the bump at `base head + 1`, independent of the clock.
const OLD = 8_000_000_000_000;
const ADDED = 8_000_000_000_100;
const BASE_HEAD = 8_000_000_000_200;
const OTHER_BASE_HEAD = 8_000_000_000_300;
const ABOVE_BASE_HEAD = 8_000_000_000_250;

let pullRequest = {};
let isMember = true;
let comments = [];
let reactions = [];
let createdTrees = [];
let createdCommits = [];
let refUpdates = [];
/** @type {'createTree' | 'updateRef' | 'createForIssueComment' | null} */
let failingCall = null;

const BUMP_SHA = 'bump-commit-sha';
const API_ERROR = 'Server Error';
const RUN_URL = 'https://github.com/n8n-io/n8n/actions/runs/1';

function failIf(call) {
	if (failingCall === call) throw Object.assign(new Error(API_ERROR), { status: 502 });
}

const octokit = {
	rest: {
		issues: {
			createComment: async ({ body }) => {
				comments.push(body);
			},
		},
		reactions: {
			createForIssueComment: async ({ content }) => {
				failIf('createForIssueComment');
				reactions.push(content);
			},
		},
		git: {
			createTree: async (tree) => {
				failIf('createTree');
				createdTrees.push(tree);
				return { data: { sha: 'tree-sha' } };
			},
			createCommit: async (commit) => {
				createdCommits.push(commit);
				return { data: { sha: BUMP_SHA } };
			},
			updateRef: async (update) => {
				failIf('updateRef');
				refUpdates.push(update);
			},
		},
	},
};

mock.module('../github-helpers.mjs', {
	namedExports: {
		initGithub: () => ({ octokit, owner: OWNER, repo: REPO }),
		getEventFromGithubEventPath: () => ({}),
		getPullRequestById: async () => pullRequest,
		isTeamMember: async () => isMember,
		workflowRunUrl: () => RUN_URL,
	},
});

const { run } = await import('./handle-bump-migration.mjs');

describe('handle-bump-migration', () => {
	let root;
	let origin;
	let seed;
	let workspace;

	function git(cwd, ...args) {
		return execFileSync(
			'git',
			[
				'-c',
				'user.name=test',
				'-c',
				'user.email=test@example.com',
				'-c',
				'commit.gpgsign=false',
				...args,
			],
			{ cwd, encoding: 'utf8' },
		).trim();
	}

	function addMigration(timestamp, name) {
		const path = join(seed, MIGRATIONS, 'common', `${timestamp}-${name}.ts`);
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, `export class ${name}${timestamp} {}\n`);
		git(seed, 'add', '-A');
		git(seed, 'commit', '-m', `add ${name}`);
	}

	function originHead(branch) {
		return git(origin, 'rev-parse', `refs/heads/${branch}`);
	}

	function treeEntry(path) {
		return createdTrees[0]?.tree.find((entry) => entry.path === path);
	}

	/** Seeds `master`, an optional `stack-parent`, and `feature`, then clones the workspace. */
	function seedRepos({ featureMigration = ADDED, stacked = false } = {}) {
		addMigration(OLD, 'Old');
		const featureBase = stacked ? 'stack-parent' : 'master';
		if (stacked) {
			git(seed, 'checkout', '-b', 'stack-parent');
			addMigration(BASE_HEAD, 'ParentHead');
		}
		git(seed, 'checkout', '-b', 'feature');
		addMigration(featureMigration, 'New');
		git(seed, 'checkout', 'master');
		addMigration(stacked ? OTHER_BASE_HEAD : BASE_HEAD, 'Head');
		git(seed, 'push', 'origin', '--all');
		git(root, 'clone', '--quiet', origin, workspace);

		pullRequest = {
			state: 'open',
			head: { ref: 'feature', sha: originHead('feature'), repo: { full_name: `${OWNER}/${REPO}` } },
			base: { ref: featureBase },
		};
	}

	async function runCommand() {
		await run({
			prNumber: PR_NUMBER,
			commenter: 'poly',
			commentId: COMMENT_ID,
			repoDir: workspace,
		});
	}

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), 'handle-bump-migration-'));
		origin = join(root, 'origin.git');
		seed = join(root, 'seed');
		workspace = join(root, 'workspace');
		git(root, 'init', '--quiet', '--bare', '-b', 'master', origin);
		git(root, 'clone', '--quiet', origin, seed);
		isMember = true;
		comments = [];
		reactions = [];
		createdTrees = [];
		createdCommits = [];
		refUpdates = [];
		failingCall = null;
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
	});

	it('pushes the bump and replies with the moves', async () => {
		seedRepos();

		await runCommand();

		assert.deepEqual(
			{
				moved: treeEntry(`${MIGRATIONS}/common/${BASE_HEAD + 1}-New.ts`)?.content,
				removed: treeEntry(`${MIGRATIONS}/common/${ADDED}-New.ts`)?.sha,
				reactions,
				comments,
			},
			{
				moved: `export class New${BASE_HEAD + 1} {}\n`,
				removed: null,
				reactions: ['eyes', 'rocket'],
				comments: [
					`Moved the migrations after the head of \`master\`:\n\n\`\`\`\nNew: ${ADDED} -> ${BASE_HEAD + 1}\n\`\`\``,
				],
			},
		);
	});

	it('replies with the moves when a reaction fails', async () => {
		seedRepos();
		failingCall = 'createForIssueComment';

		const failed = await runCommand().then(
			() => false,
			() => true,
		);

		assert.deepEqual(
			{ failed, comments },
			{
				failed: false,
				comments: [
					`Moved the migrations after the head of \`master\`:\n\n\`\`\`\nNew: ${ADDED} -> ${BASE_HEAD + 1}\n\`\`\``,
				],
			},
		);
	});

	it('creates the bump commit through the API on the PR head, so GitHub signs it as the App', async () => {
		seedRepos();

		await runCommand();

		const [commit] = createdCommits;
		assert.deepEqual(
			{
				parents: commit?.parents,
				customIdentity: 'author' in (commit ?? {}) || 'committer' in (commit ?? {}),
				refUpdates,
			},
			{
				parents: [pullRequest.head.sha],
				customIdentity: false,
				refUpdates: [
					{ owner: OWNER, repo: REPO, ref: 'heads/feature', sha: BUMP_SHA, force: false },
				],
			},
		);
	});

	it('bumps against the PR base branch', async () => {
		seedRepos({ stacked: true });

		await runCommand();

		assert.equal(
			treeEntry(`${MIGRATIONS}/common/${BASE_HEAD + 1}-New.ts`)?.content,
			`export class New${BASE_HEAD + 1} {}\n`,
		);
	});

	it('replies with the run link and no error text when the bump fails, and still fails the job', async () => {
		seedRepos();
		failingCall = 'createTree';

		const failed = await runCommand().then(
			() => false,
			() => true,
		);

		assert.deepEqual(
			{ failed, replies: comments },
			{
				failed: true,
				replies: [`\`/bump-migration\` failed. The error is in the workflow run: ${RUN_URL}`],
			},
		);
	});

	it('keeps the error text out of the reply, the run log and the job error', async () => {
		seedRepos();
		failingCall = 'createTree';
		const logged = [];
		const consoleError = mock.method(console, 'error', (...args) => logged.push(args.join(' ')));

		const jobError = await runCommand().then(
			() => '',
			(error) => String(error),
		);
		consoleError.mock.restore();

		assert.deepEqual(
			[...comments, ...logged, jobError].filter((text) => text.includes(API_ERROR)),
			[],
		);
	});

	it('replies with the run link and no error text when the push is rejected', async () => {
		seedRepos();
		failingCall = 'updateRef';

		await runCommand();

		assert.deepEqual(comments, [
			`The bump push failed. Pull the branch and run \`/bump-migration\` again. The error is in the workflow run: ${RUN_URL}`,
		]);
	});

	it('removes its temporary worktree', async () => {
		seedRepos();
		const leftovers = () =>
			readdirSync(tmpdir()).filter((entry) => entry.startsWith('bump-migration-')).length;
		const before = leftovers();

		await runCommand();

		assert.deepEqual(
			{ worktrees: git(workspace, 'worktree', 'list').split('\n').length, tempDirs: leftovers() },
			{ worktrees: 1, tempDirs: before },
		);
	});

	describe('refusals', () => {
		/** @param {string} reply */
		const nothingPushedWithReply = (reply) => ({ pushed: 0, replies: [reply] });

		async function outcome() {
			await runCommand();
			return { pushed: refUpdates.length, replies: comments };
		}

		it('replies and pushes nothing when the commenter is outside r-d', async () => {
			seedRepos();
			isMember = false;

			assert.deepEqual(
				await outcome(),
				nothingPushedWithReply('Only n8n R&D members can run `/bump-migration`.'),
			);
		});

		it('replies and pushes nothing for a fork PR', async () => {
			seedRepos();
			pullRequest.head.repo.full_name = 'someone/n8n';

			assert.deepEqual(
				await outcome(),
				nothingPushedWithReply('The bot cannot push to a PR from a fork.'),
			);
		});

		it('replies and pushes nothing for a closed PR', async () => {
			seedRepos();
			pullRequest.state = 'closed';

			assert.deepEqual(
				await outcome(),
				nothingPushedWithReply('`/bump-migration` works only on an open PR.'),
			);
		});

		it('replies when there is nothing to move', async () => {
			seedRepos({ featureMigration: ABOVE_BASE_HEAD });

			assert.deepEqual(
				await outcome(),
				nothingPushedWithReply(
					'Nothing to move. Every migration in this PR is already after the head of `master`.',
				),
			);
		});
	});
});
