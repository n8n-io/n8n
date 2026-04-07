import { mock } from 'jest-mock-extended';

import type { CredentialProvider } from '@n8n/agents';

import type { ToolDescriptor } from '../../node-tool-registry';
import { createListToolsTool, createRunNodeTool } from '../node-execution-tools';

const ctx = {
	resumeData: undefined,
	suspend: jest.fn().mockResolvedValue(undefined as never),
	parentTelemetry: undefined,
};

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
});
