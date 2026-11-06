import { mock } from 'vitest-mock-extended';
import type {
	INode,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';

import { buildLlmUsageNodeContext } from '../llm-usage-context';

describe('buildLlmUsageNodeContext', () => {
	const workflow = mock<Workflow>({ id: 'wf-1' });
	const node = mock<INode>({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' });

	it('builds the context of a node execution', () => {
		const additionalData = mock<IWorkflowExecuteAdditionalData>({
			executionId: 'exec-1',
			projectId: 'project-1',
			userId: 'user-1',
			rootExecutionMode: undefined,
		});

		expect(buildLlmUsageNodeContext(workflow, node, additionalData, { mode: 'manual' })).toEqual({
			callerType: 'node',
			workflowId: 'wf-1',
			executionId: 'exec-1',
			executionMode: 'manual',
			nodeName: 'Agent',
			nodeType: '@n8n/n8n-nodes-langchain.agent',
			projectId: 'project-1',
			userId: 'user-1',
		});
	});

	it('takes the user from the manual run data when additionalData has none', () => {
		const additionalData = mock<IWorkflowExecuteAdditionalData>({
			userId: undefined,
			rootExecutionMode: undefined,
		});
		const runExecutionData = mock<IRunExecutionData>({ manualData: { userId: 'user-2' } });

		expect(
			buildLlmUsageNodeContext(workflow, node, additionalData, { runExecutionData }).userId,
		).toBe('user-2');
	});

	it('reports the root mode for a sub-workflow', () => {
		const additionalData = mock<IWorkflowExecuteAdditionalData>({ rootExecutionMode: 'trigger' });

		expect(
			buildLlmUsageNodeContext(workflow, node, additionalData, { mode: 'integrated' })
				.executionMode,
		).toBe('trigger');
	});
});
