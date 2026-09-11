import { serializedWorkflowSchema } from '../workflow.schema';

describe('serializedWorkflowSchema', () => {
	const emptyGroup = {
		id: 'group-1',
		name: 'Empty group',
		nodeIds: [],
		frame: { position: [560, 280], size: [240, 160] },
		visualLinks: [
			{
				source: { kind: 'node', id: 'node-a', port: { type: 'main', index: 2 } },
				target: { kind: 'group', id: 'group-1', port: { type: 'main', index: 0 } },
			},
		],
	};

	const workflow = (typeVersion: number) => ({
		id: 'wf-1',
		name: 'Workflow',
		nodes: [
			{
				id: 'n1',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion,
				position: [0, 0],
				parameters: {},
			},
		],
		connections: {},
		versionId: 'v1',
		parentFolderId: null,
		isArchived: false,
	});

	it('accepts a finite node typeVersion', () => {
		expect(() => serializedWorkflowSchema.parse(workflow(1.2))).not.toThrow();
	});

	it('rejects a non-finite node typeVersion (JSON `1e999` parses to Infinity)', () => {
		expect(() => serializedWorkflowSchema.parse(workflow(Infinity))).toThrow();
	});

	it('accepts a non-empty tagIds array', () => {
		expect(() =>
			serializedWorkflowSchema.parse({ ...workflow(1), tagIds: ['tag-1', 'tag-2'] }),
		).not.toThrow();
	});

	it('accepts an empty tagIds array (an untagged workflow exported with tags)', () => {
		expect(() => serializedWorkflowSchema.parse({ ...workflow(1), tagIds: [] })).not.toThrow();
	});

	it('rejects an empty-string tag id', () => {
		expect(() => serializedWorkflowSchema.parse({ ...workflow(1), tagIds: [''] })).toThrow();
	});

	it('preserves an empty group frame and visual links', () => {
		const result = serializedWorkflowSchema.parse({
			...workflow(1),
			nodeGroups: [emptyGroup],
		});

		expect(result.nodeGroups).toEqual([emptyGroup]);
	});

	it.each([
		['a non-finite frame position', { ...emptyGroup, frame: { position: [NaN, 0], size: [1, 1] } }],
		[
			'a fractional node port index',
			{
				...emptyGroup,
				visualLinks: [
					{
						source: {
							kind: 'node',
							id: 'node-a',
							port: { type: 'main', index: 0.5 },
						},
						target: {
							kind: 'group',
							id: 'group-1',
							port: { type: 'main', index: 0 },
						},
					},
				],
			},
		],
	])('rejects %s', (_name, group) => {
		expect(() => serializedWorkflowSchema.parse({ ...workflow(1), nodeGroups: [group] })).toThrow();
	});
});
