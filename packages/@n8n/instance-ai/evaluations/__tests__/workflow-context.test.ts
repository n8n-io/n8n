import { workflow } from './fixtures';
import type { WorkflowNodeResponse } from '../clients/n8n-client';
import { buildWorkflowContextBlock } from '../harness/workflow-context';

const node = (id: string, name: string): WorkflowNodeResponse => ({
	id,
	name,
	type: 'n8n-nodes-base.set',
});

/** The rendered groups JSON, exactly as the block should print it. */
const groupsJson = (groups: Array<Record<string, unknown>>): string =>
	['**Node groups:**', '```json', JSON.stringify(groups, null, 2), '```'].join('\n');

describe('buildWorkflowContextBlock', () => {
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

	it('renders a forEach group with its repeat settings by node name and explains them', () => {
		const wf = workflow('wf-1', {
			nodes: [node('id-a', 'Send Email'), node('id-b', 'Pause'), node('id-c', 'Summary')],
			nodeGroups: [
				{
					id: 'g-1',
					name: 'Batches Of 10',
					nodeIds: ['id-a', 'id-b'],
					repeat: {
						kind: 'forEach',
						batchSize: 10,
						entry: 'id-a',
						exits: [
							{ node: 'id-b', output: 0 },
							{ node: 'id-ghost', output: 0 },
						],
					},
				},
				{ id: 'g-2', name: 'Report', nodeIds: ['id-c'] },
			],
		});

		const block = buildWorkflowContextBlock(wf);

		expect(block).toContain(
			groupsJson([
				{
					name: 'Batches Of 10',
					nodes: ['Send Email', 'Pause'],
					repeat: {
						kind: 'forEach',
						batchSize: 10,
						entry: 'Send Email',
						exits: [{ node: 'Pause', output: 0 }],
					},
				},
				{ name: 'Report', nodes: ['Summary'] },
			]),
		);
		expect(block).toContain(
			'\n\nA group with `repeat` is a loop, not only a visual frame. With `kind: "forEach"`, the engine runs the nodes of the group once for each batch of at most `batchSize` items that arrive at `entry`. The batches run one after the other, so a Wait node in the group pauses once for each batch. The items of all batches leave the group one time, on `exits`, after the last batch.',
		);
		expect(block).not.toContain('kind: "loop"');
	});

	it('renders loop, paginate and pollUntil groups by node name and explains only their kinds', () => {
		const wf = workflow('wf-1', {
			nodes: [node('id-a', 'Call'), node('id-b', 'Fetch Page'), node('id-c', 'Pause')],
			nodeGroups: [
				{
					id: 'g-1',
					name: 'Retry',
					nodeIds: ['id-a'],
					repeat: {
						kind: 'loop',
						entry: 'id-a',
						exits: [{ node: 'id-a', output: 0 }],
						maxIterations: 3,
						until: '={{ $json.ok }}',
					},
				},
				{
					id: 'g-2',
					name: 'Pages',
					nodeIds: ['id-b'],
					repeat: {
						kind: 'paginate',
						entry: 'id-b',
						exits: [{ node: 'id-b', output: 0 }],
						maxPages: 10,
						next: '={{ $json.cursor }}',
						emit: 'each',
					},
				},
				{
					id: 'g-3',
					name: 'Poll',
					nodeIds: ['id-c'],
					repeat: {
						kind: 'pollUntil',
						entry: 'id-c',
						exits: [{ node: 'id-c', output: 0 }],
						maxAttempts: 5,
						until: '={{ $json.done }}',
						onLimit: 'continue',
					},
				},
			],
		});

		const block = buildWorkflowContextBlock(wf);

		expect(block).toContain(
			groupsJson([
				{
					name: 'Retry',
					nodes: ['Call'],
					repeat: {
						kind: 'loop',
						maxIterations: 3,
						until: '={{ $json.ok }}',
						entry: 'Call',
						exits: [{ node: 'Call', output: 0 }],
					},
				},
				{
					name: 'Pages',
					nodes: ['Fetch Page'],
					repeat: {
						kind: 'paginate',
						maxPages: 10,
						next: '={{ $json.cursor }}',
						emit: 'each',
						entry: 'Fetch Page',
						exits: [{ node: 'Fetch Page', output: 0 }],
					},
				},
				{
					name: 'Poll',
					nodes: ['Pause'],
					repeat: {
						kind: 'pollUntil',
						maxAttempts: 5,
						until: '={{ $json.done }}',
						onLimit: 'continue',
						entry: 'Pause',
						exits: [{ node: 'Pause', output: 0 }],
					},
				},
			]),
		);
		const note = block.split('\n').at(-1) ?? '';
		for (const text of [
			'A group with `repeat` is a loop, not only a visual frame.',
			'With `kind: "loop"`',
			'With `kind: "paginate"`',
			'With `kind: "pollUntil"`',
			'`onLimit: "continue"`',
			'`emit: "each"`',
		]) {
			expect(note).toContain(text);
		}
		expect(note).not.toContain('forEach');
		expect(block).not.toContain('id-a');
	});

	it('explains each repeat kind of the workflow once', () => {
		const exits = [{ node: 'id-a', output: 0 }];
		const wf = workflow('wf-1', {
			nodes: [node('id-a', 'Fetch Manager'), node('id-b', 'Check'), node('id-c', 'Again')],
			nodeGroups: [
				{
					id: 'g-1',
					name: 'Walk',
					nodeIds: ['id-a'],
					repeat: { kind: 'loop', entry: 'id-a', exits, maxIterations: 10, until: '={{ true }}' },
				},
				{
					id: 'g-2',
					name: 'Poll',
					nodeIds: ['id-b'],
					repeat: { kind: 'pollUntil', entry: 'id-b', exits, maxAttempts: 5, until: '={{ true }}' },
				},
				{
					id: 'g-3',
					name: 'Walk again',
					nodeIds: ['id-c'],
					repeat: { kind: 'loop', entry: 'id-c', exits, maxIterations: 3, until: '={{ true }}' },
				},
			],
		});

		const block = buildWorkflowContextBlock(wf);

		expect(block.split('kind: "loop"`').length).toBe(2);
		expect(block).toContain('With `kind: "pollUntil"`');
		expect(block).not.toContain('With `kind: "forEach"`');
		expect(block).not.toContain('With `kind: "paginate"`');
	});

	it('adds no repeat note when no group repeats', () => {
		const wf = workflow('wf-1', {
			nodes: [node('id-a', 'Fetch Data')],
			nodeGroups: [{ id: 'g-1', name: 'Ingestion', nodeIds: ['id-a'] }],
		});

		expect(buildWorkflowContextBlock(wf)).toMatch(/```$/);
		expect(buildWorkflowContextBlock(wf)).not.toContain('repeat');
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
});
