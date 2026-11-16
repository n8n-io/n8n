import { RunWorkflowPublicDto } from '../run-workflow-public.dto';

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

	test.each(['sideways', ''])('rejects a destination mode of "%s"', (mode) => {
		const result = RunWorkflowPublicDto.safeParse({
			runData: {},
			destinationNode: { nodeName: 'Set', mode },
		});

		expect(result.success).toBe(false);
	});
});
