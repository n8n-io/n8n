import type { SecretsBuffer, ToolContext } from '../types';
import { createCredentialTools } from './credential';
import { createMockConnection, findTool, structuredOf } from './test-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBuffer(): jest.Mocked<SecretsBuffer> & { _store: Map<string, Map<string, string>> } {
	const store = new Map<string, Map<string, string>>();
	return {
		_store: store,
		capture: jest.fn((key: string, field: string, value: string) => {
			if (!store.has(key)) store.set(key, new Map());
			store.get(key)!.set(field, value);
		}),
		getFields: jest.fn((key: string) => store.get(key)),
		clear: jest.fn((key: string) => {
			store.delete(key);
		}),
	};
}

function makeContext(
	overrides: Partial<Pick<ToolContext, 'secretsBuffer' | 'createCredential'>> = {},
): ToolContext {
	return { dir: '/test', ...overrides };
}

// ---------------------------------------------------------------------------
// browser_capture_secret
// ---------------------------------------------------------------------------

describe('browser_capture_secret', () => {
	let mockConn: ReturnType<typeof createMockConnection>;
	let buffer: ReturnType<typeof makeBuffer>;

	beforeEach(() => {
		mockConn = createMockConnection();
		buffer = makeBuffer();
		mockConn.adapter.getElementValue.mockResolvedValue('secret-value');
	});

	const getTool = () =>
		findTool(createCredentialTools(mockConn.connection), 'browser_capture_secret');

	describe('with element.ref', () => {
		it('captures element value into the buffer', async () => {
			await getTool().execute(
				{ credentialsKey: 'k1', field: 'apiKey', element: { ref: 'e42' } },
				makeContext({ secretsBuffer: buffer }),
			);

			expect(buffer.capture).toHaveBeenCalledWith('k1', 'apiKey', 'secret-value');
		});

		it('does NOT include the secret value in the response', async () => {
			const result = await getTool().execute(
				{ credentialsKey: 'k1', field: 'apiKey', element: { ref: 'e42' } },
				makeContext({ secretsBuffer: buffer }),
			);

			const text = JSON.stringify(result);
			expect(text).not.toContain('secret-value');
		});

		it('returns ok:true with fieldsCaptured', async () => {
			const result = await getTool().execute(
				{ credentialsKey: 'k1', field: 'apiKey', element: { ref: 'e42' } },
				makeContext({ secretsBuffer: buffer }),
			);

			expect(structuredOf(result)).toMatchObject({ ok: true, fieldsCaptured: ['apiKey'] });
		});

		it('passes ref to getElementValue', async () => {
			await getTool().execute(
				{ credentialsKey: 'k1', field: 'apiKey', element: { ref: 'e99' } },
				makeContext({ secretsBuffer: buffer }),
			);

			expect(mockConn.adapter.getElementValue).toHaveBeenCalledWith('page1', { ref: 'e99' });
		});

		it('does not probe HTML when ref is provided', async () => {
			await getTool().execute(
				{ credentialsKey: 'k1', field: 'apiKey', element: { ref: 'e42' } },
				makeContext({ secretsBuffer: buffer }),
			);

			expect(mockConn.adapter.probePageHtml).not.toHaveBeenCalled();
		});

		it('returns an error result when secretsBuffer is missing from context', async () => {
			const result = await getTool().execute(
				{ credentialsKey: 'k1', field: 'apiKey', element: { ref: 'e1' } },
				makeContext(),
			);
			expect(result.isError).toBe(true);
		});
	});

	describe('with element.redactedKey', () => {
		const htmlWithPasswordInput = (value: string) =>
			`<html><body><input type="password" value="${value}"></body></html>`;

		const htmlWithTwoPasswordInputs = (v1: string, v2: string) =>
			`<html><body><input type="password" value="${v1}"><input type="password" value="${v2}"></body></html>`;

		function mockProbe(html: string): void {
			mockConn.adapter.probePageHtml.mockResolvedValue({
				ok: true,
				root: {
					kind: 'document',
					html,
					url: 'http://test.com',
					children: [],
					errors: [],
				},
			});
		}

		it('captures the secret value matching the redacted marker', async () => {
			mockProbe(htmlWithPasswordInput('top-secret-pwd'));

			await getTool().execute(
				{
					credentialsKey: 'k1',
					field: 'apiKey',
					element: { redactedKey: '[REDACTED:password:1]' },
				},
				makeContext({ secretsBuffer: buffer }),
			);

			expect(buffer.capture).toHaveBeenCalledWith('k1', 'apiKey', 'top-secret-pwd');
		});

		it('does NOT include the secret value in the response', async () => {
			mockProbe(htmlWithPasswordInput('top-secret-pwd'));

			const result = await getTool().execute(
				{
					credentialsKey: 'k1',
					field: 'apiKey',
					element: { redactedKey: '[REDACTED:password:1]' },
				},
				makeContext({ secretsBuffer: buffer }),
			);

			expect(JSON.stringify(result)).not.toContain('top-secret-pwd');
		});

		it('returns ok:true with fieldsCaptured', async () => {
			mockProbe(htmlWithPasswordInput('top-secret-pwd'));

			const result = await getTool().execute(
				{
					credentialsKey: 'k1',
					field: 'apiKey',
					element: { redactedKey: '[REDACTED:password:1]' },
				},
				makeContext({ secretsBuffer: buffer }),
			);

			expect(structuredOf(result)).toMatchObject({ ok: true, fieldsCaptured: ['apiKey'] });
		});

		it('resolves the second secret when redactedKey points to index 2', async () => {
			mockProbe(htmlWithTwoPasswordInputs('first-pwd', 'second-pwd'));

			await getTool().execute(
				{
					credentialsKey: 'k1',
					field: 'apiKey',
					element: { redactedKey: '[REDACTED:password:2]' },
				},
				makeContext({ secretsBuffer: buffer }),
			);

			expect(buffer.capture).toHaveBeenCalledWith('k1', 'apiKey', 'second-pwd');
		});

		it('does not call getElementValue when redactedKey is provided', async () => {
			mockProbe(htmlWithPasswordInput('top-secret-pwd'));

			await getTool().execute(
				{
					credentialsKey: 'k1',
					field: 'apiKey',
					element: { redactedKey: '[REDACTED:password:1]' },
				},
				makeContext({ secretsBuffer: buffer }),
			);

			expect(mockConn.adapter.getElementValue).not.toHaveBeenCalled();
		});

		it('returns an error result when the redactedKey does not match any marker', async () => {
			mockProbe(htmlWithPasswordInput('top-secret-pwd'));

			const result = await getTool().execute(
				{
					credentialsKey: 'k1',
					field: 'apiKey',
					element: { redactedKey: '[REDACTED:password:99]' },
				},
				makeContext({ secretsBuffer: buffer }),
			);

			expect(result.isError).toBe(true);
			expect(buffer.capture).not.toHaveBeenCalled();
		});

		it('returns an error result when no sensitive content is found', async () => {
			mockProbe('<html><body><p>Hello world</p></body></html>');

			const result = await getTool().execute(
				{
					credentialsKey: 'k1',
					field: 'apiKey',
					element: { redactedKey: '[REDACTED:password:1]' },
				},
				makeContext({ secretsBuffer: buffer }),
			);

			expect(result.isError).toBe(true);
			expect(buffer.capture).not.toHaveBeenCalled();
		});

		it('returns an error result when the HTML probe fails', async () => {
			mockConn.adapter.probePageHtml.mockResolvedValue({ ok: false, error: 'probe boom' });

			const result = await getTool().execute(
				{
					credentialsKey: 'k1',
					field: 'apiKey',
					element: { redactedKey: '[REDACTED:password:1]' },
				},
				makeContext({ secretsBuffer: buffer }),
			);

			expect(result.isError).toBe(true);
			expect(buffer.capture).not.toHaveBeenCalled();
		});

		it('returns an error result when secretsBuffer is missing from context', async () => {
			mockProbe(htmlWithPasswordInput('top-secret-pwd'));

			const result = await getTool().execute(
				{
					credentialsKey: 'k1',
					field: 'apiKey',
					element: { redactedKey: '[REDACTED:password:1]' },
				},
				makeContext(),
			);

			expect(result.isError).toBe(true);
		});
	});
});

