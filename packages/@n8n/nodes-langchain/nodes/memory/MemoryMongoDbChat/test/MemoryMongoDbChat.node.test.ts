import { sanitizeMongoUriInMessage } from '../MemoryMongoDbChat.node';

describe('sanitizeMongoUriInMessage', () => {
	it('rewrites auth in mongodb URIs to [REDACTED]', () => {
		const input = 'Invalid URL: mongodb://leaky_user:supersecret@:27017/?appname=n8n';
		const out = sanitizeMongoUriInMessage(input);
		expect(out).not.toContain('leaky_user');
		expect(out).not.toContain('supersecret');
		expect(out).toContain('mongodb://[REDACTED]@');
	});

	it('rewrites auth in mongodb+srv URIs to [REDACTED]', () => {
		const input = 'connect failed: mongodb+srv://u:p@cluster.example.net/db';
		const out = sanitizeMongoUriInMessage(input);
		expect(out).not.toContain(':p@');
		expect(out).toContain('mongodb+srv://[REDACTED]@');
	});

	it('handles URI-encoded characters in the auth section', () => {
		// Synthetic encoded bytes only; %41%42%43 = "ABC", %44%45%46 = "DEF".
		const input = 'fail: mongodb://%41%42%43:%44%45%46@host:27017/db';
		const out = sanitizeMongoUriInMessage(input);
		expect(out).not.toContain('%41');
		expect(out).not.toContain('%44');
		expect(out).toContain('mongodb://[REDACTED]@');
	});

	it('rewrites multiple URIs in the same message', () => {
		const input =
			'tried mongodb://a:b@host1, then mongodb+srv://c:d@cluster, both failed';
		const out = sanitizeMongoUriInMessage(input);
		expect(out).not.toContain(':b@');
		expect(out).not.toContain(':d@');
		expect((out.match(/\[REDACTED\]/g) ?? []).length).toBe(2);
	});

	it('passes through messages without a URI', () => {
		const input = 'connect ECONNREFUSED 127.0.0.1:27017';
		expect(sanitizeMongoUriInMessage(input)).toBe(input);
	});

	it('does not rewrite URIs without an auth section', () => {
		const input = 'connect failed: mongodb://host:27017/db';
		expect(sanitizeMongoUriInMessage(input)).toBe(input);
	});

	it('handles an empty string', () => {
		expect(sanitizeMongoUriInMessage('')).toBe('');
	});
});
