import { InstanceAiGenerateSampleDataRequestDto } from '../instance-ai-generate-sample-data-request.dto';

const workflow = {
	name: 'My workflow',
	nodes: [
		{
			id: 'a',
			name: 'Slack Trigger',
			type: 'n8n-nodes-base.slackTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
	],
	connections: {},
};

describe('InstanceAiGenerateSampleDataRequestDto', () => {
	it('accepts the payload the NDV sends', () => {
		const result = InstanceAiGenerateSampleDataRequestDto.safeParse({
			workflow,
			nodeNames: ['Slack Trigger'],
		});

		expect(result.success).toBe(true);
	});

	it('accepts an optional hint', () => {
		const result = InstanceAiGenerateSampleDataRequestDto.safeParse({
			workflow,
			nodeNames: ['Slack Trigger'],
			hint: 'failed payment scenario',
		});

		expect(result.success).toBe(true);
	});

	it('rejects an empty node list', () => {
		const result = InstanceAiGenerateSampleDataRequestDto.safeParse({ workflow, nodeNames: [] });

		expect(result.success).toBe(false);
	});

	it('rejects more nodes than one prompt should carry', () => {
		const result = InstanceAiGenerateSampleDataRequestDto.safeParse({
			workflow,
			nodeNames: Array.from({ length: 21 }, (_, i) => `Node ${String(i)}`),
		});

		expect(result.success).toBe(false);
	});

	it('rejects an over-long hint', () => {
		const result = InstanceAiGenerateSampleDataRequestDto.safeParse({
			workflow,
			nodeNames: ['Slack Trigger'],
			hint: 'x'.repeat(2001),
		});

		expect(result.success).toBe(false);
	});

	// The workflow schema is deliberately loose (matching the builder's request DTO), but
	// loose must not mean crashy: these all have to come back as validation failures rather
	// than throwing out of the parse and turning a bad request into a 500.
	describe('malformed workflow', () => {
		it.each([
			['missing', undefined],
			['null', null],
			['a string', 'not a workflow'],
			['a number', 42],
			['an array', []],
			['an object with neither nodes nor connections', { name: 'x' }],
			// The generator reads `nodes` unconditionally, so a half-workflow has to be
			// rejected here rather than crashing downstream.
			['missing nodes', { connections: {} }],
			['missing connections', { nodes: [] }],
			['nodes that are not an array', { nodes: 'nope', connections: {} }],
		])('rejects a workflow that is %s', (_label, value) => {
			const result = InstanceAiGenerateSampleDataRequestDto.safeParse({
				workflow: value,
				nodeNames: ['Slack Trigger'],
			});

			expect(result.success).toBe(false);
		});
	});
});
