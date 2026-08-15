import { sanitizeMongoUriInMessage } from '../MemoryMongoDbChat.node';

describe('sanitizeMongoUriInMessage', () => {
	it.each([
		[
			'Invalid URL: mongodb://leaky_user:supersecret@:27017/?appname=n8n',
			'Invalid URL: mongodb://[REDACTED]@:27017/?appname=n8n',
		],
		[
			'connect failed: mongodb+srv://user:xxxxxxxx@cluster.example.net/db',
			'connect failed: mongodb+srv://[REDACTED]@cluster.example.net/db',
		],
		// Synthetic encoded bytes only; %41%42%43 = "ABC", %44%45%46 = "DEF".
		[
			'Invalid URL: mongodb://%41%42%43:%44%45%46@:27017/db',
			'Invalid URL: mongodb://[REDACTED]@:27017/db',
		],
		[
			'Invalid URL: mongodb://justsecret@host:27017/db',
			'Invalid URL: mongodb://[REDACTED]@host:27017/db',
		],
		[
			'Invalid URL: mongodb://user:part:xxxxxxxx@host:27017/db',
			'Invalid URL: mongodb://[REDACTED]@host:27017/db',
		],
		['Invalid URL: mongodb://@host:27017/db', 'Invalid URL: mongodb://[REDACTED]@host:27017/db'],
		[
			'Invalid URL: MongoDB://User:Secret@host:27017/db',
			'Invalid URL: mongodb://[REDACTED]@host:27017/db',
		],
	])('redacts the auth section of %s', (input, expected) => {
		expect(sanitizeMongoUriInMessage(input)).toBe(expected);
	});

	it('redacts every URI when a message holds more than one', () => {
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
	])('leaves %p unchanged because it holds no URI credentials', (input) => {
		expect(sanitizeMongoUriInMessage(input)).toBe(input);
	});

	it('leaves an already redacted message alone on a second pass', () => {
		const sanitized = sanitizeMongoUriInMessage(
			'Invalid URL: mongodb://user:xxxxxxxx@host:27017/db',
		);

		expect(sanitizeMongoUriInMessage(sanitized)).toBe(sanitized);
	});
});
