import { mock } from 'jest-mock-extended';

import type { CredentialProvider } from '@n8n/agents';

import type { NodeParametersSchema } from '../../node-schema-utils';
import type { NodeToolRegistry, ToolDescriptor } from '../../node-tool-registry';
import {
	createGetNodeSchemaTool,
	createListToolsTool,
	createRunNodeTool,
} from '../node-execution-tools';

jest.mock('@n8n/workflow-sdk', () => ({
	validateNodeConfig: jest.fn().mockReturnValue({ valid: true, errors: [] }),
	setSchemaBaseDirs: jest.fn(),
}));

jest.mock('@/modules/instance-ai/node-definition-resolver', () => ({
	resolveBuiltinNodeDefinitionDirs: jest.fn().mockReturnValue(['/fake/node-defs']),
}));

import { validateNodeConfig } from '@n8n/workflow-sdk';

const ctx = {
	resumeData: undefined,
	suspend: jest.fn().mockResolvedValue(undefined as never),
	parentTelemetry: undefined,
};

describe('createGetNodeSchemaTool', () => {
	it('returns nodeType and schema when found', async () => {
		const schema: NodeParametersSchema = {
			url: { displayName: 'URL', type: 'string', required: true },
		};
		const registry = mock<Pick<NodeToolRegistry, 'getNodeSchema'>>({
			getNodeSchema: jest.fn().mockResolvedValue(schema),
		});
		const tool = createGetNodeSchemaTool(registry).build();

		const result = await tool.handler!({ nodeType: 'n8n-nodes-base.httpRequest' }, ctx);

		expect(registry.getNodeSchema).toHaveBeenCalledWith('n8n-nodes-base.httpRequest');
		expect(result).toEqual({ nodeType: 'n8n-nodes-base.httpRequest', schema });
	});

	it('returns an error object when the node type is not in the registry', async () => {
		const registry = mock<Pick<NodeToolRegistry, 'getNodeSchema'>>({
			getNodeSchema: jest.fn().mockResolvedValue(undefined),
		});
		const tool = createGetNodeSchemaTool(registry).build();

		const result = await tool.handler!({ nodeType: 'custom.unknown' }, ctx);

		expect(result).toMatchObject({ error: expect.stringContaining('"custom.unknown"') });
	});
});

describe('createListToolsTool', () => {
	it('returns { tools } from the registry', async () => {
		const descriptor = mock<ToolDescriptor>({ nodeType: 'n8n-nodes-base.httpRequest' });
		const registry = { listTools: jest.fn().mockResolvedValue([descriptor]) };
		const credentialProvider = mock<CredentialProvider>();
		const tool = createListToolsTool(registry, credentialProvider).build();

		const result = await tool.handler!({}, ctx);

		expect(registry.listTools).toHaveBeenCalledWith(credentialProvider);
		expect(result).toEqual({ tools: [descriptor] });
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
		// validateNodeConfig returns valid:true when no schema file exists — graceful fallback
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
