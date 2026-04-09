import { mock } from 'jest-mock-extended';
import type { CredentialProvider } from '@n8n/agents';
import type { INodeTypeDescription } from 'n8n-workflow';

import { listTools, searchTools } from '../node-tool-registry';

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

describe('listTools()', () => {
	it('only returns nodes flagged as usableAsTool', async () => {
		const nodes = [
			makeNode({ name: 'n8n-nodes-base.httpRequest', usableAsTool: true }),
			makeNode({ name: 'n8n-nodes-base.set', usableAsTool: undefined }),
			makeNode({ name: 'n8n-nodes-base.gmail', usableAsTool: true }),
		];

		const tools = await listTools(nodes);

		expect(tools.map((t) => t.nodeType)).toEqual([
			'n8n-nodes-base.httpRequest',
			'n8n-nodes-base.gmail',
		]);
	});

	it('projects all ToolDescriptor fields correctly', async () => {
		const nodes = [
			makeNode({
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
				description: 'Makes HTTP requests to any URL',
				version: 4,
			}),
		];

		const [tool] = await listTools(nodes);

		expect(tool).toMatchObject({
			nodeType: 'n8n-nodes-base.httpRequest',
			displayName: 'HTTP Request',
			description: 'Makes HTTP requests to any URL',
			nodeTypeVersion: 4,
		});
	});

	describe('nodeTypeVersion', () => {
		it('uses the version directly when it is a number', async () => {
			const [tool] = await listTools([makeNode({ version: 3 })]);
			expect(tool.nodeTypeVersion).toBe(3);
		});

		it('uses the last element when version is an array', async () => {
			const [tool] = await listTools([makeNode({ version: [1, 2, 3] })]);
			expect(tool.nodeTypeVersion).toBe(3);
		});
	});

	it('deduplicates nodes with the same name, keeping the first occurrence', async () => {
		const nodes = [
			makeNode({ name: 'n8n-nodes-base.httpRequest', displayName: 'HTTP Request v1' }),
			makeNode({ name: 'n8n-nodes-base.httpRequest', displayName: 'HTTP Request v2' }),
			makeNode({ name: 'n8n-nodes-base.gmail', displayName: 'Gmail' }),
		];

		const tools = await listTools(nodes);

		expect(tools).toHaveLength(2);
		expect(tools.find((t) => t.nodeType === 'n8n-nodes-base.httpRequest')?.displayName).toBe(
			'HTTP Request v1',
		);
	});

	describe('without a credential provider', () => {
		it('sets hasCredentials to true for all nodes', async () => {
			const nodes = [
				makeNode({ credentials: [] }),
				makeNode({ credentials: [mock({ name: 'gmailOAuth2' })] }),
			];

			const tools = await listTools(nodes);

			expect(tools.every((t) => t.hasCredentials)).toBe(true);
		});

		it('returns an empty credentials array', async () => {
			const [tool] = await listTools([makeNode()]);
			expect(tool.credentials).toEqual([]);
		});
	});

	describe('with a credential provider', () => {
		it('sets hasCredentials to true when the node requires no credentials', async () => {
			const provider = mock<CredentialProvider>();
			provider.list.mockResolvedValue([]);

			const [tool] = await listTools([makeNode({ credentials: [] })], provider);

			expect(tool.hasCredentials).toBe(true);
		});

		it('sets hasCredentials to true when a matching credential is available', async () => {
			const provider = mock<CredentialProvider>();
			provider.list.mockResolvedValue([{ id: 'cred-1', name: 'My Gmail', type: 'gmailOAuth2' }]);

			const [tool] = await listTools(
				[makeNode({ credentials: [mock({ name: 'gmailOAuth2' })] })],
				provider,
			);

			expect(tool.hasCredentials).toBe(true);
		});

		it('excludes nodes when no matching credential is available', async () => {
			const provider = mock<CredentialProvider>();
			provider.list.mockResolvedValue([{ id: 'cred-1', name: 'My Slack', type: 'slackApi' }]);

			const tools = await listTools(
				[makeNode({ credentials: [mock({ name: 'gmailOAuth2' })] })],
				provider,
			);

			expect(tools).toHaveLength(0);
		});

		it('populates credentials with matching CredentialListItems', async () => {
			const provider = mock<CredentialProvider>();
			provider.list.mockResolvedValue([
				{ id: 'cred-1', name: 'My Gmail', type: 'gmailOAuth2' },
				{ id: 'cred-2', name: 'Other Cred', type: 'slackApi' },
			]);

			const [tool] = await listTools(
				[makeNode({ credentials: [mock({ name: 'gmailOAuth2' })] })],
				provider,
			);

			expect(tool.credentials).toEqual([{ id: 'cred-1', name: 'My Gmail', type: 'gmailOAuth2' }]);
		});
	});
});

describe('searchTools()', () => {
	it('returns all tools (up to topK) when query is empty', async () => {
		const nodes = [
			makeNode({ name: 'n8n-nodes-base.httpRequest', displayName: 'HTTP Request' }),
			makeNode({ name: 'n8n-nodes-base.gmail', displayName: 'Gmail' }),
			makeNode({ name: 'n8n-nodes-base.slack', displayName: 'Slack' }),
		];

		const results = await searchTools(nodes, '', undefined, { topK: 2 });

		expect(results).toHaveLength(2);
	});

	it('ranks tools with a name match above tools with only a description match', async () => {
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

		const results = await searchTools(nodes, 'email send');

		expect(results[0].nodeType).toBe('n8n-nodes-base.gmail');
	});

	it('filters out tools below minScore', async () => {
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

		const results = await searchTools(nodes, 'email', undefined, { minScore: 0.1 });

		expect(results.map((r) => r.nodeType)).toEqual(['n8n-nodes-base.gmail']);
	});

	it('respects topK limit', async () => {
		const nodes = [
			makeNode({ name: 'n8n-nodes-base.a', displayName: 'Send A', description: 'send a' }),
			makeNode({ name: 'n8n-nodes-base.b', displayName: 'Send B', description: 'send b' }),
			makeNode({ name: 'n8n-nodes-base.c', displayName: 'Send C', description: 'send c' }),
		];

		const results = await searchTools(nodes, 'send', undefined, { topK: 2 });

		expect(results).toHaveLength(2);
	});

	it('matches on a prefix of a document token', async () => {
		const nodes = [
			makeNode({
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
				description: 'Makes HTTP requests to any URL',
			}),
		];

		const results = await searchTools(nodes, 'htt req', undefined, { minScore: 0.1 });

		expect(results).toHaveLength(1);
		expect(results[0].nodeType).toBe('n8n-nodes-base.httpRequest');
	});

	it('is not biased by repeated words in the description', async () => {
		const nodes = [
			makeNode({
				name: 'n8n-nodes-base.gmail',
				displayName: 'Gmail',
				description: 'email email email email email',
			}),
			makeNode({
				name: 'n8n-nodes-base.emailTool',
				displayName: 'Email Tool',
				description: 'send messages',
			}),
		];

		// emailTool has "email" in displayName (NAME_WEIGHT) → scores higher than
		// gmail which only matches in description despite the word appearing 5 times
		const results = await searchTools(nodes, 'email', undefined, { minScore: 0 });

		expect(results[0].nodeType).toBe('n8n-nodes-base.emailTool');
	});
});
