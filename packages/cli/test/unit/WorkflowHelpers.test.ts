import { type Workflow } from 'n8n-workflow';
import { getExecutionStartNode } from '@/WorkflowHelpers';
import type { IWorkflowExecutionDataProcess } from '@/Interfaces';

describe('WorkflowHelpers', () => {
	describe('getExecutionStartNode', () => {
		it('Should return undefined', () => {
			const data = {
				pinData: {},
				startNodes: [],
			} as unknown as IWorkflowExecutionDataProcess;
			const workflow = {
				getNode(nodeName: string) {
					return {
						name: nodeName,
					};
				},
			} as unknown as Workflow;
			const executionStartNode = getExecutionStartNode(data, workflow);
			expect(executionStartNode).toBeUndefined();
		});
		it('Should return startNode', () => {
			const data = {
				pinData: {
					node1: {},
					node2: {},
				},
				startNodes: [{ name: 'node2' }],
			} as unknown as IWorkflowExecutionDataProcess;
			const workflow = {
				getNode(nodeName: string) {
					if (nodeName === 'node2') {
						return {
							name: 'node2',
						};
					}
					return undefined;
				},
			} as unknown as Workflow;
			const executionStartNode = getExecutionStartNode(data, workflow);
			expect(executionStartNode).toEqual({
				name: 'node2',
			});
		});
	});
});
