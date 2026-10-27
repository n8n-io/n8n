import type { WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';

import type { PackageImportBindings } from '../../../../n8n-packages.types';
import {
	getStaticSubworkflowId,
	setStaticSubworkflowId,
	subWorkflowNodeReference,
} from '../sub-workflow-node.reference';

function node(
	type: string,
	typeVersion: number,
	parameters: INode['parameters'],
	overrides: Partial<INode> = {},
): INode {
	return {
		id: 'node-1',
		name: 'node',
		type,
		typeVersion,
		position: [0, 0],
		parameters,
		...overrides,
	};
}

const EXECUTE_WORKFLOW = 'n8n-nodes-base.executeWorkflow';
const TOOL_WORKFLOW = '@n8n/n8n-nodes-langchain.toolWorkflow';
const RETRIEVER_WORKFLOW = '@n8n/n8n-nodes-langchain.retrieverWorkflow';

const resourceLocator = (value: string, mode = 'list') => ({ __rl: true, mode, value });

const workflow = (nodes: INode[], id = 'parent'): WorkflowEntity =>
	({ id, nodes }) as WorkflowEntity;
const bindings = (workflows: Map<string, string>): PackageImportBindings => ({
	workflows,
	credentials: new Map(),
});

describe('getStaticSubworkflowId', () => {
	describe('Execute Sub-workflow', () => {
		it('resolves the legacy v1 plain-string workflowId', () => {
			expect(getStaticSubworkflowId(node(EXECUTE_WORKFLOW, 1, { workflowId: 'wf-child' }))).toBe(
				'wf-child',
			);
		});

		it('resolves the v1.1+ resource-locator workflowId', () => {
			expect(
				getStaticSubworkflowId(
					node(EXECUTE_WORKFLOW, 1.1, {
						source: 'database',
						workflowId: resourceLocator('wf-child'),
					}),
				),
			).toBe('wf-child');
		});

		it('resolves the resource-locator id in "id" mode', () => {
			expect(
				getStaticSubworkflowId(
					node(EXECUTE_WORKFLOW, 1.2, { workflowId: resourceLocator('wf-child', 'id') }),
				),
			).toBe('wf-child');
		});
	});

	describe('Call n8n Workflow Tool', () => {
		it('resolves the legacy v1 (<=1.1) plain-string workflowId', () => {
			expect(getStaticSubworkflowId(node(TOOL_WORKFLOW, 1.1, { workflowId: 'wf-child' }))).toBe(
				'wf-child',
			);
		});

		it('resolves the v1.2+ / v2 resource-locator workflowId', () => {
			expect(
				getStaticSubworkflowId(
					node(TOOL_WORKFLOW, 2.2, { workflowId: resourceLocator('wf-child') }),
				),
			).toBe('wf-child');
		});
	});

	describe('Workflow Retriever', () => {
		it('resolves the legacy v1 plain-string workflowId', () => {
			expect(
				getStaticSubworkflowId(
					node(RETRIEVER_WORKFLOW, 1, { source: 'database', workflowId: 'wf-child' }),
				),
			).toBe('wf-child');
		});

		it('resolves the v1.1+ resource-locator workflowId', () => {
			expect(
				getStaticSubworkflowId(
					node(RETRIEVER_WORKFLOW, 1.1, {
						source: 'database',
						workflowId: resourceLocator('wf-child'),
					}),
				),
			).toBe('wf-child');
		});

		it('ignores a non-database source (parameter)', () => {
			expect(
				getStaticSubworkflowId(
					node(RETRIEVER_WORKFLOW, 1, { source: 'parameter', workflowId: 'wf-child' }),
				),
			).toBeUndefined();
		});
	});

	describe('dynamic references are ignored', () => {
		it('ignores a plain-string expression', () => {
			expect(
				getStaticSubworkflowId(node(EXECUTE_WORKFLOW, 1, { workflowId: '={{ $json.id }}' })),
			).toBeUndefined();
		});

		it('ignores a resource-locator in expression mode', () => {
			expect(
				getStaticSubworkflowId(
					node(EXECUTE_WORKFLOW, 1.2, { workflowId: resourceLocator('={{ $json.id }}', 'id') }),
				),
			).toBeUndefined();
		});
	});

	describe('non-static / non-database inputs are ignored', () => {
		it('ignores an empty plain-string workflowId', () => {
			expect(
				getStaticSubworkflowId(node(EXECUTE_WORKFLOW, 1, { workflowId: '   ' })),
			).toBeUndefined();
		});

		it('ignores an empty resource-locator value', () => {
			expect(
				getStaticSubworkflowId(node(EXECUTE_WORKFLOW, 1.2, { workflowId: resourceLocator('') })),
			).toBeUndefined();
		});

		it('ignores a non-database source (localFile / parameter / url)', () => {
			for (const source of ['localFile', 'parameter', 'url']) {
				expect(
					getStaticSubworkflowId(node(EXECUTE_WORKFLOW, 1, { source, workflowId: 'wf-child' })),
				).toBeUndefined();
			}
		});

		it('treats a missing source as database', () => {
			expect(getStaticSubworkflowId(node(EXECUTE_WORKFLOW, 1, { workflowId: 'wf-child' }))).toBe(
				'wf-child',
			);
		});
	});

	it('ignores nodes without a workflow selector', () => {
		expect(
			getStaticSubworkflowId(node('n8n-nodes-base.set', 1, { workflowId: 'wf-child' })),
		).toBeUndefined();
	});
});

describe('setStaticSubworkflowId', () => {
	it('writes back to a resource-locator value', () => {
		const n = node(EXECUTE_WORKFLOW, 1.2, { workflowId: resourceLocator('wf-old', 'id') });
		setStaticSubworkflowId(n, 'wf-new');
		expect(n.parameters.workflowId).toEqual({ __rl: true, mode: 'id', value: 'wf-new' });
		expect(getStaticSubworkflowId(n)).toBe('wf-new');
	});

	it('writes back to a legacy plain-string workflowId', () => {
		const n = node(EXECUTE_WORKFLOW, 1, { workflowId: 'wf-old' });
		setStaticSubworkflowId(n, 'wf-new');
		expect(n.parameters.workflowId).toBe('wf-new');
	});
});

describe('subWorkflowNodeReference', () => {
	it('extracts referenced ids from selector nodes as requirements', () => {
		const wf = workflow([
			node(EXECUTE_WORKFLOW, 1.2, { workflowId: resourceLocator('child-a', 'id') }),
			node(EXECUTE_WORKFLOW, 1, { workflowId: 'child-b' }),
		]);

		expect(subWorkflowNodeReference.extract(wf)).toEqual([
			{ workflowId: 'parent', referencedWorkflowId: 'child-a' },
			{ workflowId: 'parent', referencedWorkflowId: 'child-b' },
		]);
	});

	it('rewrites referenced ids through the workflow bindings, leaving unknowns untouched', () => {
		const wf = workflow([
			node(EXECUTE_WORKFLOW, 1.2, { workflowId: resourceLocator('child-a', 'id') }),
			node(EXECUTE_WORKFLOW, 1, { workflowId: 'child-b' }),
			node(EXECUTE_WORKFLOW, 1.2, { workflowId: resourceLocator('external', 'id') }),
		]);

		subWorkflowNodeReference.apply(
			wf,
			bindings(
				new Map([
					['child-a', 'A'],
					['child-b', 'B'],
				]),
			),
		);

		expect(subWorkflowNodeReference.extract(wf).map((r) => r.referencedWorkflowId)).toEqual([
			'A',
			'B',
			'external',
		]);
	});
});
