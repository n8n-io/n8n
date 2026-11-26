import type { BaseRetriever } from '@langchain/core/retrievers';
import type { INode, ISupplyDataFunctions, IWorkflowDataProxyData } from 'n8n-workflow';
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
});
