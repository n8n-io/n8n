import type { InstanceAiCredentialSetupHint } from '@n8n/api-types';
import { jsonParse } from 'n8n-workflow';
import { vi } from 'vitest';

import type { N8nClient } from '../../clients/n8n-client';
import type { EvalLogger } from '../../harness/logger';
import { createDeclaredCredentials, createOneCredential, hasRealCredentialKey } from '../seeder';

const makeClient = (createCredential: N8nClient['createCredential']) =>
	({ createCredential }) as unknown as N8nClient;

const makeLogger = (): EvalLogger => ({
	isVerbose: false,
	info: vi.fn(),
	verbose: vi.fn(),
	success: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
});

const baseHint: InstanceAiCredentialSetupHint = {
	template: { headers: { Authorization: 'Bearer {{api_key}}' } },
	placeholders: [
		{ name: 'api_key', title: 'API key', type: 'password' },
		{ name: 'workspace_id', title: 'Workspace ID', type: 'plain', optional: true },
	],
	serviceHost: 'api.example.com',
	serviceOrigin: 'https://api.example.com',
	docsUrl: 'https://example.com/docs',
	testUrl: 'https://api.example.com/me',
	acceptedStatusCodes: [401],
};

describe('createOneCredential — httpTemplatedCustomAuth', () => {
	it('builds a credential from the setup hint, persisting object/array fields as JSON strings', async () => {
		const createCredential = vi.fn(
			async (_name: string, _type: string, _data: Record<string, unknown>) =>
				await Promise.resolve({ id: 'cred-1' }),
		);
		const client = makeClient(createCredential);

		const result = await createOneCredential(
			client,
			'httpTemplatedCustomAuth',
			'My Custom Auth',
			new Map(),
			{ setupHint: baseHint },
		);

		expect(result).toEqual({
			id: 'cred-1',
			name: 'My Custom Auth',
			type: 'httpTemplatedCustomAuth',
		});
		expect(createCredential).toHaveBeenCalledTimes(1);
		const [, type, data] = createCredential.mock.calls[0];
		expect(type).toBe('httpTemplatedCustomAuth');

		expect(typeof data.template).toBe('string');
		expect(jsonParse(data.template as string)).toEqual(baseHint.template);

		expect(typeof data.placeholderDefs).toBe('string');
		expect(jsonParse(data.placeholderDefs as string)).toEqual(baseHint.placeholders);

		expect(typeof data.placeholderValues).toBe('string');
		const parsedValues = jsonParse<Record<string, string>>(data.placeholderValues as string);
		for (const placeholder of baseHint.placeholders) {
			expect(parsedValues).toHaveProperty(placeholder.name);
			expect(parsedValues[placeholder.name]).toBeTruthy();
		}
		// The optional placeholder must still be filled, not omitted.
		expect(Object.keys(parsedValues)).toHaveLength(baseHint.placeholders.length);

		expect(data.serviceHost).toBe(baseHint.serviceHost);
		expect(data.serviceOrigin).toBe(baseHint.serviceOrigin);

		expect(typeof data.acceptedStatusCodes).toBe('string');
		expect(jsonParse(data.acceptedStatusCodes as string)).toEqual(baseHint.acceptedStatusCodes);
	});

	it('warns but still creates the credential when serviceHost is missing', async () => {
		const createCredential = vi.fn(async () => await Promise.resolve({ id: 'cred-2' }));
		const client = makeClient(createCredential);
		const logger = makeLogger();
		const hintWithoutHost: InstanceAiCredentialSetupHint = {
			...baseHint,
			serviceHost: undefined,
		};

		const result = await createOneCredential(
			client,
			'httpTemplatedCustomAuth',
			'No Host Auth',
			new Map(),
			{ logger, setupHint: hintWithoutHost },
		);

		expect(result.id).toBe('cred-2');
		expect(createCredential).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledTimes(1);
		expect(vi.mocked(logger.warn).mock.calls[0][0]).toMatch(/serviceHost/i);
	});

	it('throws an actionable error when no setupHint is provided', async () => {
		const createCredential = vi.fn(async () => await Promise.resolve({ id: 'cred-3' }));
		const client = makeClient(createCredential);

		await expect(
			createOneCredential(client, 'httpTemplatedCustomAuth', 'No Hint Auth', new Map(), {}),
		).rejects.toThrow(/setupHint/i);
		await expect(
			createOneCredential(client, 'httpTemplatedCustomAuth', 'No Hint Auth', new Map(), {}),
		).rejects.toThrow(/httpTemplatedCustomAuth/);
		expect(createCredential).not.toHaveBeenCalled();
	});
});

