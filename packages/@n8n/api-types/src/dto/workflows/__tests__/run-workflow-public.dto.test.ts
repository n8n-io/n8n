import { RunWorkflowPublicDto, StartedWorkflowRunPublicDto } from '../run-workflow-public.dto';

const validDestinationNode = { nodeName: 'Set', mode: 'inclusive' };

describe('RunWorkflowPublicDto', () => {
	test('accepts run data, a destination node and dirty node names', () => {
		const result = RunWorkflowPublicDto.safeParse({
			runData: { Trigger: [] },
			destinationNode: validDestinationNode,
			dirtyNodeNames: ['Set'],
		});

		expect(result.success).toBe(true);
	});

	test('accepts empty run data without dirty node names', () => {
		const result = RunWorkflowPublicDto.safeParse({
			runData: {},
			destinationNode: { nodeName: 'Set', mode: 'exclusive' },
		});

		expect(result.success).toBe(true);
	});

	test('rejects a body without run data', () => {
		const result = RunWorkflowPublicDto.safeParse({ destinationNode: validDestinationNode });

		expect(result.success).toBe(false);
	});

	test('rejects a body without a destination node', () => {
		const result = RunWorkflowPublicDto.safeParse({ runData: {} });

		expect(result.success).toBe(false);
	});

	test.each([
		{ name: 'an array', runData: [] },
		{ name: 'a string', runData: 'Trigger' },
	])('rejects run data that is $name', ({ runData }) => {
		const result = RunWorkflowPublicDto.safeParse({
			runData,
			destinationNode: validDestinationNode,
		});

		expect(result.success).toBe(false);
	});

	test.each(['sideways', ''])('rejects a destination mode of "%s"', (mode) => {
		const result = RunWorkflowPublicDto.safeParse({
			runData: {},
			destinationNode: { nodeName: 'Set', mode },
		});

		expect(result.success).toBe(false);
	});

	test('rejects an unknown top-level key', () => {
		const result = RunWorkflowPublicDto.safeParse({
			runData: {},
			destinationNode: validDestinationNode,
			triggerToStartFrom: { name: 'Trigger' },
		});

		expect(result.success).toBe(false);
	});

	test('rejects an unknown key inside the destination node', () => {
		const result = RunWorkflowPublicDto.safeParse({
			runData: {},
			destinationNode: { ...validDestinationNode, extra: true },
		});

		expect(result.success).toBe(false);
	});
});

describe('StartedWorkflowRunPublicDto', () => {
	test('accepts an execution ID', () => {
		const result = StartedWorkflowRunPublicDto.safeParse({ executionId: '1' });

		expect(result.success).toBe(true);
	});

	test('rejects a response without an execution ID', () => {
		const result = StartedWorkflowRunPublicDto.safeParse({});

		expect(result.success).toBe(false);
	});
});
