import { sanitizeMongoUriInMessage } from '../MemoryMongoDbChat.node';

describe('sanitizeMongoUriInMessage', () => {
	it.each([
		[
			'Invalid URL: mongodb://leaky_user:supersecret@:27017/?appname=n8n',
			'Invalid URL: mongodb://[REDACTED]@:27017/?appname=n8n',
		],
		[
			'connect failed: mongodb+srv://user:password@cluster.example.net/db',
			'connect failed: mongodb+srv://[REDACTED]@cluster.example.net/db',
		],
		[
			'connect failed: mongodb://%41%42%43:%44%45%46@host:27017/db',
			'connect failed: mongodb://[REDACTED]@host:27017/db',
		],
		[
			'Invalid URL: mongodb://justsecret@host:27017/db',
			'Invalid URL: mongodb://[REDACTED]@host:27017/db',
		],
		[
			'Invalid URL: mongodb://user:part:password@host:27017/db',
			'Invalid URL: mongodb://[REDACTED]@host:27017/db',
		],
		['Invalid URL: mongodb://@host:27017/db', 'Invalid URL: mongodb://[REDACTED]@host:27017/db'],
	])('redacts authentication from %s', (input, expected) => {
		expect(sanitizeMongoUriInMessage(input)).toBe(expected);
	});

	it('redacts multiple URIs in the same message', () => {
		const input = 'tried mongodb://a:b@host1, then mongodb+srv://c:d@cluster, both failed';

		expect(sanitizeMongoUriInMessage(input)).toBe(
			'tried mongodb://[REDACTED]@host1, then mongodb+srv://[REDACTED]@cluster, both failed',
		);
	});

	it.each([
		'connect ECONNREFUSED 127.0.0.1:27017',
		'connect failed: mongodb://host:27017/db',
		'mongodb://host:27017/db failed, contact admin@example.com',
		'',
	])('leaves messages without URI authentication unchanged', (input) => {
		expect(sanitizeMongoUriInMessage(input)).toBe(input);
	});

	it('is idempotent', () => {
		const input = 'Invalid URL: mongodb://user:password@host:27017/db';
		const sanitized = sanitizeMongoUriInMessage(input);

		expect(sanitizeMongoUriInMessage(sanitized)).toBe(sanitized);
	});
});
