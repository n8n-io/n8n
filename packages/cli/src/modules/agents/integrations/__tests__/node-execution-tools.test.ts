import { mock } from 'jest-mock-extended';

import type { ToolDescriptor } from '../../node-tool-registry';
import { createListToolsTool, createRunNodeTool, type RunNodeArgs } from '../node-execution-tools';

const ctx = {
	resumeData: undefined,
	suspend: jest.fn().mockResolvedValue(undefined as never),
	parentTelemetry: undefined,
};

describe('createListToolsTool', () => {
	it('returns { tools } from the callback', async () => {
		const descriptor = mock<ToolDescriptor>({ nodeType: 'n8n-nodes-base.httpRequest' });
		const listTools = jest.fn().mockResolvedValue([descriptor]);
		const tool = createListToolsTool(listTools).build();

		const result = await tool.handler!({}, ctx);

		expect(listTools).toHaveBeenCalledTimes(1);
		expect(result).toEqual({ tools: [descriptor] });
	});
});

describe('createRunNodeTool', () => {
	it('passes all args to runNode and returns its result', async () => {
		const executionResult = { status: 'success', data: [{ json: { ip: '1.2.3.4' } }] };
		const runNode = jest.fn().mockResolvedValue(executionResult);
		const tool = createRunNodeTool(runNode).build();

		const args: RunNodeArgs = {
			nodeType: 'n8n-nodes-base.httpRequest',
			nodeTypeVersion: 4.2,
			nodeParameters: { url: 'https://httpbin.org/get' },
			inputData: {},
		};

		const result = await tool.handler!(args, ctx);

		expect(runNode).toHaveBeenCalledWith(args);
		expect(result).toEqual(executionResult);
	});

	it('passes credentials through to runNode', async () => {
		const runNode = jest.fn().mockResolvedValue({});
		const tool = createRunNodeTool(runNode).build();

		const args: RunNodeArgs = {
			nodeType: 'n8n-nodes-base.gmail',
			nodeTypeVersion: 2.1,
			credentials: { gmailOAuth2: { id: 'cred-1', name: 'My Gmail' } },
			inputData: { to: 'user@example.com' },
		};

		await tool.handler!(args, ctx);

		expect(runNode).toHaveBeenCalledWith(args);
	});
});
