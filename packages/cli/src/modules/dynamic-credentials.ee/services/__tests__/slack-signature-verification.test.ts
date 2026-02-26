import crypto from 'node:crypto';

import { reconstructUrlEncodedBody, verifySlackSignature } from '../slack-signature-verification';

const signingSecret = 'test-signing-secret-abc123';

function createTimestamp(): string {
	return String(Math.floor(Date.now() / 1000));
}

function createSignature(secret: string, timestamp: string, body: Record<string, string>): string {
	const rawBody = new URLSearchParams(body).toString();
	const basestring = `v0:${timestamp}:${rawBody}`;
	return 'v0=' + crypto.createHmac('sha256', secret).update(basestring).digest('hex');
}

describe('slack-signature-verification', () => {
	describe('reconstructUrlEncodedBody', () => {
		it('should reconstruct body from object', () => {
			const result = reconstructUrlEncodedBody({ user_id: 'U123', team_id: 'T456' });
			expect(result).toBe('user_id=U123&team_id=T456');
		});

		it('should skip null and undefined values', () => {
			const result = reconstructUrlEncodedBody({
				user_id: 'U123',
				empty: null,
				missing: undefined,
			});
			expect(result).toBe('user_id=U123');
		});

		it('should stringify non-string values', () => {
			const result = reconstructUrlEncodedBody({ count: 42 as unknown });
			expect(result).toBe('count=42');
		});
	});

	describe('verifySlackSignature', () => {
		it('should accept a valid signature', () => {
			const body = { user_id: 'U123', team_id: 'T456' };
			const timestamp = createTimestamp();
			const signature = createSignature(signingSecret, timestamp, body as Record<string, string>);

			expect(() => {
				verifySlackSignature(signingSecret, timestamp, body, signature);
			}).not.toThrow();
		});

		it('should reject an invalid signature', () => {
			const body = { user_id: 'U123' };
			const timestamp = createTimestamp();

			expect(() => {
				verifySlackSignature(signingSecret, timestamp, body, 'v0=invalid');
			}).toThrow('Slack request signature verification failed');
		});

		it('should reject when signing secret is wrong', () => {
			const body = { user_id: 'U123' };
			const timestamp = createTimestamp();
			const signature = createSignature(signingSecret, timestamp, body as Record<string, string>);

			expect(() => {
				verifySlackSignature('wrong-secret', timestamp, body, signature);
			}).toThrow('Slack request signature verification failed');
		});

		it('should reject a non-numeric timestamp', () => {
			expect(() => {
				verifySlackSignature(signingSecret, 'not-a-number', {}, 'v0=abc');
			}).toThrow('Invalid x-slack-request-timestamp header');
		});
	});
});
