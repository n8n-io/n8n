import { redactRecord, redactText } from '../redactor';

describe('redactText', () => {
	it.each([
		['Authorization: Bearer abc123def456', 'Authorization: [redacted]'],
		['authorization=Basic dXNlcjpwYXNz', 'authorization=[redacted]'],
		['{"password":"hunter2"}', '{"password":[redacted]}'],
		["{ 'api_key': 'sk-live-123' }", "{ 'api_key': [redacted] }"],
		['?token=abc123&page=2', '?token=[redacted]&page=2'],
		['client_secret = s3cr3t', 'client_secret = [redacted]'],
	])('redacts %j', (input, expected) => {
		expect(redactText(input)).toBe(expected);
	});

	it('redacts a scheme-prefixed token with no key next to it', () => {
		expect(redactText('sent header Bearer eyJhbGciOiJIUzI1NiJ9')).toBe(
			'sent header Bearer [redacted]',
		);
	});

	it('redacts URL userinfo but keeps the host readable', () => {
		expect(redactText('connecting to postgres://admin:hunter2@db.internal:5432/n8n')).toBe(
			'connecting to postgres://admin:[redacted]@db.internal:5432/n8n',
		);
	});

	it('leaves ordinary text alone', () => {
		const message = 'Workflow 42 finished in 1200ms with 3 items';

		expect(redactText(message)).toBe(message);
	});

	it('does not fire on a secret-ish word used as prose', () => {
		expect(redactText('the token expired 5 minutes ago')).toBe('the token expired 5 minutes ago');
	});
});

describe('redactRecord', () => {
	it('returns the original object when nothing matched', () => {
		const record = { message: 'nothing to see', meta: { attempt: 1 } };

		expect(redactRecord(record)).toBe(record);
	});

	it('redacts secret-named meta keys whatever their shape', () => {
		const result = redactRecord({
			message: 'ok',
			meta: { password: 'hunter2', cookie: ['a', 'b'], attempt: 1 },
		});

		expect(result.meta).toEqual({ password: '[redacted]', cookie: '[redacted]', attempt: 1 });
	});

	it('scrubs secret-shaped values nested inside meta', () => {
		const result = redactRecord({
			message: 'request failed',
			meta: { request: { headers: 'Authorization: Bearer abc123' } },
		});

		expect(result.meta).toEqual({ request: { headers: 'Authorization: [redacted]' } });
	});

	it('does not mutate the input', () => {
		const meta = { password: 'hunter2' };
		const record = { message: 'ok', meta };

		redactRecord(record);

		expect(meta.password).toBe('hunter2');
	});

	it('leaves non-literal values in meta untouched', () => {
		const date = new Date('2026-08-12T00:00:00.000Z');
		const result = redactRecord({ message: 'ok', meta: { date } });

		expect(result.meta?.date).toBe(date);
	});
});
