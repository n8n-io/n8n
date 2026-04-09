import { mock } from 'jest-mock-extended';

import type { CredentialProvider } from '@n8n/agents';

import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';

import { validateNodeConfig } from '@n8n/workflow-sdk';
import {
	createGetNodeSchemaTool,
	createSearchNodesTool,
	createRunNodeTool,
	listNodes,
	searchNodes,
} from '../node-execution-tools';

jest.mock('@n8n/workflow-sdk', () => ({
	validateNodeConfig: jest.fn().mockReturnValue({ valid: true, errors: [] }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCredentialProvider(): CredentialProvider {
	const provider = mock<CredentialProvider>();
	jest.mocked(provider.list).mockResolvedValue([]);
	return provider;
}

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

const ctx = {
	resumeData: undefined,
	suspend: jest.fn().mockResolvedValue(undefined as never),
	parentTelemetry: undefined,
};

// ---------------------------------------------------------------------------
// listNodes()
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
		const [node] = await listNodes([
			makeNode({
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
				description: 'Makes HTTP requests to any URL',
				version: 4,
			}),
		]);

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

// ---------------------------------------------------------------------------
// searchNodes()
// ---------------------------------------------------------------------------

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
		const results = await searchNodes(
			[
				makeNode({
					name: 'n8n-nodes-base.httpRequest',
					displayName: 'HTTP Request',
					description: 'Makes HTTP requests to any URL',
				}),
			],
			'http req',
		);

		expect(results).toHaveLength(1);
		expect(results[0].nodeType).toBe('n8n-nodes-base.httpRequest');
	});

	it('matches a node by its internal type name identifier', async () => {
		const results = await searchNodes(
			[
				makeNode({
					name: 'n8n-nodes-base.httpRequest',
					displayName: 'HTTP Request',
					description: 'Makes HTTP requests to any URL',
				}),
			],
			'httpRequest',
		);

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

// ---------------------------------------------------------------------------
// createGetNodeSchemaTool
// ---------------------------------------------------------------------------

describe('createGetNodeSchemaTool', () => {
	it('returns nodeType and schema when found', async () => {
		const schema: INodeProperties[] = [
			{ displayName: 'URL', name: 'url', type: 'string', default: '', required: true },
		];
		const node = {
			name: 'n8n-nodes-base.httpRequest',
			usableAsTool: true,
			properties: schema,
		} as INodeTypeDescription;
		const tool = createGetNodeSchemaTool([node]).build();

		const result = await tool.handler!({ nodeType: 'n8n-nodes-base.httpRequest' }, ctx);

		expect(result).toEqual({ nodeType: 'n8n-nodes-base.httpRequest', schema });
	});

	it('returns an error object when the node type is not in the registry', async () => {
		const tool = createGetNodeSchemaTool([]).build();

		const result = await tool.handler!({ nodeType: 'custom.unknown' }, ctx);

		expect(result).toMatchObject({ error: expect.stringContaining('"custom.unknown"') });
	});
});

// ---------------------------------------------------------------------------
// createSearchNodesTool
// ---------------------------------------------------------------------------

describe('createSearchNodesTool', () => {
	it('returns matching nodes wrapped in { tools }', async () => {
		const tool = createSearchNodesTool([makeNode()], makeCredentialProvider()).build();

		const result = await tool.handler!({ query: 'http' }, ctx);

		expect(result).toMatchObject({
			tools: [expect.objectContaining({ nodeType: 'n8n-nodes-base.httpRequest' })],
		});
	});

	it('returns all nodes for an empty query', async () => {
		const nodes = [
			makeNode({ name: 'n8n-nodes-base.a', displayName: 'A' }),
			makeNode({ name: 'n8n-nodes-base.b', displayName: 'B' }),
			makeNode({ name: 'n8n-nodes-base.c', displayName: 'C' }),
		];
		const tool = createSearchNodesTool(nodes, makeCredentialProvider()).build();

		const result = (await tool.handler!({ query: '' }, ctx)) as { tools: unknown[] };

		expect(result.tools).toHaveLength(3);
	});

	it('respects topK', async () => {
		const nodes = [
			makeNode({ name: 'n8n-nodes-base.a', displayName: 'Send A', description: 'send a' }),
			makeNode({ name: 'n8n-nodes-base.b', displayName: 'Send B', description: 'send b' }),
		];
		const tool = createSearchNodesTool(nodes, makeCredentialProvider()).build();

		const result = (await tool.handler!({ query: 'send', topK: 1 }, ctx)) as { tools: unknown[] };

		expect(result.tools).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// createRunNodeTool
// ---------------------------------------------------------------------------

describe('createRunNodeTool', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.mocked(validateNodeConfig).mockReturnValue({ valid: true, errors: [] });
	});

	it('maps RunNodeArgs to executeInline and returns its result', async () => {
		const executionResult = { status: 'success', data: [{ json: { ip: '1.2.3.4' } }] };
		const executor = { executeInline: jest.fn().mockResolvedValue(executionResult) };
		const tool = createRunNodeTool(executor, 'project-1').build();

		const result = await tool.handler!(
			{
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeTypeVersion: 4.2,
				nodeParameters: { url: 'https://httpbin.org/get' },
				inputData: { query: 'hello' },
			},
			ctx,
		);

		expect(executor.executeInline).toHaveBeenCalledWith({
			nodeType: 'n8n-nodes-base.httpRequest',
			nodeTypeVersion: 4.2,
			nodeParameters: { url: 'https://httpbin.org/get' },
			credentialDetails: undefined,
			inputData: [{ json: { query: 'hello' } }],
			projectId: 'project-1',
		});
		expect(result).toEqual(executionResult);
	});

	it('passes credentials through to executeInline', async () => {
		const executor = { executeInline: jest.fn().mockResolvedValue({}) };
		const tool = createRunNodeTool(executor, 'project-1').build();

		await tool.handler!(
			{
				nodeType: 'n8n-nodes-base.gmail',
				nodeTypeVersion: 2.1,
				credentials: { gmailOAuth2: { id: 'cred-1', name: 'My Gmail' } },
				inputData: { to: 'user@example.com' },
			},
			ctx,
		);

		expect(executor.executeInline).toHaveBeenCalledWith(
			expect.objectContaining({
				credentialDetails: { gmailOAuth2: { id: 'cred-1', name: 'My Gmail' } },
				projectId: 'project-1',
			}),
		);
	});

	it('skips validation when nodeParameters is absent', async () => {
		const executor = { executeInline: jest.fn().mockResolvedValue({ status: 'success' }) };
		const tool = createRunNodeTool(executor, 'project-1').build();

		await tool.handler!({ nodeType: 'n8n-nodes-base.httpRequest', nodeTypeVersion: 4.2 }, ctx);

		expect(validateNodeConfig).not.toHaveBeenCalled();
		expect(executor.executeInline).toHaveBeenCalled();
	});

	it('validates nodeParameters via validateNodeConfig before executing', async () => {
		const executor = { executeInline: jest.fn().mockResolvedValue({ status: 'success' }) };
		const tool = createRunNodeTool(executor, 'project-1').build();

		await tool.handler!(
			{
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeTypeVersion: 4.2,
				nodeParameters: { url: 'https://example.com' },
			},
			ctx,
		);

		expect(validateNodeConfig).toHaveBeenCalledWith('n8n-nodes-base.httpRequest', 4.2, {
			parameters: { url: 'https://example.com' },
		});
		expect(executor.executeInline).toHaveBeenCalled();
	});

	it('returns an error result without calling executeInline when validation fails', async () => {
		jest.mocked(validateNodeConfig).mockReturnValue({
			valid: false,
			errors: [{ path: 'method', message: 'Field "method" has invalid value "DELETE".' }],
		});
		const executor = { executeInline: jest.fn() };
		const tool = createRunNodeTool(executor, 'project-1').build();

		const result = await tool.handler!(
			{
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeTypeVersion: 4.2,
				nodeParameters: { method: 'DELETE' },
			},
			ctx,
		);

		expect(executor.executeInline).not.toHaveBeenCalled();
		expect(result).toMatchObject({ status: 'error', message: expect.stringContaining('"method"') });
	});

	it('executes when validateNodeConfig returns valid (no schema available)', async () => {
		jest.mocked(validateNodeConfig).mockReturnValue({ valid: true, errors: [] });
		const executor = { executeInline: jest.fn().mockResolvedValue({ status: 'success' }) };
		const tool = createRunNodeTool(executor, 'project-1').build();

		await tool.handler!(
			{ nodeType: 'custom.unknownNode', nodeTypeVersion: 1, nodeParameters: { x: 1 } },
			ctx,
		);

		expect(executor.executeInline).toHaveBeenCalled();
	});
});
