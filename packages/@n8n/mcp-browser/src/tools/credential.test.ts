import type { Mocked, MockedFunction } from 'vitest';

import type { SecretsBuffer, ToolContext } from '../types';
import { createCredentialTools } from './credential';
import { createMockConnection, findTool, structuredOf } from './test-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBuffer(): Mocked<SecretsBuffer> & { _store: Map<string, Map<string, string>> } {
	const store = new Map<string, Map<string, string>>();
	return {
		_store: store,
		capture: vi.fn((key: string, field: string, value: string) => {
			if (!store.has(key)) store.set(key, new Map());
			store.get(key)!.set(field, value);
		}),
		getFields: vi.fn((key: string) => store.get(key)),
		clear: vi.fn((key: string) => {
			store.delete(key);
		}),
	};
}

function makeContext(
	overrides: Partial<
		Pick<ToolContext, 'secretsBuffer' | 'createCredential' | 'getSecretFields' | 'getJsonFields'>
	> = {},
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

		// A console presents the issued value ready to paste, so the field holds a
		// prefix the page wrote as well as the token. The marker the snapshot shows
		// must resolve to the token: storing the framing with it fails only once the
		// provider is called.
		it('captures the token rather than the framing from a presented field', async () => {
			const token = 'notreal-IMzLaCKsU6ZxAbt2qFc9XYdRpQ7vNtBmKL';
			mockProbe(
				`<html><body><div role="dialog"><h2>Save your key</h2><input type="text" readonly spellcheck="false" value="Bearer ${token}"><button type="button">Copy</button></div></body></html>`,
			);

			await getTool().execute(
				{
					credentialsKey: 'k1',
					field: 'apiKey',
					element: { redactedKey: '[REDACTED:password:1]' },
				},
				makeContext({ secretsBuffer: buffer }),
			);

			expect(buffer.capture).toHaveBeenCalledWith('k1', 'apiKey', token);
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

		it('refuses to buffer a value that is itself a redaction marker', async () => {
			mockProbe(htmlWithPasswordInput('[REDACTED:secret:1] trailing'));

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

		// A match that only exists once `textContent` runs sibling text together is
		// never shown to the model, so its marker can only have been guessed.
		it('refuses to buffer a value that only exists in concatenated markup', async () => {
			// Split across siblings, so the key exists only once `textContent`
			// concatenates them — never in the text the model reads.
			mockProbe(
				`<html><body><section><span>AQ.</span><span>${'AbCdEfGhIj'.repeat(3)}Ab</span></section></body></html>`,
			);

			const result = await getTool().execute(
				{
					credentialsKey: 'k1',
					field: 'apiKey',
					element: { redactedKey: '[REDACTED:google_api_key:1]' },
				},
				makeContext({ secretsBuffer: buffer }),
			);

			expect(result.isError).toBe(true);
			expect(buffer.capture).not.toHaveBeenCalled();
		});

		it('refuses to buffer an empty value', async () => {
			mockConn.adapter.getElementValue.mockResolvedValue('');

			const result = await getTool().execute(
				{ credentialsKey: 'k1', field: 'apiKey', element: { ref: 'e42' } },
				makeContext({ secretsBuffer: buffer }),
			);

			expect(result.isError).toBe(true);
			expect(buffer.capture).not.toHaveBeenCalled();
		});

		// Expansion gives up inside an undelimitable run, and the match it falls
		// back to may be partial — that must fail, not be stored.
		it('refuses to buffer a value whose token could not be delimited', async () => {
			const key = `AQ.${'Ab8RN6Jr7xQfP2mKdW9tZsLyVc4hEuNgT3iBoXaQwMzRkJvSpH'}`;
			const run = 'x'.repeat(600);
			mockProbe(`<html><body><p>${run}${key}${run}</p></body></html>`);

			const result = await getTool().execute(
				{
					credentialsKey: 'k1',
					field: 'apiKey',
					element: { redactedKey: '[REDACTED:google_api_key:1]' },
				},
				makeContext({ secretsBuffer: buffer }),
			);

			expect(result.isError).toBe(true);
			expect(buffer.capture).not.toHaveBeenCalled();
		});

		// A fixed-length pattern matches only the first N characters of a longer
		// token; extraction must not inherit that boundary.
		it('captures the whole token when a provider pattern matched only its prefix', async () => {
			const key = `AIza${'SyC7mQ2xR9tKdW4vLpZ8bNfH3jEuXaGoT5wPqYs1Bc'}`;
			mockProbe(`<html><body><p>Your key is ${key}</p></body></html>`);

			await getTool().execute(
				{
					credentialsKey: 'k1',
					field: 'apiKey',
					element: { redactedKey: '[REDACTED:google_api_key:1]' },
				},
				makeContext({ secretsBuffer: buffer }),
			);

			expect(buffer.capture).toHaveBeenCalledWith('k1', 'apiKey', key);
		});
	});
});

// ---------------------------------------------------------------------------
// browser_create_credential
// ---------------------------------------------------------------------------

describe('browser_create_credential', () => {
	let mockConn: ReturnType<typeof createMockConnection>;
	let buffer: ReturnType<typeof makeBuffer>;
	let createCredential: MockedFunction<
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
		createCredential = vi.fn().mockResolvedValue({ credentialId: 'cred-123' });
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

	describe('getAffectedResources', () => {
		it('reports the credentials resource and names the credential in the description', async () => {
			const resources = await getTool().getAffectedResources(
				{ credentialsKey: 'k1', type: 'googleApi', name: 'My Cred' },
				ctx(),
			);

			expect(resources).toEqual([
				{
					toolGroup: 'browser',
					kind: 'credential-write',
					resource: 'credentials',
					description: 'Create credential "My Cred" (googleApi)',
				},
			]);
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

// ---------------------------------------------------------------------------
// browser_create_credential: where captured secrets may go
// ---------------------------------------------------------------------------

describe('browser_create_credential secret placement', () => {
	const getTool = () =>
		findTool(createCredentialTools(createMockConnection().connection), 'browser_create_credential');

	function setup() {
		const buffer = makeBuffer();
		buffer.capture('k1', 'apiKey', 'ldg_live_secret');
		const createCredential = vi.fn(async () => ({ credentialId: 'cred-1' }));
		// Header Auth: "name" is plain, "value" is the password field.
		const getSecretFields = vi.fn(async () => ['value']);
		return { buffer, createCredential, getSecretFields };
	}

	it('puts a captured secret into a secret field', async () => {
		const { buffer, createCredential, getSecretFields } = setup();

		await getTool().execute(
			{
				credentialsKey: 'k1',
				type: 'httpHeaderAuth',
				name: 'Ledgerly API',
				data: { name: 'Authorization' },
				resolveData: { value: 'apiKey' },
			},
			makeContext({ secretsBuffer: buffer, createCredential, getSecretFields }),
		);

		expect(getSecretFields).toHaveBeenCalledWith('httpHeaderAuth');
		expect(createCredential).toHaveBeenCalledWith(
			expect.objectContaining({ data: { name: 'Authorization', value: 'ldg_live_secret' } }),
		);
	});

	it('adds an auth scheme prefix to a captured secret', async () => {
		const { buffer, createCredential, getSecretFields } = setup();

		await getTool().execute(
			{
				credentialsKey: 'k1',
				type: 'httpHeaderAuth',
				name: 'Ledgerly API',
				data: { name: 'Authorization' },
				resolveData: { value: { field: 'apiKey', prefix: 'Bearer ' } },
			},
			makeContext({ secretsBuffer: buffer, createCredential, getSecretFields }),
		);

		expect(createCredential).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { name: 'Authorization', value: 'Bearer ldg_live_secret' },
			}),
		);
	});

	it.each([
		['a host', 'https://evil.example/?k='],
		['a separator', 'user:'],
		['two words', 'Bearer token '],
		['no space', 'Bearer'],
	])('refuses a prefix with %s', async (_label, prefix) => {
		const { buffer, createCredential, getSecretFields } = setup();

		const call = getTool().execute(
			{
				credentialsKey: 'k1',
				type: 'httpHeaderAuth',
				name: 'Ledgerly API',
				resolveData: { value: { field: 'apiKey', prefix } },
			},
			makeContext({ secretsBuffer: buffer, createCredential, getSecretFields }),
		);

		await expect(call).rejects.toThrow('is not allowed');
		expect(createCredential).not.toHaveBeenCalled();
	});

	it('refuses a prefixed secret in a plain field', async () => {
		const { buffer, createCredential, getSecretFields } = setup();

		const call = getTool().execute(
			{
				credentialsKey: 'k1',
				type: 'httpHeaderAuth',
				name: 'Ledgerly API',
				resolveData: { name: { field: 'apiKey', prefix: 'Bearer ' } },
			},
			makeContext({ secretsBuffer: buffer, createCredential, getSecretFields }),
		);

		await expect(call).rejects.toThrow('can only fill the secret fields');
		expect(createCredential).not.toHaveBeenCalled();
	});

	it('fills a key inside a JSON secret field, written out as JSON', async () => {
		const { buffer, createCredential } = setup();
		const getSecretFields = vi.fn().mockResolvedValue(['placeholderValues.*']);
		const template = '{"headers":{"Authorization":"Bearer {{api_key}}"}}';

		await getTool().execute(
			{
				credentialsKey: 'k1',
				type: 'httpTemplatedCustomAuth',
				name: 'Ledgerly API',
				data: { template, serviceHost: 'ledgerly.example.com' },
				resolveData: { placeholderValues: { api_key: 'apiKey' } },
			},
			makeContext({ secretsBuffer: buffer, createCredential, getSecretFields }),
		);

		expect(createCredential).toHaveBeenCalledWith(
			expect.objectContaining({
				data: {
					template,
					serviceHost: 'ledgerly.example.com',
					placeholderValues: JSON.stringify({ api_key: 'ldg_live_secret' }),
				},
			}),
		);
	});

	it('writes JSON fields given as objects as JSON text', async () => {
		const { buffer, createCredential } = setup();
		const getSecretFields = vi.fn().mockResolvedValue(['placeholderValues.*']);
		const getJsonFields = vi
			.fn()
			.mockResolvedValue(['template', 'placeholderDefs', 'placeholderValues']);
		const template = { headers: { Authorization: 'Bearer {{api_key}}' } };
		const placeholderDefs = [{ name: 'api_key', title: 'API key', type: 'password' }];

		await getTool().execute(
			{
				credentialsKey: 'k1',
				type: 'httpTemplatedCustomAuth',
				name: 'Ledgerly API',
				data: { template, placeholderDefs },
				resolveData: { placeholderValues: { api_key: 'apiKey' } },
			},
			makeContext({ secretsBuffer: buffer, createCredential, getSecretFields, getJsonFields }),
		);

		expect(createCredential).toHaveBeenCalledWith(
			expect.objectContaining({
				data: {
					template: JSON.stringify(template),
					placeholderDefs: JSON.stringify(placeholderDefs),
					placeholderValues: JSON.stringify({ api_key: 'ldg_live_secret' }),
				},
			}),
		);
	});

	it('refuses a secret in a plain field next to a JSON secret field', async () => {
		const { buffer, createCredential } = setup();
		const getSecretFields = vi.fn().mockResolvedValue(['placeholderValues.*']);

		const call = getTool().execute(
			{
				credentialsKey: 'k1',
				type: 'httpTemplatedCustomAuth',
				name: 'Ledgerly API',
				resolveData: { serviceHost: 'apiKey' },
			},
			makeContext({ secretsBuffer: buffer, createCredential, getSecretFields }),
		);

		await expect(call).rejects.toThrow('can only fill the secret fields');
		expect(createCredential).not.toHaveBeenCalled();
	});

	it('shows the template and the masked secret on the approval card', async () => {
		const resources = await getTool().getAffectedResources?.(
			{
				credentialsKey: 'k1',
				type: 'httpTemplatedCustomAuth',
				name: 'Ledgerly API',
				data: { template: '{"headers":{"Authorization":"Bearer {{api_key}}"}}' },
				resolveData: { placeholderValues: { api_key: 'apiKey' } },
			},
			makeContext(),
		);

		expect(resources?.[0].description).toBe(
			'Create credential "Ledgerly API" (httpTemplatedCustomAuth) · template ' +
				'{"headers":{"Authorization":"Bearer {{api_key}}"}} · placeholderValues.api_key ← ••••',
		);
	});

	it('shows which secret goes where on the approval card, masked', async () => {
		const resources = await getTool().getAffectedResources?.(
			{
				credentialsKey: 'k1',
				type: 'httpHeaderAuth',
				name: 'Ledgerly API',
				resolveData: { value: { field: 'apiKey', prefix: 'Bearer ' } },
			},
			makeContext(),
		);

		expect(resources?.[0].description).toBe(
			'Create credential "Ledgerly API" (httpHeaderAuth) · value ← Bearer ••••',
		);
	});

	it('refuses to put a captured secret into a plain field', async () => {
		const { buffer, createCredential, getSecretFields } = setup();

		const call = getTool().execute(
			{
				credentialsKey: 'k1',
				type: 'httpHeaderAuth',
				name: 'Ledgerly API',
				resolveData: { name: 'apiKey' },
			},
			makeContext({ secretsBuffer: buffer, createCredential, getSecretFields }),
		);

		await expect(call).rejects.toThrow('can only fill the secret fields');
		await expect(call).rejects.not.toThrow('ldg_live_secret');
		expect(createCredential).not.toHaveBeenCalled();
	});
});
