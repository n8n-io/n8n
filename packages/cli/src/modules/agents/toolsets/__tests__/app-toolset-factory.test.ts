import { mock } from 'jest-mock-extended';
import type { INodeType } from 'n8n-workflow';

import type { EphemeralNodeExecutor } from '@/node-execution';
import type { NodeTypes } from '@/node-types';

import { buildAppToolset } from '../app-toolset-factory';

// Use Gmail definition since it ships in the registry. Importing from the
// public toolsets surface ensures we cover the same shape consumers see.
import { findAppDefinition } from '@n8n/agents';

const GMAIL_APP = findAppDefinition('gmail')!;

const FAKE_GMAIL_DESCRIPTION = {
	displayName: 'Gmail',
	description: 'Send and receive email',
	properties: [
		{
			name: 'resource',
			type: 'options',
			default: 'message',
			options: [{ name: 'Message', value: 'message' }],
			displayName: 'Resource',
		},
		{
			name: 'operation',
			type: 'options',
			default: 'send',
			displayName: 'Operation',
			displayOptions: { show: { resource: ['message'] } },
			options: [{ name: 'Send', value: 'send', description: 'Send a message' }],
		},
		{
			name: 'to',
			type: 'string',
			default: '',
			displayName: 'To',
			required: true,
			displayOptions: { show: { resource: ['message'], operation: ['send'] } },
		},
	],
};

function makeFactoryDeps() {
	const nodeTypes = mock<NodeTypes>();
	nodeTypes.getByNameAndVersion.mockReturnValue({
		description: FAKE_GMAIL_DESCRIPTION,
	} as unknown as INodeType);
	const executor = mock<EphemeralNodeExecutor>();
	return { nodeTypes, executor };
}

function makeParams() {
	const { nodeTypes, executor } = makeFactoryDeps();
	return {
		appDef: GMAIL_APP,
		credentialId: 'cred-1',
		credentialName: 'Gmail',
		projectId: 'project-1',
		nodeTypes,
		executor,
	};
}

describe('buildAppToolset', () => {
	it('uses appDef.kind as the BuiltTool name', () => {
		const tool = buildAppToolset(makeParams());
		expect(tool.name).toBe('gmail');
	});

	it('uses the manifest as the BuiltTool description', () => {
		const tool = buildAppToolset(makeParams());
		expect(tool.description).toContain('Gmail');
		expect(tool.description).toContain('list_operations');
	});

	it('list_operations returns the registry-derived operations', async () => {
		const tool = buildAppToolset(makeParams());
		const result = (await tool.handler!({ action: 'list_operations' }, {} as never)) as {
			operations: Array<{ name: string }>;
		};
		expect(result.operations.map((o) => o.name)).toContain('message:send');
	});

	it('invoke_operation calls EphemeralNodeExecutor.executeInline with the right shape', async () => {
		const params = makeParams();
		(params.executor.executeInline as jest.Mock).mockResolvedValue({ status: 'success', data: [] });
		const tool = buildAppToolset(params);
		await tool.handler!(
			{ action: 'invoke_operation', name: 'message:send', args: { to: 'me@example.com' } },
			{} as never,
		);
		expect(params.executor.executeInline).toHaveBeenCalledWith(
			expect.objectContaining({
				nodeType: GMAIL_APP.nodeType,
				nodeTypeVersion: GMAIL_APP.nodeTypeVersion,
				nodeParameters: expect.objectContaining({
					resource: 'message',
					operation: 'send',
					to: 'me@example.com',
				}),
				credentialDetails: { [GMAIL_APP.credentialType]: { id: 'cred-1', name: 'Gmail' } },
				projectId: 'project-1',
			}),
		);
	});

	it('invoke_operation rejects unknown operations with an error result', async () => {
		const params = makeParams();
		const tool = buildAppToolset(params);
		const result = await tool.handler!(
			{ action: 'invoke_operation', name: 'message:bogus', args: {} },
			{} as never,
		);
		expect(result).toEqual(expect.objectContaining({ status: 'error' }));
		expect(params.executor.executeInline).not.toHaveBeenCalled();
	});

	it('describe_operation returns a JSON schema sketch for the named op', async () => {
		const tool = buildAppToolset(makeParams());
		const result = (await tool.handler!(
			{ action: 'describe_operation', name: 'message:send' },
			{} as never,
		)) as { name: string; schema: Record<string, unknown> };
		expect(result.name).toBe('message:send');
		expect(result.schema).toEqual(
			expect.objectContaining({
				type: 'object',
				required: expect.arrayContaining(['to']),
			}),
		);
	});
});