// ---------------------------------------------------------------------------
// browser_create_credential
// ---------------------------------------------------------------------------

describe('browser_create_credential', () => {
	let mockConn: ReturnType<typeof createMockConnection>;
	let buffer: ReturnType<typeof makeBuffer>;
	let createCredential: jest.MockedFunction<
		(p: {
			name: string;
			type: string;
			data: Record<string, unknown>;
			projectId?: string;
		}) => Promise<{ credentialId: string }>
	>;

	beforeEach(() => {
		mockConn = createMockConnection();
		buffer = makeBuffer();
		// Pre-populate buffer with some captured secrets
		buffer.capture('k1', 'clientId', 'client-id-value');
		buffer.capture('k1', 'clientSecret', 'client-secret-value');
		createCredential = jest.fn().mockResolvedValue({ credentialId: 'cred-123' });
	});

	const getTool = () =>
		findTool(createCredentialTools(mockConn.connection), 'browser_create_credential');

	const ctx = () => makeContext({ secretsBuffer: buffer, createCredential });

	describe('resolveData', () => {
		it('resolves flat leaf values to captured secrets', async () => {
			await getTool().execute(
				{
					credentialsKey: 'k1',
					type: 'googleApi',
					name: 'My Cred',
					resolveData: { clientId: 'clientId', clientSecret: 'clientSecret' },
				},
				ctx(),
			);

			expect(createCredential).toHaveBeenCalledWith(
				expect.objectContaining({
					data: { clientId: 'client-id-value', clientSecret: 'client-secret-value' },
				}),
			);
		});

		it('resolves nested resolveData', async () => {
			buffer.capture('k1', 'token', 'tok-value');
			await getTool().execute(
				{
					credentialsKey: 'k1',
					type: 'googleApi',
					name: 'My Cred',
					resolveData: { oauth: { token: 'token' } },
				},
				ctx(),
			);

			expect(createCredential).toHaveBeenCalledWith(
				expect.objectContaining({ data: { oauth: { token: 'tok-value' } } }),
			);
		});

		it('throws when a resolveData field name is not in the buffer', async () => {
			await expect(
				getTool().execute(
					{
						credentialsKey: 'k1',
						type: 'googleApi',
						name: 'My Cred',
						resolveData: { missing: 'noSuchField' },
					},
					ctx(),
				),
			).rejects.toThrow(/noSuchField/);
		});

		it('deep-merges data and resolveData (resolved wins on collision)', async () => {
			await getTool().execute(
				{
					credentialsKey: 'k1',
					type: 'googleApi',
					name: 'My Cred',
					data: { scopes: 'email', clientId: 'literal-id' },
					resolveData: { clientId: 'clientId' },
				},
				ctx(),
			);

			expect(createCredential).toHaveBeenCalledWith(
				expect.objectContaining({
					data: { scopes: 'email', clientId: 'client-id-value' },
				}),
			);
		});
	});

	describe('credential creation', () => {
		it('returns ok:true with the new credentialId', async () => {
			const result = await getTool().execute(
				{ credentialsKey: 'k1', type: 'googleApi', name: 'My Cred' },
				ctx(),
			);
			expect(structuredOf(result)).toMatchObject({ ok: true, credentialId: 'cred-123' });
		});

		it('does not include captured secret values in the result', async () => {
			const result = await getTool().execute(
				{
					credentialsKey: 'k1',
					type: 'googleApi',
					name: 'My Cred',
					resolveData: { clientId: 'clientId' },
				},
				ctx(),
			);
			expect(JSON.stringify(result)).not.toContain('client-id-value');
		});

		it('passes name, type, and projectId to createCredential', async () => {
			await getTool().execute(
				{ credentialsKey: 'k1', type: 'googleApi', name: 'My Cred', projectId: 'proj-1' },
				ctx(),
			);
			expect(createCredential).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'My Cred', type: 'googleApi', projectId: 'proj-1' }),
			);
		});
	});

	describe('buffer clearing', () => {
		it('clears the buffer on success by default', async () => {
			await getTool().execute({ credentialsKey: 'k1', type: 'googleApi', name: 'My Cred' }, ctx());
			expect(buffer.clear).toHaveBeenCalledWith('k1');
		});

		it('clears the buffer when clear is explicitly true', async () => {
			await getTool().execute(
				{ credentialsKey: 'k1', type: 'googleApi', name: 'My Cred', clear: true },
				ctx(),
			);
			expect(buffer.clear).toHaveBeenCalledWith('k1');
		});

		it('retains the buffer when clear is false', async () => {
			await getTool().execute(
				{ credentialsKey: 'k1', type: 'googleApi', name: 'My Cred', clear: false },
				ctx(),
			);
			expect(buffer.clear).not.toHaveBeenCalled();
		});
	});

	describe('missing context', () => {
		it('throws when secretsBuffer is absent', async () => {
			await expect(
				getTool().execute(
					{ credentialsKey: 'k1', type: 'googleApi', name: 'My Cred' },
					makeContext({ createCredential }),
				),
			).rejects.toThrow();
		});

		it('throws when createCredential is absent', async () => {
			await expect(
				getTool().execute(
					{ credentialsKey: 'k1', type: 'googleApi', name: 'My Cred' },
					makeContext({ secretsBuffer: buffer }),
				),
			).rejects.toThrow();
		});

		it('throws when credentialsKey has no captured fields', async () => {
			await expect(
				getTool().execute(
					{ credentialsKey: 'no-such-key', type: 'googleApi', name: 'My Cred' },
					ctx(),
				),
			).rejects.toThrow(/no-such-key/);
		});
	});
});
