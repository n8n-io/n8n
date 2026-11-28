import type { BaseRetriever } from '@langchain/core/retrievers';
import { SupplyDataContext } from 'n8n-core';
import type {
	INode,
	INodeTypes,
	ISupplyDataFunctions,
	IWorkflowDataProxyData,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { createRunExecutionData, NodeConnectionTypes, Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { RetrieverWorkflow } from '../RetrieverWorkflow.node';

vi.mock('n8n-nodes-base/dist/nodes/Set/v2/manual.mode', () => ({
	execute: vi.fn().mockResolvedValue({ json: { query: 'hello' } }),
}));

describe('RetrieverWorkflow', () => {
	it('should run the workflow object from the Workflow JSON parameter', async () => {
		const workflowJson = { nodes: [], connections: {} };
		const parameters: Record<string, unknown> = { source: 'parameter', workflowJson };
		const ctx = mock<ISupplyDataFunctions>({
			getNode: vi.fn(() => mock<INode>({ typeVersion: 1.1, name: 'Workflow Retriever' })),
			getNodeParameter: vi
				.fn()
				.mockImplementation(
					(name: string, _itemIndex: number, fallback?: unknown) => parameters[name] ?? fallback,
				),
			getWorkflowDataProxy: vi.fn(
				() =>
					({
						$execution: { id: 'exec-id' },
						$workflow: { id: 'workflow-id' },
					}) as unknown as IWorkflowDataProxyData,
			),
			executeWorkflow: vi.fn().mockResolvedValue({
				data: [[{ json: { text: 'doc' } }]],
				executionId: 'sub-exec',
			}),
		});

		const { response } = await new RetrieverWorkflow().supplyData.call(ctx, 0);
		const documents = await (response as BaseRetriever).invoke('hello');

		expect(ctx.executeWorkflow).toHaveBeenCalledWith(
			{ code: workflowJson },
			expect.anything(),
			undefined,
			expect.anything(),
		);
		expect(documents[0].metadata).toMatchObject({
			workflowSource: 'parameter',
			workflowId: 'workflow-id',
		});
	});

	it.each([
		{ case: 'a JSON string', workflowJson: '{"nodes": [], "connections": {}}' },
		{ case: 'an expression', workflowJson: '={{ { "nodes": [], "connections": {} } }}' },
	])('should run the workflow from $case through core', async ({ workflowJson }) => {
		const node = new RetrieverWorkflow();
		const coreNode: INode = {
			id: 'retriever-workflow',
			name: 'Workflow Retriever',
			type: '@n8n/n8n-nodes-langchain.retrieverWorkflow',
			typeVersion: 1.1,
			position: [0, 0],
			parameters: { source: 'parameter', workflowJson },
		};
		const nodeTypes = mock<INodeTypes>();
		nodeTypes.getByNameAndVersion.mockReturnValue(node);
		const workflow = new Workflow({
			id: 'workflow-id',
			nodes: [coreNode],
			connections: {},
			active: false,
			nodeTypes,
		});
		const ctx = new SupplyDataContext(
			workflow,
			coreNode,
			mock<IWorkflowExecuteAdditionalData>({
				webhookWaitingBaseUrl: 'https://example.com/webhook-waiting',
				formWaitingBaseUrl: 'https://example.com/form-waiting',
			}),
			'manual',
			createRunExecutionData(),
			0,
			[],
			{ main: [[{ json: {} }]] },
			NodeConnectionTypes.AiRetriever,
			{ node: coreNode, data: {}, source: null },
			[],
		);
		const executeWorkflow = vi.spyOn(ctx, 'executeWorkflow').mockResolvedValue({
			data: [[{ json: { text: 'doc' } }]],
			executionId: 'sub-exec',
		});

		const { response } = await node.supplyData.call(ctx, 0);
		await (response as BaseRetriever).invoke('hello');

		expect(executeWorkflow).toHaveBeenCalledWith(
			{ code: { nodes: [], connections: {} } },
			expect.anything(),
			undefined,
			expect.anything(),
		);
	});
});
