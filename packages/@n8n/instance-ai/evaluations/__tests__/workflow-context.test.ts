import { workflow } from './fixtures';
import type { WorkflowNodeResponse } from '../clients/n8n-client';
import { buildWorkflowContextBlock } from '../harness/workflow-context';

const HEADER =
	'**Workflow settings** (an absent or "DEFAULT" value means the instance default; an absent `executionOrder` means the legacy `v0` order):';

const node = (id: string, name: string): WorkflowNodeResponse => ({
	id,
	name,
	type: 'n8n-nodes-base.set',
});

/** The rendered groups JSON, exactly as the block should print it. */
const groupsJson = (groups: Array<Record<string, unknown>>): string =>
	['**Node groups:**', '```json', JSON.stringify(groups, null, 2), '```'].join('\n');

describe('buildWorkflowContextBlock', () => {
	it('renders the workflow settings, such as the timezone', () => {
		const wf = workflow('wf-1', {
			nodes: [node('id-a', 'Fetch Data')],
			settings: { executionOrder: 'v1', timezone: 'America/New_York' },
		});

		expect(buildWorkflowContextBlock(wf)).toContain(
			[
				HEADER,
				'```json',
				JSON.stringify({ executionOrder: 'v1', timezone: 'America/New_York' }, null, 2),
				'```',
			].join('\n'),
		);
	});

	it('states that no workflow settings exist when the API returns null settings', () => {
		const wf = workflow('wf-1', { nodes: [node('id-a', 'Fetch Data')], settings: null });

		expect(buildWorkflowContextBlock(wf)).toContain(`${HEADER}\n\n(none set)`);
	});

	it('states that no workflow settings exist when the workflow has none', () => {
		const wf = workflow('wf-1', { nodes: [node('id-a', 'Fetch Data')] });

		expect(buildWorkflowContextBlock(wf)).toContain(`${HEADER}\n\n(none set)`);
	});

	it('renders "(no workflow built)" without a workflow', () => {
		expect(buildWorkflowContextBlock(undefined)).toBe(
			'## Workflow structure\n\n(no workflow built)',
		);
	});

	it('renders group members by node name, not id', () => {
		const wf = workflow('wf-1', {
			nodes: [node('id-a', 'Fetch Data'), node('id-b', 'Parse CSV'), node('id-c', 'Send Email')],
			nodeGroups: [
				{ id: 'g-1', name: 'Ingestion', nodeIds: ['id-a', 'id-b'] },
				{ id: 'g-2', name: 'Notify', nodeIds: ['id-c'] },
			],
		});

		const block = buildWorkflowContextBlock(wf);

		expect(block).toContain(
			groupsJson([
				{ name: 'Ingestion', nodes: ['Fetch Data', 'Parse CSV'] },
				{ name: 'Notify', nodes: ['Send Email'] },
			]),
		);
		// The judge context is name-keyed throughout — ids must not leak in.
		expect(block).not.toContain('id-a');
		expect(block).not.toContain('g-1');
	});

	it('drops member ids that no longer resolve to a node', () => {
		const wf = workflow('wf-1', {
			nodes: [node('id-a', 'Fetch Data')],
			nodeGroups: [{ id: 'g-1', name: 'Ingestion', nodeIds: ['id-a', 'id-ghost'] }],
		});

		expect(buildWorkflowContextBlock(wf)).toContain(
			groupsJson([{ name: 'Ingestion', nodes: ['Fetch Data'] }]),
		);
	});

	it('includes the group description only when present', () => {
		const wf = workflow('wf-1', {
			nodes: [node('id-a', 'Fetch Data'), node('id-b', 'Send Email')],
			nodeGroups: [
				{ id: 'g-1', name: 'Ingestion', nodeIds: ['id-a'], description: 'Pulls the raw CSV' },
				{ id: 'g-2', name: 'Notify', nodeIds: ['id-b'] },
			],
		});

		expect(buildWorkflowContextBlock(wf)).toContain(
			groupsJson([
				{ name: 'Ingestion', nodes: ['Fetch Data'], description: 'Pulls the raw CSV' },
				{ name: 'Notify', nodes: ['Send Email'] },
			]),
		);
	});

	it('states "(none)" when the workflow has no groups', () => {
		// Absent field (REST omits it) and empty array must both read as "no groups".
		const withoutField = workflow('wf-1', { nodes: [node('id-a', 'Fetch Data')] });
		const withEmpty = workflow('wf-2', { nodes: [node('id-a', 'Fetch Data')], nodeGroups: [] });

		for (const wf of [withoutField, withEmpty]) {
			const block = buildWorkflowContextBlock(wf);
			expect(block).toContain('**Node groups:**\n\n(none)');
		}
	});

	it('renders every saved node field except the id and the canvas position', () => {
		// `notes` is not on WorkflowNodeResponse: a field the harness does not
		// know about must still reach the judge.
		const saved = {
			...node('id-a', 'Fetch Data'),
			position: [240, 300],
			retryOnFail: true,
			notes: 'Retries the flaky API',
		} as WorkflowNodeResponse;

		const block = buildWorkflowContextBlock(workflow('wf-1', { nodes: [saved] }));

		expect(block).toContain(
			JSON.stringify(
				[
					{
						name: 'Fetch Data',
						type: 'n8n-nodes-base.set',
						retryOnFail: true,
						notes: 'Retries the flaky API',
						parameters: {},
					},
				],
				null,
				2,
			),
		);
		expect(block).not.toContain('id-a');
		expect(block).not.toContain('240');
	});
});
