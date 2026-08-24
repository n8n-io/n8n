import { redactTelemetryProperties, redactTelemetryText } from '../telemetry-redaction';

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

describe('redactTelemetryProperties', () => {
	it('scrubs free-text values and leaves everything else intact', () => {
		const redacted = redactTelemetryProperties({
			thread_id: 'thread-1',
			run_id: 'run-1',
			query: 'send a receipt to jane.doe@example.com',
			attempt_count: 2,
			multi_gate: true,
			templates_version: null,
		});

		expect(redacted).toEqual({
			thread_id: 'thread-1',
			run_id: 'run-1',
			query: 'send a receipt to [REDACTED]',
			attempt_count: 2,
			multi_gate: true,
			templates_version: null,
		});
	});

	it('leaves identifier-shaped values unscrubbed so events stay joinable', () => {
		const properties = {
			workflow_id: '0d7d274c-1e7a-409f-8d77-bc868a97abd7',
			source_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
			node_ids: ['10.0.0.5', '192.168.1.1'],
		};

		expect(redactTelemetryProperties(properties)).toEqual(properties);
	});

	it('replaces values under secret-shaped keys, even when they match no pattern', () => {
		const redacted = redactTelemetryProperties({
			password: 'hunter2',
			api_key: 'plain-value',
			config: { access_token: 'not-token-shaped' },
		});

		expect(redacted).toEqual({
			password: '[REDACTED]',
			api_key: '[REDACTED]',
			config: { access_token: '[REDACTED]' },
		});
	});

	it('catches camelCase secret keys too', () => {
		expect(
			redactTelemetryProperties({ config: { clientSecret: 'plain', apiKey: 'plain' } }),
		).toEqual({ config: { clientSecret: '[REDACTED]', apiKey: '[REDACTED]' } });
	});

	it('catches kebab-case secret keys too', () => {
		expect(redactTelemetryProperties({ 'private-key': 'plain', 'api-key': 'plain' })).toEqual({
			'private-key': '[REDACTED]',
			'api-key': '[REDACTED]',
		});
	});

	it('keeps properties that only describe a credential', () => {
		const properties = {
			credential_type: 'httpBasicAuth',
			credential_kind: 'n8n_connect',
			credentials: ['slackApi', 'googleSheetsOAuth2Api'],
			has_token: true,
			total_tokens: 1_200,
		};

		expect(redactTelemetryProperties(properties)).toEqual(properties);
	});

	it('recurses into nested objects and arrays', () => {
		const redacted = redactTelemetryProperties({
			errors: [
				{
					node: 'HTTP Request',
					message: 'rejected ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
				},
			],
		});

		expect(redacted).toEqual({
			errors: [{ node: 'HTTP Request', message: 'rejected [REDACTED]' }],
		});
	});

	it('drops values nested deeper than the scrub depth instead of shipping them raw', () => {
		const redacted = redactTelemetryProperties({
			a: { b: { c: { d: { e: { f: { secret: 'jane.doe@example.com' } } } } } },
		});

		expect(JSON.stringify(redacted)).not.toContain('jane.doe@example.com');
		expect(JSON.stringify(redacted)).toContain('[REDACTED_DEPTH]');
	});
});
