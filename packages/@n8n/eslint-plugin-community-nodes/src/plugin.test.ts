import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { configs } from './plugin.js';

describe('recommended config', () => {
	const lintPackage = (directory: string) => {
		const linter = new Linter();
		return linter.verify(
			`(${JSON.stringify({
				name: '@example/n8n-nodes-service',
				version: '1.0.0',
				description: 'An example community node package',
				homepage: 'https://example.com',
				author: { name: 'Example Author', email: 'author@example.com' },
				files: ['dist'],
				peerDependencies: { 'n8n-workflow': '*' },
				repository: {
					type: 'git',
					url: 'https://github.com/example/packages.git',
					directory,
				},
				n8n: { n8nNodesApiVersion: 1, nodes: ['dist/nodes/Example/Example.node.js'] },
			})})`,
			[{ ...configs.recommended, files: ['**/package.json'] }],
			{ filename: 'package.json' },
		);
	};

	it('rejects a package published from a monorepo', () => {
		const messages = lintPackage('packages/n8n-nodes-service');

		expect(messages).toEqual([
			expect.objectContaining({
				severity: 2,
				message: expect.stringMatching(/monorepo|single-package repository/i),
			}),
		]);
	});

	it.each(['.', './', '././'])('accepts a root repository.directory of %s', (directory) => {
		expect(lintPackage(directory)).toEqual([]);
	});
});
