import type { CredentialProvider } from '@n8n/agents';
import { OperationalError, UserError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { createVectorStoreErrorSanitizer } from '../error-sanitizer';

describe('vector-store error sanitisation', () => {
	const provider = mock<CredentialProvider>();
	const vectorStore = {
		name: 'product_docs',
		credential: 'store-cred',
		embedding: { model: 'openai/text-embedding-3-small', credential: 'embed-cred' },
	};

	it.each([
		'apiKey',
		'serviceRole',
		'accessKeyId',
		'secretAccessKey',
		'sessionToken',
		'privateKey',
	])('redacts an unlabelled %s, including encoded and escaped forms', async (key) => {
		const secret = 'opaque/"value\\with space';
		const credential = { [key]: secret, host: 'db.example', database: 'documents' };
		provider.resolve.mockResolvedValue(credential);
		const sanitizer = createVectorStoreErrorSanitizer(provider, vectorStore);

		await expect(sanitizer.credentialProvider.resolve('store-cred')).resolves.toBe(credential);
		const error = sanitizer.sanitize(
			new Error(
				`Rejected ${secret}, ${encodeURIComponent(secret)}, ${JSON.stringify(secret).slice(1, -1)} at db.example/documents`,
			),
		);

		expect(error.message).toBe(
			'Rejected [REDACTED], [REDACTED], [REDACTED] at db.example/documents',
		);
		expect(provider.resolve).toHaveBeenCalledTimes(1);
	});

	it('redacts overlapping store and embedding secrets before bounding the message', async () => {
		provider.resolve
			.mockResolvedValueOnce({ apiKey: 'opaque-value' })
			.mockResolvedValueOnce({ apiKey: 'opaque-value-longer' });
		const sanitizer = createVectorStoreErrorSanitizer(provider, vectorStore);
		await sanitizer.credentialProvider.resolve('store-cred');
		await sanitizer.credentialProvider.resolve('embed-cred');

		const message = sanitizer.sanitize(
			`${'x'.repeat(480)} opaque-value-longer opaque-value ${'y'.repeat(100)}`,
		).message;

		expect(message).toHaveLength(500);
		expect(message).not.toMatch(/opaque|longer/);
		expect(message).toContain('[REDACTED]');
	});

	it('bounds long multiline provider messages promptly', () => {
		const sanitizer = createVectorStoreErrorSanitizer(provider, vectorStore);
		const message = `Query failed${'\n'.repeat(100_000)}Provider details`;
		const startedAt = performance.now();

		const error = sanitizer.sanitize(message);
		const durationMs = performance.now() - startedAt;

		expect(error.message).toBe('Query failed');
		expect(durationMs).toBeLessThan(1_000);
	});

	it.each(['\n', '\\n', '\\r\\n'])('removes embedded stack frames separated by %j', (separator) => {
		const error = createVectorStoreErrorSanitizer(provider, vectorStore).sanitize(
			new Error(`Collection docs unavailable${separator}    at query (/private/provider.ts:12:3)`),
		);

		expect(error.message).toBe('Collection docs unavailable');
	});

	it('drops raw error metadata without changing the original error', () => {
		const original = Object.assign(new Error('Collection docs unavailable'), {
			cause: new Error('raw secret'),
			request: { apiKey: 'raw secret' },
		});
		const originalStack = original.stack;
		const error = createVectorStoreErrorSanitizer(provider, vectorStore).sanitize(original);

		expect(error).toBeInstanceOf(OperationalError);
		expect(error.message).toBe(original.message);
		expect(error.stack).toBeUndefined();
		expect(error.cause).toBeUndefined();
		expect(error).not.toHaveProperty('request');
		expect(original.stack).toBe(originalStack);
		expect(original.cause.message).toBe('raw secret');
		expect(original.request).toEqual({ apiKey: 'raw secret' });
	});

	it('keeps provider validation errors as user errors', () => {
		const error = createVectorStoreErrorSanitizer(provider, vectorStore).sanitize(
			new UserError('Selected embedding model is not supported'),
		);

		expect(error).toBeInstanceOf(UserError);
		expect(error.message).toBe('Selected embedding model is not supported');
	});

	it('uses a fallback when credential redaction changes a stack marker', async () => {
		provider.resolve.mockResolvedValue({ password: 'at' });
		const sanitizer = createVectorStoreErrorSanitizer(provider, vectorStore);
		await sanitizer.credentialProvider.resolve('store-cred');

		expect(
			sanitizer.sanitize(new Error('Query failed\n    at query (/private/provider.ts:12:3)'))
				.message,
		).toBe('Vector store request failed');
	});

	it.each([
		{ error: new UserError('Cannot load opaque-value'), expectedType: UserError },
		{ error: new Error('Cannot load opaque-value'), expectedType: OperationalError },
	])(
		'uses a fixed message when credential resolution rejects with $error.name',
		async ({ error, expectedType }) => {
			provider.resolve.mockRejectedValue(error);
			const sanitizer = createVectorStoreErrorSanitizer(provider, vectorStore);

			const result = sanitizer.credentialProvider.resolve('store-cred');

			await expect(result).rejects.toBeInstanceOf(expectedType);
			await expect(result).rejects.toMatchObject({
				message: 'Could not resolve the credential of vector store "product_docs"',
				stack: undefined,
			});
		},
	);

	it.each([
		{ id: 'store-cred', role: 'credential' },
		{ id: 'embed-cred', role: 'embedding credential' },
	])('names the store and its $role when $id cannot be resolved', async ({ id, role }) => {
		provider.resolve.mockRejectedValue(new Error('Cannot load opaque-value'));
		const sanitizer = createVectorStoreErrorSanitizer(provider, vectorStore);

		await expect(sanitizer.credentialProvider.resolve(id)).rejects.toMatchObject({
			message: `Could not resolve the ${role} of vector store "product_docs"`,
		});
	});

	it('reports a credential shared by both roles as the store credential', async () => {
		provider.resolve.mockRejectedValue(new Error('Cannot load opaque-value'));
		const sanitizer = createVectorStoreErrorSanitizer(provider, {
			...vectorStore,
			embedding: { ...vectorStore.embedding, credential: 'store-cred' },
		});

		await expect(sanitizer.credentialProvider.resolve('store-cred')).rejects.toMatchObject({
			message: 'Could not resolve the credential of vector store "product_docs"',
		});
	});

	it.each(['\n', '\\n', '\\r\\n'])('removes Python tracebacks separated by %j', (separator) => {
		const traceback = [
			'Traceback (most recent call last):',
			'  File "/private/provider.py", line 42, in query',
			'ValueError: query failed',
		].join(separator);
		const sanitizer = createVectorStoreErrorSanitizer(provider, vectorStore);

		expect(sanitizer.sanitize(new Error(`Query failed${separator}${traceback}`)).message).toBe(
			'Query failed',
		);
		expect(sanitizer.sanitize(new Error(traceback)).message).toBe('Vector store request failed');
		expect(sanitizer.sanitize(new Error(`Provider error: ${traceback}`)).message).toBe(
			'Provider error:',
		);
	});

	it.each([
		[
			'string',
			JSON.stringify({
				message: 'Query failed',
				stack: 'Error: query failed\n    at query (/private/provider.ts:12:3)',
			}),
		],
		[
			'array',
			JSON.stringify({
				message: 'Query failed',
				stack_trace: ['query (/private/provider.ts:12:3)'],
			}),
		],
		[
			'escaped field',
			JSON.stringify(
				JSON.stringify({
					message: 'Query failed',
					stackTrace: 'query (/private/provider.ts:12:3)',
				}),
			),
		],
		[
			'field after the length limit',
			JSON.stringify({
				message: 'x'.repeat(500),
				traceback: 'File "/private/provider.py", line 42',
			}),
		],
	])('uses a fallback for a serialized stack field: %s', (_format, message) => {
		const sanitizer = createVectorStoreErrorSanitizer(provider, vectorStore);

		expect(sanitizer.sanitize(new Error(`Provider response: ${message}`)).message).toBe(
			'Vector store request failed',
		);
	});

	it('keeps serialized diagnostics without a stack field', () => {
		const message = 'Provider response: {"message":"Query failed","stackSize":3}';
		const sanitizer = createVectorStoreErrorSanitizer(provider, vectorStore);

		expect(sanitizer.sanitize(new Error(message)).message).toBe(message);
	});

	it.each([
		[{ message: 'Query failed: apiKey=opaque', stack: 'raw stack' }, 'Query failed: [REDACTED]'],
		[null, 'Vector store request failed'],
	])('handles non-Error failures safely: %j', (failure, message) => {
		expect(createVectorStoreErrorSanitizer(provider, vectorStore).sanitize(failure).message).toBe(
			message,
		);
	});

	it('does not stringify an unknown object', () => {
		const toString = vi.fn(() => 'raw secret');
		const sanitizer = createVectorStoreErrorSanitizer(provider, vectorStore);

		expect(sanitizer.sanitize({ toString }).message).toBe('Vector store request failed');
		expect(toString).not.toHaveBeenCalled();
	});

	it('keeps captured secrets local to each sanitizer', async () => {
		const first = createVectorStoreErrorSanitizer(provider, vectorStore);
		provider.resolve.mockResolvedValue({ apiKey: 'opaque-value' });
		await first.credentialProvider.resolve('store-cred');
		const second = createVectorStoreErrorSanitizer(provider, vectorStore);

		expect(first.sanitize('opaque-value').message).toBe('[REDACTED]');
		expect(second.sanitize('opaque-value').message).toBe('opaque-value');
	});
});
