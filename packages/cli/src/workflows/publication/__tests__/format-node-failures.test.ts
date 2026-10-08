import { formatNodeFailures } from '@/workflows/publication/format-node-failures';

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
