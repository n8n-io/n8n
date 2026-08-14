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
			'Invalid URL: mongodb://user/secret@host:27017/db',
			'Invalid URL: mongodb://[REDACTED]@host:27017/db',
		],
		[
			'Invalid URL: mongodb://user secret@host:27017/db',
			'Invalid URL: mongodb://[REDACTED]@host:27017/db',
		],
		[
			'Invalid URL: mongodb://user:p@ss@host:27017/db',
			'Invalid URL: mongodb://[REDACTED]@host:27017/db',
		],
	])('redacts authentication from %s', (message, expected) => {
		expect(sanitizeMongoUriInMessage(message, '')).toBe(expected);
	});

	it('redacts multiple URIs in the same message', () => {
		const message = 'tried mongodb://a:b@host1, then mongodb+srv://c:d@cluster, both failed';

		expect(sanitizeMongoUriInMessage(message, '')).toBe(
			'tried mongodb://[REDACTED]@host1, then mongodb+srv://[REDACTED]@cluster, both failed',
		);
	});

	it('redacts the connection string when the regex does not match', () => {
		const connectionString = 'mongodb://user\nsecret@host:27017/db';
		const message = `Invalid URL: ${connectionString}`;

		expect(sanitizeMongoUriInMessage(message, connectionString)).toBe(
			'Invalid URL: mongodb://[REDACTED]',
		);
	});

	it.each(['connect ECONNREFUSED 127.0.0.1:27017', 'connect failed: mongodb://host:27017/db', ''])(
		'leaves messages without URI authentication unchanged',
		(message) => {
			expect(sanitizeMongoUriInMessage(message, '')).toBe(message);
		},
	);

	it('is idempotent', () => {
		const connectionString = 'mongodb://user:password@host:27017/db';
		const message = `Invalid URL: ${connectionString}`;
		const sanitized = sanitizeMongoUriInMessage(message, connectionString);

		expect(sanitizeMongoUriInMessage(sanitized, connectionString)).toBe(sanitized);
	});
});
