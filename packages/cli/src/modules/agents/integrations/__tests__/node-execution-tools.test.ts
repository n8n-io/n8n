import { mock } from 'jest-mock-extended';

import type { CredentialProvider } from '@n8n/agents';

import type { INodeProperties } from 'n8n-workflow';

import type { ToolDescriptor } from '../../node-tool-registry';
import {
	createGetNodeSchemaTool,
	createSearchToolsTool,
	createRunNodeTool,
} from '../node-execution-tools';
import { validateNodeConfig } from '@n8n/workflow-sdk';
import { getNodeSchema, searchTools } from '../../node-tool-registry';

jest.mock('@n8n/workflow-sdk', () => ({
	validateNodeConfig: jest.fn().mockReturnValue({ valid: true, errors: [] }),
}));

jest.mock('../../node-tool-registry', () => ({
	getNodeSchema: jest.fn(),
	searchTools: jest.fn(),
}));

const ctx = {
	resumeData: undefined,
	suspend: jest.fn().mockResolvedValue(undefined as never),
	parentTelemetry: undefined,
};

describe('createGetNodeSchemaTool', () => {
	beforeEach(() => jest.clearAllMocks());

	it('returns nodeType and schema when found', async () => {
		const schema: INodeProperties[] = [
			{ displayName: 'URL', name: 'url', type: 'string', default: '', required: true },
		];
		jest.mocked(getNodeSchema).mockReturnValue(schema);
		const tool = createGetNodeSchemaTool([]).build();

		const result = await tool.handler!({ nodeType: 'n8n-nodes-base.httpRequest' }, ctx);

		expect(getNodeSchema).toHaveBeenCalledWith([], 'n8n-nodes-base.httpRequest');
		expect(result).toEqual({ nodeType: 'n8n-nodes-base.httpRequest', schema });
	});

	it('returns an error object when the node type is not in the registry', async () => {
		jest.mocked(getNodeSchema).mockReturnValue(undefined);
		const tool = createGetNodeSchemaTool([]).build();

		const result = await tool.handler!({ nodeType: 'custom.unknown' }, ctx);

		expect(result).toMatchObject({ error: expect.stringContaining('"custom.unknown"') });
	});
});

describe('createSearchToolsTool', () => {
	beforeEach(() => jest.clearAllMocks());

	it('returns { tools } from the registry', async () => {
		const descriptor = mock<ToolDescriptor>({ nodeType: 'n8n-nodes-base.httpRequest' });
		jest.mocked(searchTools).mockResolvedValue([descriptor]);
		const credentialProvider = mock<CredentialProvider>();
		const tool = createSearchToolsTool([], credentialProvider).build();

		const result = await tool.handler!({ query: 'http request' }, ctx);

		expect(searchTools).toHaveBeenCalledWith([], 'http request', credentialProvider, {
			topK: undefined,
			minScore: undefined,
		});
		expect(result).toEqual({ tools: [descriptor] });
	});

	it('passes topK and minScore through to searchTools', async () => {
		jest.mocked(searchTools).mockResolvedValue([]);
		const credentialProvider = mock<CredentialProvider>();
		const tool = createSearchToolsTool([], credentialProvider).build();

		await tool.handler!({ query: 'email', topK: 5, minScore: 0.3 }, ctx);

		expect(searchTools).toHaveBeenCalledWith([], 'email', credentialProvider, {
			topK: 5,
			minScore: 0.3,
		});
	});
});

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
