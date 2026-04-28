import { RuleTester } from '@typescript-eslint/rule-tester';

import { CommunityPackageJsonRule } from './community-package-json.js';

const tester = new RuleTester();

const VALID_PKG = JSON.stringify({
	name: 'n8n-nodes-example',
	version: '0.1.0',
	description: 'My custom n8n nodes',
	license: 'MIT',
	author: { name: 'Alice', email: 'alice@example.com' },
	repository: { type: 'git', url: 'https://github.com/alice/n8n-nodes-example.git' },
	keywords: ['n8n-community-node-package'],
	n8n: {
		n8nNodesApiVersion: 1,
		nodes: ['dist/nodes/Example/Example.node.js'],
	},
});

tester.run('community-package-json', CommunityPackageJsonRule, {
	valid: [{ filename: 'package.json', code: VALID_PKG }],
	invalid: [
		{
			filename: 'package.json',
			code: JSON.stringify({
				name: 'n8n-nodes-example',
				version: '0.1.0',
				description: 'My nodes',
				license: 'MIT',
				keywords: ['n8n-community-node-package'],
				n8n: { n8nNodesApiVersion: 1, nodes: ['dist/nodes/Example/Example.node.js'] },
			}),
			errors: [{ messageId: 'missingAuthor' }],
		},
		{
			filename: 'package.json',
			code: JSON.stringify({
				name: 'n8n-nodes-example',
				version: '0.1.0',
				description: 'My nodes',
				license: 'MIT',
				author: { email: 'a@b.com' },
				keywords: ['n8n-community-node-package'],
				n8n: { n8nNodesApiVersion: 1, nodes: ['dist/nodes/Example/Example.node.js'] },
			}),
			errors: [{ messageId: 'missingAuthorName' }],
		},
		{
			filename: 'package.json',
			code: JSON.stringify({
				name: 'n8n-nodes-example',
				version: '0.1.0',
				description: 'My nodes',
				license: 'MIT',
				author: { name: '', email: 'a@b.com' },
				keywords: ['n8n-community-node-package'],
				n8n: { n8nNodesApiVersion: 1, nodes: ['dist/nodes/Example/Example.node.js'] },
			}),
			errors: [{ messageId: 'defaultAuthorName' }],
		},
		{
			filename: 'package.json',
			code: JSON.stringify({
				name: 'n8n-nodes-example',
				version: '0.1.0',
				license: 'MIT',
				author: { name: 'Alice', email: 'a@b.com' },
				keywords: ['n8n-community-node-package'],
				n8n: { n8nNodesApiVersion: 1, nodes: ['dist/nodes/Example/Example.node.js'] },
			}),
			errors: [{ messageId: 'missingDescription' }],
		},
		{
			filename: 'package.json',
			code: JSON.stringify({
				name: 'n8n-nodes-example',
				version: '0.1.0',
				description: '',
				license: 'MIT',
				author: { name: 'Alice', email: 'a@b.com' },
				keywords: ['n8n-community-node-package'],
				n8n: { n8nNodesApiVersion: 1, nodes: ['dist/nodes/Example/Example.node.js'] },
			}),
			errors: [{ messageId: 'defaultDescription' }],
		},
		{
			filename: 'package.json',
			code: JSON.stringify({
				name: 'n8n-nodes-example',
				description: 'My nodes',
				license: 'MIT',
				author: { name: 'Alice', email: 'a@b.com' },
				keywords: ['n8n-community-node-package'],
				n8n: { n8nNodesApiVersion: 1, nodes: ['dist/nodes/Example/Example.node.js'] },
			}),
			errors: [{ messageId: 'missingVersion' }],
		},
		{
			filename: 'package.json',
			code: JSON.stringify({
				name: 'n8n-nodes-example',
				version: '0.1.0',
				description: 'My nodes',
				author: { name: 'Alice', email: 'a@b.com' },
				keywords: ['n8n-community-node-package'],
				n8n: { n8nNodesApiVersion: 1, nodes: ['dist/nodes/Example/Example.node.js'] },
			}),
			errors: [{ messageId: 'missingLicense' }],
		},
		{
			filename: 'package.json',
			code: JSON.stringify({
				name: 'n8n-nodes-example',
				version: '0.1.0',
				description: 'My nodes',
				license: 'Apache-2.0',
				author: { name: 'Alice', email: 'a@b.com' },
				keywords: ['n8n-community-node-package'],
				n8n: { n8nNodesApiVersion: 1, nodes: ['dist/nodes/Example/Example.node.js'] },
			}),
			errors: [{ messageId: 'nonMitLicense' }],
		},
		{
			filename: 'package.json',
			code: JSON.stringify({
				name: 'n8n-nodes-example',
				version: '0.1.0',
				description: 'My nodes',
				license: 'MIT',
				author: { name: 'Alice', email: 'a@b.com' },
				keywords: ['n8n-community-node-package'],
			}),
			errors: [{ messageId: 'missingN8nKey' }],
		},
		{
			filename: 'package.json',
			code: JSON.stringify({
				name: 'n8n-nodes-example',
				version: '0.1.0',
				description: 'My nodes',
				license: 'MIT',
				author: { name: 'Alice', email: 'a@b.com' },
				keywords: ['n8n-community-node-package'],
				n8n: { nodes: ['dist/nodes/Foo.node.js'] },
			}),
			errors: [{ messageId: 'missingApiVersion' }],
		},
		{
			filename: 'package.json',
			code: JSON.stringify({
				name: 'n8n-nodes-example',
				version: '0.1.0',
				description: 'My nodes',
				license: 'MIT',
				author: { name: 'Alice', email: 'a@b.com' },
				keywords: ['n8n-community-node-package'],
				n8n: { n8nNodesApiVersion: '1', nodes: ['dist/nodes/Foo.node.js'] },
			}),
			errors: [{ messageId: 'nonNumberApiVersion' }],
		},
		{
			filename: 'package.json',
			code: JSON.stringify({
				name: 'n8n-nodes-example',
				version: '0.1.0',
				description: 'My nodes',
				license: 'MIT',
				author: { name: 'Alice', email: 'a@b.com' },
				keywords: ['n8n-community-node-package'],
				n8n: { n8nNodesApiVersion: 1 },
			}),
			errors: [{ messageId: 'missingNodes' }],
		},
		{
			filename: 'package.json',
			code: JSON.stringify({
				name: 'n8n-nodes-example',
				version: '0.1.0',
				description: 'My nodes',
				license: 'MIT',
				author: { name: 'Alice', email: 'a@b.com' },
				keywords: ['n8n-community-node-package'],
				n8n: { n8nNodesApiVersion: 1, nodes: [] },
			}),
			errors: [{ messageId: 'emptyNodes' }],
		},
		{
			filename: 'package.json',
			code: JSON.stringify({
				name: 'n8n-nodes-example',
				version: '0.1.0',
				description: 'My nodes',
				license: 'MIT',
				author: { name: 'Alice', email: 'a@b.com' },
				repository: { type: 'git', url: 'https://github.com/<...>/n8n-nodes-<...>.git' },
				keywords: ['n8n-community-node-package'],
				n8n: { n8nNodesApiVersion: 1, nodes: ['dist/nodes/Foo.node.js'] },
			}),
			errors: [{ messageId: 'defaultRepositoryUrl' }],
		},
	],
});
