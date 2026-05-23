import { blueprintCheckpointItemSchema } from '../blueprint.schema';

describe('blueprintCheckpointItemSchema', () => {
	it('rejects a checkpoint with an empty dependsOn array', () => {
		const result = blueprintCheckpointItemSchema.safeParse({
			id: 'verify-1',
			title: 'Verify something',
			instructions: 'Call verify-built-workflow',
			dependsOn: [],
		});
		expect(result.success).toBe(false);
	});

	it('rejects a checkpoint that omits dependsOn entirely', () => {
		const result = blueprintCheckpointItemSchema.safeParse({
			id: 'verify-1',
			title: 'Verify something',
			instructions: 'Call verify-built-workflow',
		});
		expect(result.success).toBe(false);
	});

	it('accepts a checkpoint that depends on at least one workflow item', () => {
		const result = blueprintCheckpointItemSchema.safeParse({
			id: 'verify-1',
			title: 'Verify Daily Email workflow runs without errors',
			instructions: 'Call verify-built-workflow with the workItemId from wf-1.',
			dependsOn: ['wf-1'],
		});
		expect(result.success).toBe(true);
	});
});
