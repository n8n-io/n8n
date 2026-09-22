import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { configs } from './plugin.js';

describe('recommended config', () => {
	it('rejects a package published from a monorepo', () => {
		const linter = new Linter();
		const messages = linter.verify(
			`({
				"name": "@example/n8n-nodes-service",
				"version": "1.0.0",
				"description": "An example community node package",
				"homepage": "https://example.com",
				"author": {
					"name": "Example Author",
					"email": "author@example.com"
				},
				"files": ["dist"],
				"peerDependencies": {
					"n8n-workflow": "*"
				},
				"repository": {
					"type": "git",
					"url": "https://github.com/example/packages.git",
					"directory": "packages/n8n-nodes-service"
				},
				"n8n": {
					"n8nNodesApiVersion": 1,
					"nodes": ["dist/nodes/Example/Example.node.js"]
				}
			})`,
			[{ ...configs.recommended, files: ['**/package.json'] }],
			{ filename: 'package.json' },
		);

		// CE-2133: Published community nodes must use a single-package repository.
		expect(messages).toHaveLength(1);
	});
});
