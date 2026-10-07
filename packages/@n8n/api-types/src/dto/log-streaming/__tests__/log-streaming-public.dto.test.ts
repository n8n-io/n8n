import {
	LogStreamingDestinationPublicDto,
	LogStreamingEventTypesPublicDto,
	LogStreamingTestResultPublicDto,
} from '../log-streaming-public.dto';

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

const webhook = {
	id: '88be6560-bfb4-455c-8aa1-06971e9e5522',
	type: 'webhook',
	label: 'My destination',
	enabled: true,
	subscribedEvents: ['n8n.workflow'],
	url: 'https://example.com/n8n-events',
};

describe('LogStreamingDestinationPublicDto', () => {
	test.each([
		['a missing id', { ...webhook, id: undefined }],
		['an unknown type', { ...webhook, type: 'kafka' }],
	])('rejects %s', (_, input) => {
		expect(LogStreamingDestinationPublicDto.safeParse(input).success).toBe(false);
	});
});

describe('LogStreamingTestResultPublicDto', () => {
	test('rejects a field other than success', () => {
		const result = LogStreamingTestResultPublicDto.safeParse({
			success: true,
			error: 'ECONNREFUSED',
		});

		expect(result.success).toBe(false);
	});
});
