import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { it } from 'node:test';

it('reports unpublished public packages with paths relative to the checkout', async ({ mock }) => {
	const path = 'packages/@n8n/new-package.ee';
	const name = '@n8n/new-package';
	const writeGithubOutput = mock.fn();
	const exit = new Error('exit');
	const exitMock = mock.method(process, 'exit', () => {
		throw exit;
	});
	mock.method(console, 'log', () => {});
	const fetchMock = mock.method(globalThis, 'fetch', async (url) => {
		return new Response(null, {
			status: url === 'https://registry.npmjs.org/@n8n%2Fnew-package' ? 404 : 200,
		});
	});
	mock.module('./github-helpers.mjs', { namedExports: { writeGithubOutput } });
	mock.module('./pnpm-utils.mjs', {
		namedExports: {
			getMonorepoProjects: async () => [
				{ name, path: resolve(path), private: false },
				{ name: '@n8n/existing', path: resolve('packages/@n8n/existing'), private: false },
				{ name: '@n8n/private', path: resolve('packages/@n8n/private'), private: true },
			],
		},
	});

	await assert.rejects(import('./detect-new-packages.mjs'), (error) => error === exit);
	assert.deepEqual(exitMock.mock.calls[0].arguments, [1]);
	assert.equal(fetchMock.mock.callCount(), 2);
	assert.equal(writeGithubOutput.mock.callCount(), 1);
	assert.deepEqual(JSON.parse(writeGithubOutput.mock.calls[0].arguments[0].packages), [
		{ name, path },
	]);
});
