import {
	formatFailedActivationError,
	formatNodeFailures,
} from '@/workflows/publication/format-node-failures';

describe('formatNodeFailures', () => {
	test('returns an empty string for no failures', () => {
		expect(formatNodeFailures([])).toBe('');
	});

	test('quotes the node name and appends the message', () => {
		expect(formatNodeFailures([{ nodeName: 'Webhook', message: 'port in use' }])).toBe(
			'"Webhook": port in use',
		);
	});

	test('joins multiple failures with a semicolon', () => {
		expect(
			formatNodeFailures([
				{ nodeName: 'Webhook', message: 'port in use' },
				{ nodeName: 'Schedule Trigger', message: 'bad cron' },
			]),
		).toBe('"Webhook": port in use; "Schedule Trigger": bad cron');
	});
});

describe('formatFailedActivationError', () => {
	test('returns a single failure message verbatim', () => {
		expect(formatFailedActivationError([{ nodeName: 'Webhook', message: 'port in use' }])).toBe(
			'port in use',
		);
	});

	test('prefixes and joins several failures', () => {
		expect(
			formatFailedActivationError([
				{ nodeName: 'Webhook', message: 'port in use' },
				{ nodeName: 'Schedule Trigger', message: 'bad cron' },
			]),
		).toBe('Triggers failed to activate: "Webhook": port in use; "Schedule Trigger": bad cron');
	});
});
