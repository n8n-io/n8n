import type { INode } from 'n8n-workflow';

import { getStaticSubworkflowId } from '../static-sub-workflow-id';

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
					node(EXECUTE_WORKFLOW, 1.2, {
						workflowId: resourceLocator('={{ $json.id }}', 'id'),
					}),
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
