import { LogStreamingEventTypesPublicDto } from '../log-streaming-public.dto';

describe('LogStreamingEventTypesPublicDto', () => {
	test('accepts a list of event names', () => {
		const result = LogStreamingEventTypesPublicDto.safeParse({
			data: ['n8n.workflow.started', 'n8n.workflow.success', 'n8n.workflow.failed'],
		});

		expect(result.success).toBe(true);
	});

	test('accepts an empty list', () => {
		expect(LogStreamingEventTypesPublicDto.safeParse({ data: [] }).success).toBe(true);
	});

	test.each([
		['a missing data field', {}],
		['a string instead of the array', { data: 'n8n.workflow.started' }],
		['a non-string event name', { data: [1] }],
	])('rejects %s', (_, input) => {
		expect(LogStreamingEventTypesPublicDto.safeParse(input).success).toBe(false);
	});
});
