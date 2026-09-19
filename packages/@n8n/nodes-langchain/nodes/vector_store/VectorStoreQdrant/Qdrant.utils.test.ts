import { UserError } from 'n8n-workflow';

vi.mock('@qdrant/js-client-rest', () => {
	class QdrantClient {
		static lastArgs?: unknown[];
		constructor(...args: unknown[]) {
			QdrantClient.lastArgs = args;
		}
	}
	return { QdrantClient };
});

import { QdrantClient } from '@qdrant/js-client-rest';

import { createQdrantClient } from './Qdrant.utils';

const MockQdrantClient = QdrantClient as unknown as { lastArgs?: unknown[] };

describe('Qdrant.utils createQdrantClient', () => {
	beforeEach(() => {
		MockQdrantClient.lastArgs = undefined;
	});

	function ctorParams() {
		return (MockQdrantClient.lastArgs?.[0] ?? {}) as Record<string, unknown>;
	}

	it('should not pass a prefix for root URLs', () => {
		createQdrantClient({ qdrantUrl: 'https://localhost:6333', apiKey: 'test-api-key' });

		expect(ctorParams()).toMatchObject({
			host: 'localhost',
			https: true,
			port: 6333,
		});
		expect(ctorParams()).not.toHaveProperty('prefix');
	});

	it('should pass a reverse-proxy subpath as prefix', () => {
		createQdrantClient({ qdrantUrl: 'https://test.com/qdrant', apiKey: 'test-api-key' });

		expect(ctorParams()).toMatchObject({
			host: 'test.com',
			https: true,
			port: 443,
			prefix: '/qdrant',
		});
	});

	it('should trim a trailing slash from the prefix', () => {
		createQdrantClient({ qdrantUrl: 'https://my-server.org/qdrant/', apiKey: 'test-api-key' });

		expect(ctorParams()).toMatchObject({ prefix: '/qdrant' });
	});

	it('should preserve nested prefixes with custom ports', () => {
		createQdrantClient({ qdrantUrl: 'http://10.0.0.5:6333/a/b', apiKey: 'test-api-key' });

		expect(ctorParams()).toMatchObject({
			host: '10.0.0.5',
			https: false,
			port: 6333,
			prefix: '/a/b',
		});
	});

	it('should throw a UserError for invalid URLs', () => {
		expect(() => createQdrantClient({ qdrantUrl: 'not-a-url', apiKey: 'test-api-key' })).toThrow(
			UserError,
		);
	});
});
