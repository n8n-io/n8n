import { redactTelemetryText } from '../telemetry-redaction';

describe('redactTelemetryText', () => {
	it('leaves ordinary assistant prose untouched', () => {
		const text = 'I added an HTTP Request node and connected it to the Schedule Trigger.';

		expect(redactTelemetryText(text)).toBe(text);
	});

	it('replaces secret-shaped values', () => {
		const redacted = redactTelemetryText(
			'I used your key sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA for the request.',
		);

		expect(redacted).not.toContain('sk-ant-api03');
		expect(redacted).toContain('[REDACTED]');
	});

	it('replaces PII categories the user-facing policy leaves alone', () => {
		const redacted = redactTelemetryText('Sent the invoice to jane.doe@example.com.');

		expect(redacted).not.toContain('jane.doe@example.com');
		expect(redacted).toContain('[REDACTED]');
	});

	it('keeps URL structure while dropping query values', () => {
		const redacted = redactTelemetryText('Call https://api.example.com/v1/orders?token=abc123xyz');

		expect(redacted).toContain('https://api.example.com/v1/orders');
		expect(redacted).not.toContain('abc123xyz');
	});

	it('caps long text so the event stays under the RudderStack payload limit', () => {
		const redacted = redactTelemetryText('a'.repeat(20_000));

		expect(redacted).toHaveLength(8_003);
		expect(redacted.endsWith('...')).toBe(true);
	});

	it('passes through the empty string', () => {
		expect(redactTelemetryText('')).toBe('');
	});
});
