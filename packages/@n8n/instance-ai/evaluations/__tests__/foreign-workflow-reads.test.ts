import { findForeignWorkflowReads } from '../outcome/foreign-reads';
import type { CapturedToolCall } from '../types';

function call(
	toolName: string,
	args: Record<string, unknown>,
	outcome: { result?: unknown; error?: string } = { result: { success: true } },
): CapturedToolCall {
	return {
		toolCallId: `${toolName}-${String(Math.random())}`,
		toolName,
		args,
		durationMs: 0,
		...outcome,
	};
}

const created = call(
	'build-workflow',
	{ filePath: 'src/workflows/digest.workflow.ts', name: 'Daily Email Digest' },
	{ result: { success: true, workflowId: 'mine' } },
);

describe('findForeignWorkflowReads', () => {
	it('flags a successful read of a workflow this build did not create or seed', () => {
		const reads = findForeignWorkflowReads(
			[call('workflows', { action: 'get', workflowId: 'other' }, { result: { id: 'other' } })],
			[],
		);

		expect(reads).toEqual(['other']);
	});

	it('ignores the workflows the build created, and later reads of them', () => {
		const reads = findForeignWorkflowReads(
			[created, call('workflows', { action: 'get', workflowId: 'mine' })],
			[],
		);

		expect(reads).toEqual([]);
	});

	it('ignores seeded workflows', () => {
		const reads = findForeignWorkflowReads(
			[call('workflows', { action: 'get', workflowId: 'seeded' })],
			['seeded'],
		);

		expect(reads).toEqual([]);
	});

	it('ignores reads that failed, so an invented id is not a leak', () => {
		const reads = findForeignWorkflowReads(
			[
				call('workflows', { action: 'get', workflowId: 'ghost' }, { error: 'Workflow not found' }),
				call(
					'workflows',
					{ action: 'setup', workflowId: 'ghost-2' },
					{ result: { success: false, error: 'not found' } },
				),
			],
			[],
		);

		expect(reads).toEqual([]);
	});

	it("flags another build's workflows in a list result", () => {
		const reads = findForeignWorkflowReads(
			[
				created,
				call(
					'workflows',
					{ action: 'list', scope: 'instance' },
					{ result: JSON.stringify({ workflows: [{ id: 'mine' }, { id: 'other' }] }) },
				),
			],
			[],
		);

		expect(reads).toEqual(['other']);
	});

	it("flags an edit of another build's workflow, once", () => {
		const reads = findForeignWorkflowReads(
			[
				call('workflows', { action: 'get', workflowId: 'other' }),
				call(
					'build-workflow',
					{ filePath: 'src/workflows/digest.workflow.ts', workflowId: 'other' },
					{ result: { success: true, workflowId: 'other' } },
				),
			],
			[],
		);

		expect(reads).toEqual(['other']);
	});

	describe('n8n MCP tools', () => {
		const mcpResult = (toolName: string, payload: unknown) => ({
			type: 'content',
			value: [
				{
					type: 'text',
					text: `<untrusted_data source="tool:${toolName}">\n${JSON.stringify(payload)}\n</untrusted_data>`,
				},
			],
		});

		const mcpCreated = call(
			'create_workflow_from_code',
			{ code: 'export default workflow(...)', name: 'Notion Chat' },
			{
				result: mcpResult('create_workflow_from_code', { workflowId: 'mine', name: 'Notion Chat' }),
			},
		);

		it('ignores the workflow the build created, and later reads of it', () => {
			const reads = findForeignWorkflowReads(
				[
					mcpCreated,
					call('workflows', { action: 'validate', workflowId: 'mine' }, { result: undefined }),
					call(
						'get_workflow_details',
						{ workflowId: 'mine' },
						{ result: mcpResult('get_workflow_details', { workflow: { id: 'mine' } }) },
					),
				],
				[],
			);

			expect(reads).toEqual([]);
		});

		it("flags another build's workflows in a search result", () => {
			const reads = findForeignWorkflowReads(
				[
					mcpCreated,
					call(
						'search_workflows',
						{ query: 'digest' },
						{ result: mcpResult('search_workflows', { data: [{ id: 'mine' }, { id: 'other' }] }) },
					),
				],
				[],
			);

			expect(reads).toEqual(['other']);
		});

		it('ignores MCP calls that returned an error', () => {
			const reads = findForeignWorkflowReads(
				[
					call(
						'get_workflow_details',
						{ workflowId: 'ghost' },
						{ result: mcpResult('get_workflow_details', { error: 'Workflow not found' }) },
					),
					call(
						'update_workflow',
						{ workflowId: 'ghost-2' },
						{
							result: { type: 'content', value: [{ type: 'text', text: 'Access denied by user' }] },
						},
					),
				],
				[],
			);

			expect(reads).toEqual([]);
		});
	});
});