describe('createOneCredential — static template path (regression)', () => {
	it('creates a slackApi credential with the default name and de-dupes with a #2 suffix', async () => {
		const createCredential = vi.fn(
			async (name: string, _type: string, _data: Record<string, unknown>) =>
				await Promise.resolve({ id: `cred-${name}` }),
		);
		const client = makeClient(createCredential);
		const usedNames = new Map<string, number>();

		const first = await createOneCredential(client, 'slackApi', undefined, usedNames);
		const second = await createOneCredential(client, 'slackApi', undefined, usedNames);

		expect(first.name).toBe('[eval] Slack');
		expect(second.name).toBe('[eval] Slack #2');
		expect(createCredential).toHaveBeenCalledTimes(2);
		expect(createCredential.mock.calls[0][1]).toBe('slackApi');
	});

	it.each([
		['anthropicApi', '[eval] Anthropic', ['apiKey', 'url']],
		['groqApi', '[eval] Groq', ['apiKey']],
		['wordpressApi', '[eval] WordPress', ['username', 'password', 'url']],
	])('creates a %s credential with its required fields', async (type, defaultName, fields) => {
		const createCredential = vi.fn(
			async (_name: string, _type: string, _data: Record<string, unknown>) =>
				await Promise.resolve({ id: 'cred-1' }),
		);
		const client = makeClient(createCredential);

		const result = await createOneCredential(client, type, undefined, new Map());

		expect(result.name).toBe(defaultName);
		const [, createdType, data] = createCredential.mock.calls[0];
		expect(createdType).toBe(type);
		expect(Object.keys(data).sort()).toEqual([...fields].sort());
		for (const field of fields) expect(data[field]).toBeTruthy();
	});
});

describe('credential descriptions', () => {
	it('keeps descriptions with their declared credentials outside the secret data', async () => {
		const createCredential = vi
			.fn<N8nClient['createCredential']>()
			.mockResolvedValue({ id: 'cred-1' });
		const client = makeClient(createCredential);

		await createDeclaredCredentials(client, [
			{ type: 'slackApi', name: 'Account A', description: 'Staging checks' },
			{ type: 'slackApi', name: 'Account B', description: 'Production reports' },
			{ type: 'slackApi', name: 'Account C' },
			{ type: 'slackApi', name: 'Account D', description: null },
		]);

		expect(
			createCredential.mock.calls.map(([name, , , description]) => ({ name, description })),
		).toEqual([
			{ name: 'Account A', description: 'Staging checks' },
			{ name: 'Account B', description: 'Production reports' },
			{ name: 'Account C', description: undefined },
			{ name: 'Account D', description: null },
		]);
		for (const [, , data] of createCredential.mock.calls) {
			expect(data).not.toHaveProperty('description');
		}
	});

	it('passes descriptions through custom authentication setup', async () => {
		const createCredential = vi
			.fn<N8nClient['createCredential']>()
			.mockResolvedValue({ id: 'cred-1' });
		await createOneCredential(
			makeClient(createCredential),
			'httpTemplatedCustomAuth',
			'Account A',
			new Map(),
			{
				setupHint: baseHint,
				description: 'Production reports',
			},
		);
		expect(createCredential).toHaveBeenCalledWith(
			'Account A',
			'httpTemplatedCustomAuth',
			expect.any(Object),
			'Production reports',
			undefined,
		);
	});
});

describe('model provider keys', () => {
	const KEY_VARS = [
		'ANTHROPIC_API_KEY',
		'N8N_AI_ANTHROPIC_KEY',
		'EVAL_OPENROUTER_API_KEY',
		'EVAL_OPENAI_API_KEY',
	];

	beforeEach(() => {
		for (const name of KEY_VARS) vi.stubEnv(name, '');
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	const createdData = async (type: string) => {
		const createCredential = vi.fn(
			async (_name: string, _type: string, _data: Record<string, unknown>) =>
				await Promise.resolve({ id: 'cred-1' }),
		);
		await createOneCredential(makeClient(createCredential), type, undefined, new Map());
		return createCredential.mock.calls[0][2];
	};

	it.each([
		['anthropicApi', 'ANTHROPIC_API_KEY', 'test-anthropic-key'],
		['anthropicApi', 'N8N_AI_ANTHROPIC_KEY', 'test-n8n-anthropic-key'],
		['openRouterApi', 'EVAL_OPENROUTER_API_KEY', 'test-openrouter-key'],
		['openAiApi', 'EVAL_OPENAI_API_KEY', 'test-openai-key'],
	])('gives %s the real key from %s', async (type, envVar, key) => {
		vi.stubEnv(envVar, key);

		expect((await createdData(type)).apiKey).toBe(key);
		expect(hasRealCredentialKey(type)).toBe(true);
	});

	it('prefers ANTHROPIC_API_KEY over N8N_AI_ANTHROPIC_KEY', async () => {
		vi.stubEnv('ANTHROPIC_API_KEY', 'test-primary');
		vi.stubEnv('N8N_AI_ANTHROPIC_KEY', 'test-secondary');

		expect((await createdData('anthropicApi')).apiKey).toBe('test-primary');
	});

	it.each(['anthropicApi', 'openRouterApi', 'openAiApi'])(
		'gives %s a placeholder when no key is set',
		async (type) => {
			expect((await createdData(type)).apiKey).toBe('eval-placeholder');
			expect(hasRealCredentialKey(type)).toBe(false);
		},
	);

	it('creates an OpenRouter credential pointing at the OpenRouter API', async () => {
		expect(await createdData('openRouterApi')).toEqual({
			apiKey: 'eval-placeholder',
			url: 'https://openrouter.ai/api/v1',
		});
	});

	it('reports no real key for a type without an env var', () => {
		expect(hasRealCredentialKey('groqApi')).toBe(false);
		expect(hasRealCredentialKey('unknownType')).toBe(false);
	});
});
