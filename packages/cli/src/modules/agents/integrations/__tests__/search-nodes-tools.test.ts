import { mock } from 'jest-mock-extended';
import type { CredentialProvider } from '@n8n/agents';
import type { INodeTypeDescription } from 'n8n-workflow';

import { listNodes, searchNodes } from '../search-nodes-tools';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(overrides: Partial<INodeTypeDescription> = {}): INodeTypeDescription {
	return mock<INodeTypeDescription>({
		name: 'n8n-nodes-base.httpRequest',
		displayName: 'HTTP Request',
		description: 'Makes HTTP requests to any URL',
		version: 1,
		credentials: [],
		usableAsTool: true,
		...overrides,
	});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('listNodes()', () => {
	it('only returns nodes flagged as usableAsTool', async () => {
		const nodes = [
			makeNode({ name: 'n8n-nodes-base.httpRequest', usableAsTool: true }),
			makeNode({ name: 'n8n-nodes-base.set', usableAsTool: undefined }),
			makeNode({ name: 'n8n-nodes-base.gmail', usableAsTool: true }),
		];

		const result = await listNodes(nodes);

		expect(result.map((n) => n.nodeType)).toEqual([
			'n8n-nodes-base.httpRequest',
			'n8n-nodes-base.gmail',
		]);
	});

	it('projects all NodeDescriptor fields correctly', async () => {
		const nodes = [
			makeNode({
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
				description: 'Makes HTTP requests to any URL',
				version: 4,
			}),
		];

		const [node] = await listNodes(nodes);

		expect(node).toMatchObject({
			nodeType: 'n8n-nodes-base.httpRequest',
			displayName: 'HTTP Request',
			description: 'Makes HTTP requests to any URL',
			nodeTypeVersion: 4,
		});
	});

	describe('nodeTypeVersion', () => {
		it('uses the version directly when it is a number', async () => {
			const [node] = await listNodes([makeNode({ version: 3 })]);
			expect(node.nodeTypeVersion).toBe(3);
		});

		it('uses the highest element when version is an array', async () => {
			const [node] = await listNodes([makeNode({ version: [1, 2, 3] })]);
			expect(node.nodeTypeVersion).toBe(3);
		});
	});

	it('deduplicates nodes with the same name, keeping the highest version', async () => {
		const nodes = [
			makeNode({ name: 'n8n-nodes-base.httpRequest', displayName: 'HTTP Request v1', version: 1 }),
			makeNode({ name: 'n8n-nodes-base.httpRequest', displayName: 'HTTP Request v2', version: 2 }),
			makeNode({ name: 'n8n-nodes-base.gmail', displayName: 'Gmail' }),
		];

		const result = await listNodes(nodes);

		expect(result).toHaveLength(2);
		expect(result.find((n) => n.nodeType === 'n8n-nodes-base.httpRequest')?.displayName).toBe(
			'HTTP Request v2',
		);
	});

	describe('credentials', () => {
		it('sets hasCredentials to false when no credential provider is given', async () => {
			const [node] = await listNodes([makeNode({ credentials: [mock({ name: 'gmailOAuth2' })] })]);
			expect(node.hasCredentials).toBe(false);
		});

		it('sets hasCredentials to false when user has no matching credential', async () => {
			const provider = mock<CredentialProvider>();
			provider.list.mockResolvedValue([{ id: 'cred-1', name: 'My Slack', type: 'slackApi' }]);

			const [node] = await listNodes(
				[makeNode({ credentials: [mock({ name: 'gmailOAuth2' })] })],
				provider,
			);

			expect(node.hasCredentials).toBe(false);
		});

		it('sets hasCredentials to true when user has a matching credential', async () => {
			const provider = mock<CredentialProvider>();
			provider.list.mockResolvedValue([{ id: 'cred-1', name: 'My Gmail', type: 'gmailOAuth2' }]);

			const [node] = await listNodes(
				[makeNode({ credentials: [mock({ name: 'gmailOAuth2' })] })],
				provider,
			);

			expect(node.hasCredentials).toBe(true);
		});

		it('populates credentials with matching CredentialListItems', async () => {
			const provider = mock<CredentialProvider>();
			provider.list.mockResolvedValue([
				{ id: 'cred-1', name: 'My Gmail', type: 'gmailOAuth2' },
				{ id: 'cred-2', name: 'Other Cred', type: 'slackApi' },
			]);

			const [node] = await listNodes(
				[makeNode({ credentials: [mock({ name: 'gmailOAuth2' })] })],
				provider,
			);

			expect(node.credentials).toEqual([{ id: 'cred-1', name: 'My Gmail', type: 'gmailOAuth2' }]);
		});
	});
});

describe('searchNodes()', () => {
	it('returns all nodes (up to topK) when query is empty', async () => {
		const nodes = [
			makeNode({ name: 'n8n-nodes-base.httpRequest', displayName: 'HTTP Request' }),
			makeNode({ name: 'n8n-nodes-base.gmail', displayName: 'Gmail' }),
			makeNode({ name: 'n8n-nodes-base.slack', displayName: 'Slack' }),
		];

		const results = await searchNodes(nodes, '', undefined, { topK: 2 });

		expect(results).toHaveLength(2);
	});

	it('ranks nodes with a name match above nodes with only a description match', async () => {
		const nodes = [
			makeNode({
				name: 'n8n-nodes-base.gmail',
				displayName: 'Gmail',
				description: 'Send and receive emails',
			}),
			makeNode({
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
				description: 'Makes HTTP requests',
			}),
		];

		const results = await searchNodes(nodes, 'gmail');

		expect(results[0].nodeType).toBe('n8n-nodes-base.gmail');
	});

	it('filters out nodes that do not match the query at all', async () => {
		const nodes = [
			makeNode({
				name: 'n8n-nodes-base.gmail',
				displayName: 'Gmail',
				description: 'Send email messages',
			}),
			makeNode({
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
				description: 'Makes HTTP requests to any URL',
			}),
		];

		const results = await searchNodes(nodes, 'email');

		expect(results.map((r) => r.nodeType)).toEqual(['n8n-nodes-base.gmail']);
	});

	it('respects topK limit', async () => {
		const nodes = [
			makeNode({ name: 'n8n-nodes-base.a', displayName: 'Send A', description: 'send a' }),
			makeNode({ name: 'n8n-nodes-base.b', displayName: 'Send B', description: 'send b' }),
			makeNode({ name: 'n8n-nodes-base.c', displayName: 'Send C', description: 'send c' }),
		];

		const results = await searchNodes(nodes, 'send', undefined, { topK: 2 });

		expect(results).toHaveLength(2);
	});

	it('matches HTTP Request by partial query "http req"', async () => {
		const nodes = [
			makeNode({
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
				description: 'Makes HTTP requests to any URL',
			}),
		];

		const results = await searchNodes(nodes, 'http req');

		expect(results).toHaveLength(1);
		expect(results[0].nodeType).toBe('n8n-nodes-base.httpRequest');
	});

	it('matches a node by its internal type name identifier', async () => {
		const nodes = [
			makeNode({
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
				description: 'Makes HTTP requests to any URL',
			}),
		];

		const results = await searchNodes(nodes, 'httpRequest');

		expect(results).toHaveLength(1);
		expect(results[0].nodeType).toBe('n8n-nodes-base.httpRequest');
	});

	it('matches a node by a codex alias', async () => {
		const nodes = [
			mock<INodeTypeDescription>({
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
				description: 'Makes HTTP requests to any URL',
				version: 1,
				credentials: [],
				usableAsTool: true,
				codex: { alias: ['REST', 'API', 'Webhook'] },
			}),
		];

		const results = await searchNodes(nodes, 'REST');

		expect(results).toHaveLength(1);
		expect(results[0].nodeType).toBe('n8n-nodes-base.httpRequest');
	});
});
