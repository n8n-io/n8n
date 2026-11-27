import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

/**
 * Run with:
 * node --test --experimental-test-module-mocks .github/scripts/quality/check-n8n-node-override.test.mjs
 */

let comments;
let permissions;

mock.module('../github-helpers.mjs', {
	namedExports: {
		getEventFromGithubEventPath: () => ({ pull_request: { number: 42 } }),
		initGithub: () => ({
			owner: 'n8n-io',
			repo: 'n8n',
			octokit: {
				paginate: async () => comments,
				rest: {
					issues: { listComments: () => {} },
					repos: {
						getCollaboratorPermissionLevel: async ({ username }) => {
							if (!(username in permissions)) {
								throw Object.assign(new Error('Not Found'), { status: 404 });
							}
							return { data: { permission: permissions[username] } };
						},
					},
				},
			},
		}),
	},
});

const { main, OVERRIDE_COMMAND } = await import('./check-n8n-node-override.mjs');

describe('check-n8n-node-override', () => {
	beforeEach(() => {
		comments = [];
		permissions = {};
	});

	it('passes when a user with write access commented the override command', async () => {
		comments = [{ body: OVERRIDE_COMMAND, user: { login: 'maintainer' } }];
		permissions = { maintainer: 'write' };

		await main();
	});

	it('passes when a write user overrides after a user whose permission lookup returns 404', async () => {
		comments = [
			{ body: OVERRIDE_COMMAND, user: { login: 'unknown' } },
			{ body: OVERRIDE_COMMAND, user: { login: 'maintainer' } },
		];
		permissions = { maintainer: 'write' };

		await main();
	});

	it('fails when no comment has the override command', async () => {
		comments = [{ body: '/size-limit-override', user: { login: 'maintainer' } }];
		permissions = { maintainer: 'write' };

		await assert.rejects(main(), /break saved workflows of the n8n node/);
	});

	it('fails when the override command comes from a user without write access', async () => {
		comments = [{ body: OVERRIDE_COMMAND, user: { login: 'contributor' } }];
		permissions = { contributor: 'triage' };

		await assert.rejects(main(), /break saved workflows of the n8n node/);
	});
});
