import type { WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';

import { WorkflowRequirementsExtractor } from '../workflow-requirements.extractor';

function makeWorkflow(nodes: INode[]): WorkflowEntity {
	return {
		id: 'wf-parent',
		nodes,
	} as WorkflowEntity;
}

function executeWorkflowNode(
	workflowId: INode['parameters'][string],
	overrides: Partial<INode> = {},
): INode {
	return {
		id: 'node-1',
		name: 'Execute Workflow',
		type: 'n8n-nodes-base.executeWorkflow',
		typeVersion: 1,
		position: [0, 0],
		parameters: {
			workflowId,
		},
		...overrides,
	};
}

describe('WorkflowRequirementsExtractor', () => {
	const extractor = new WorkflowRequirementsExtractor();

	it('extracts static Execute Workflow references', () => {
		const workflow = makeWorkflow([
			executeWorkflowNode({ __rl: true, mode: 'list', value: 'wf-child' }),
		]);

		expect(extractor.extract(workflow)).toEqual([
			{ workflowId: 'wf-parent', referencedWorkflowId: 'wf-child' },
		]);
	});

	it('extracts static Tool Workflow references', () => {
		const workflow = makeWorkflow([
			executeWorkflowNode(
				{ __rl: true, mode: 'list', value: 'wf-child' },
				{
					name: 'Call workflow',
					type: '@n8n/n8n-nodes-langchain.toolWorkflow',
					typeVersion: 2.2,
				},
			),
		]);

		expect(extractor.extract(workflow)).toEqual([
			{ workflowId: 'wf-parent', referencedWorkflowId: 'wf-child' },
		]);
	});

	it('dedupes repeated references in one workflow', () => {
		const workflow = makeWorkflow([
			executeWorkflowNode({ __rl: true, mode: 'list', value: 'wf-child' }, { id: 'node-1' }),
			executeWorkflowNode({ __rl: true, mode: 'list', value: 'wf-child' }, { id: 'node-2' }),
		]);

		expect(extractor.extract(workflow)).toEqual([
			{ workflowId: 'wf-parent', referencedWorkflowId: 'wf-child' },
		]);
	});

	it('ignores dynamic workflow selectors', () => {
		const workflow = makeWorkflow([executeWorkflowNode('={{ $json.workflowId }}')]);

		expect(extractor.extract(workflow)).toEqual([]);
	});

	it('ignores non Execute Workflow nodes', () => {
		const workflow = makeWorkflow([
			executeWorkflowNode(
				{ __rl: true, mode: 'list', value: 'wf-child' },
				{ type: 'n8n-nodes-base.set' },
			),
		]);

		expect(extractor.extract(workflow)).toEqual([]);
	});
});
