/**
 * Vertex auto context cache — behaviour covered by this file:
 * - Cold path creates metadata (TTL in Google body); fire-and-forget create.
 * - Warm path reuses metadata (no second create).
 * - Expired metadata dropped then create again.
 * - CACHE_TOO_SHORT → not_cacheable; next run skips create until window expires.
 * - Human-only cold path: no create, storage unchanged for that hash.
 * - Create failure (non too-short): metadata key removed so next run can retry.
 * - Parallel cold paths: at most one Google create (writeIfAbsent).
 * - While pending, subsequent runs use uncached path without scheduling another create.
 */
import type { BaseMessage } from '@langchain/core/messages';
import type { ChatVertexAI } from '@langchain/google-vertexai';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { applyVertexAutoContextCachePatch } from './auto-cache';
import { computeConfigHash, type InvocationParamsForHash } from './config-hash';
import {
	type ContextCacheMetadata,
	parseContextCacheMetadata,
	serializeContextCacheMetadata,
} from './context-cache-metadata';
import { CacheMinimumTokenCountError, createGoogleContextCache } from './google-context-cache-api';
import type { ContextCacheMetadataStorage } from './storage/context-cache-metadata-storage';

jest.mock('./google-context-cache-api', () => ({
	...jest.requireActual<typeof import('./google-context-cache-api')>('./google-context-cache-api'),
	createGoogleContextCache: jest.fn(),
}));

const mockedCreateGoogleContextCache = jest.mocked(createGoogleContextCache);

/** Lets scheduled `void (async () => { ... create ... })()` finish in tests. */
async function flushBackgroundWork(): Promise<void> {
	await new Promise<void>((resolve) => {
		setImmediate(resolve);
	});
	await new Promise<void>((resolve) => {
		setImmediate(resolve);
	});
}

function createInMemoryMetadataStorage(
	initial?: Record<string, ContextCacheMetadata>,
): ContextCacheMetadataStorage {
	const map = new Map<string, { expiresAtMs: number; meta: ContextCacheMetadata }>();

	if (initial) {
		for (const [h, meta] of Object.entries(initial)) {
			map.set(h, { expiresAtMs: Date.now() + 86_400_000, meta });
		}
	}

	return {
		async delete(hash: string) {
			map.delete(hash);
		},
		async read(hash: string) {
			const row = map.get(hash);
			if (!row) return null;
			if (Date.now() >= row.expiresAtMs) {
				map.delete(hash);
				return null;
			}
			return row.meta;
		},
		async write(hash: string, meta: ContextCacheMetadata, options: { ttlSeconds: number }) {
			map.set(hash, {
				expiresAtMs: Date.now() + Math.max(1, options.ttlSeconds) * 1000,
				meta,
			});
		},
		async writeIfAbsent(hash: string, meta: ContextCacheMetadata, options: { ttlSeconds: number }) {
			const row = map.get(hash);
			const now = Date.now();
			if (row !== undefined && now < row.expiresAtMs) {
				return false;
			}
			map.set(hash, {
				expiresAtMs: now + Math.max(1, options.ttlSeconds) * 1000,
				meta,
			});
			return true;
		},
	};
}

const mockNodeForCache: INode = {
	id: 'vertex-model-node',
	name: 'Google Vertex Chat Model',
	type: 'n8n-nodes-langchain.lmChatGoogleVertex',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const parentNodeId = 'parent1';
const projectId = 'p';
const location = 'us-central1';
const modelName = 'gemini-2.5-flash';
const modelResourceName = `projects/${projectId}/locations/${location}/publishers/google/models/${modelName}`;

const systemAndUserMessages = [
	{ content: 'stable system prompt', type: 'system' },
	{ content: 'hello', type: 'human' },
] as unknown as BaseMessage[];

const humanOnlyMessages = [{ content: 'hello', type: 'human' }] as unknown as BaseMessage[];

const paramsWithTools: InvocationParamsForHash = {
	allowed_function_names: ['math'],
	model: modelResourceName,
	tool_choice: 'auto',
	tools: [{ functionDeclarations: [{ name: 'math' }] }],
};

const paramsNoTools: InvocationParamsForHash = {
	model: modelResourceName,
};

type PatchedModel = ChatVertexAI & {
	_generate: jest.Mock;
	invocationParams: jest.Mock;
};

function createModel(
	invocationParamsReturn: InvocationParamsForHash,
	innerGenerate?: jest.Mock,
): PatchedModel {
	return {
		_generate: innerGenerate ?? jest.fn().mockResolvedValue({ generations: [] }),
		_streamResponseChunks: jest.fn(),
		invocationParams: jest.fn().mockReturnValue(invocationParamsReturn),
	} as unknown as PatchedModel;
}

function createContext(): jest.Mocked<ISupplyDataFunctions> {
	return {
		addExecutionHints: jest.fn(),
		getExecutionId: jest.fn().mockReturnValue('exec-1'),
		getNode: jest.fn().mockReturnValue(mockNodeForCache),
		getWorkflow: jest.fn().mockReturnValue({ id: 'wf-1' }),
		logger: { debug: jest.fn() },
	} as unknown as jest.Mocked<ISupplyDataFunctions>;
}

function applyPatch(
	model: PatchedModel,
	ctx: jest.Mocked<ISupplyDataFunctions>,
	metadataStorage: ContextCacheMetadataStorage,
	ttl = 86400,
) {
	applyVertexAutoContextCachePatch(model, ctx, {
		contextCacheTtlSeconds: ttl,
		credentials: {},
		location,
		metadataStorage,
		modelName,
		parentNodeId,
		projectId,
	});
}

describe('context-cache-metadata JSON', () => {
	it('round-trips existing / not_cacheable / pending', () => {
		const samples: ContextCacheMetadata[] = [
			{
				kind: 'existing',
				cacheName: 'projects/x/locations/y/cachedContents/z',
				expireTime: '2099-01-01T00:00:00.000Z',
				location: 'us-central1',
				model: modelResourceName,
			},
			{
				kind: 'not_cacheable',
				reason: 'CACHE_TOO_SHORT',
				retryNotBeforeIso: '2099-01-01T00:00:00.000Z',
			},
			{ kind: 'pending', startedAtIso: '2024-01-01T00:00:00.000Z' },
			{ kind: 'pending' },
		];
		for (const s of samples) {
			expect(parseContextCacheMetadata(serializeContextCacheMetadata(s))).toEqual(s);
		}
	});

	it('rejects invalid JSON and unknown kinds', () => {
		expect(parseContextCacheMetadata('')).toBeNull();
		expect(parseContextCacheMetadata('{"kind":"nope"}')).toBeNull();
		expect(parseContextCacheMetadata('{"kind":"not_cacheable"}')).toBeNull();
	});
});

describe('Vertex auto context cache', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockedCreateGoogleContextCache.mockResolvedValue({
			expireTime: '2099-01-01T00:00:00.000Z',
			name: 'projects/p/locations/us-central1/cachedContents/new-cache',
		});
	});

	describe('cold hash: create + persist with TTL in request body', () => {
		it('calls Google create and stores existing metadata for the config hash', async () => {
			const metadataStorage = createInMemoryMetadataStorage();
			const ctx = createContext();
			const ttl = 7200;
			const model = createModel(paramsWithTools);
			applyPatch(model, ctx, metadataStorage, ttl);

			await model._generate(systemAndUserMessages, {
				allowed_function_names: ['math'],
				tool_choice: 'auto',
				tools: paramsWithTools.tools,
			});
			await flushBackgroundWork();

			expect(mockedCreateGoogleContextCache).toHaveBeenCalledTimes(1);
			const body = mockedCreateGoogleContextCache.mock.calls[0][2].body;
			expect(body.ttl).toBe(`${ttl}s`);

			const hash = computeConfigHash(systemAndUserMessages, location, paramsWithTools);
			const meta = await metadataStorage.read(hash);
			expect(meta?.kind).toBe('existing');
			if (meta?.kind === 'existing') {
				expect(meta.cacheName).toContain('new-cache');
			}
		});
	});

	describe('warm: reuse stored cache, no new create', () => {
		it('does not call create when a non-expired existing entry matches the hash', async () => {
			const hash = computeConfigHash(systemAndUserMessages, location, paramsWithTools);
			const warmName = 'projects/p/locations/us-central1/cachedContents/warm-cache';
			const metadataStorage = createInMemoryMetadataStorage({
				[hash]: {
					kind: 'existing',
					cacheName: warmName,
					expireTime: '2099-01-01T00:00:00.000Z',
					location,
					model: modelResourceName,
				},
			});
			const ctx = createContext();
			const innerGenerate = jest.fn().mockResolvedValue({ generations: [] });
			const model = createModel(paramsWithTools, innerGenerate);
			applyPatch(model, ctx, metadataStorage);

			await model._generate(systemAndUserMessages, {
				allowed_function_names: ['math'],
				tool_choice: 'auto',
				tools: paramsWithTools.tools,
			});

			expect(mockedCreateGoogleContextCache).not.toHaveBeenCalled();
			expect(innerGenerate).toHaveBeenCalledWith(
				[{ content: 'hello', type: 'human' }],
				{},
				undefined,
			);
			expect(ctx.addExecutionHints).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining(warmName),
					type: 'info',
				}),
			);
		});
	});

	describe('expired success: create again', () => {
		it('calls create after dropping an expired existing entry for the same hash', async () => {
			const hash = computeConfigHash(systemAndUserMessages, location, paramsWithTools);
			const metadataStorage = createInMemoryMetadataStorage({
				[hash]: {
					kind: 'existing',
					cacheName: 'projects/p/locations/us-central1/cachedContents/old-cache',
					expireTime: '2000-01-01T00:00:00.000Z',
					location,
					model: modelResourceName,
				},
			});
			const ctx = createContext();
			const model = createModel(paramsWithTools);
			applyPatch(model, ctx, metadataStorage);

			await model._generate(systemAndUserMessages, {
				allowed_function_names: ['math'],
				tool_choice: 'auto',
				tools: paramsWithTools.tools,
			});
			await flushBackgroundWork();

			expect(mockedCreateGoogleContextCache).toHaveBeenCalledTimes(1);
			const meta = await metadataStorage.read(hash);
			expect(meta?.kind).toBe('existing');
			if (meta?.kind === 'existing') {
				expect(meta.cacheName).toContain('new-cache');
			}
		});
	});

	describe('minimum token count: persist not_cacheable; later run skips create', () => {
		it('stores not_cacheable per hash and avoids create on the next run', async () => {
			const metadataStorage = createInMemoryMetadataStorage();
			const ctx = createContext();
			const model = createModel(paramsWithTools);
			applyPatch(model, ctx, metadataStorage);

			mockedCreateGoogleContextCache.mockRejectedValueOnce(
				new CacheMinimumTokenCountError(
					'The cached content is of 2 tokens. The minimum token count to start caching is 1024.',
					400,
				),
			);

			await model._generate(systemAndUserMessages, {
				allowed_function_names: ['math'],
				tool_choice: 'auto',
				tools: paramsWithTools.tools,
			});
			await flushBackgroundWork();

			const hash = computeConfigHash(systemAndUserMessages, location, paramsWithTools);
			const meta = await metadataStorage.read(hash);
			expect(meta?.kind).toBe('not_cacheable');

			jest.clearAllMocks();
			const innerGenerate = jest.fn().mockResolvedValue({ generations: [] });
			const model2 = createModel(paramsWithTools, innerGenerate);
			applyPatch(model2, ctx, metadataStorage);

			await model2._generate(systemAndUserMessages, {
				allowed_function_names: ['math'],
				tool_choice: 'auto',
				tools: paramsWithTools.tools,
			});

			expect(mockedCreateGoogleContextCache).not.toHaveBeenCalled();
			expect(ctx.addExecutionHints).toHaveBeenCalled();
			expect(innerGenerate).toHaveBeenCalledWith(
				systemAndUserMessages,
				expect.any(Object),
				undefined,
			);
		});
	});

	describe('human-only cold path', () => {
		it('does not call create when there is no cacheable context and storage is empty', async () => {
			const metadataStorage = createInMemoryMetadataStorage();
			const ctx = createContext();
			const innerGenerate = jest.fn().mockResolvedValue({ generations: [] });
			const model = createModel(paramsNoTools, innerGenerate);
			applyPatch(model, ctx, metadataStorage);

			await model._generate(humanOnlyMessages, {});

			expect(mockedCreateGoogleContextCache).not.toHaveBeenCalled();
			const hash = computeConfigHash(humanOnlyMessages, location, paramsNoTools);
			expect(await metadataStorage.read(hash)).toBeNull();
		});
	});

	describe('create failure: model still generates with full messages (no cache path)', () => {
		it('runs original generate with full messages when create throws', async () => {
			const metadataStorage = createInMemoryMetadataStorage();
			const ctx = createContext();
			mockedCreateGoogleContextCache.mockRejectedValue(new Error('network down'));
			const innerGenerate = jest.fn().mockResolvedValue({ generations: [] });
			const model = createModel(paramsWithTools, innerGenerate);
			applyPatch(model, ctx, metadataStorage);

			const options = {
				allowed_function_names: ['math'],
				tool_choice: 'auto',
				tools: paramsWithTools.tools,
			};
			await model._generate(systemAndUserMessages, options);
			await flushBackgroundWork();

			expect(innerGenerate).toHaveBeenCalledWith(systemAndUserMessages, options, undefined);
			expect(ctx.addExecutionHints).toHaveBeenCalled();
		});
	});

	describe('parallel cold paths', () => {
		it('runs at most one Google create for the same hash', async () => {
			const metadataStorage = createInMemoryMetadataStorage();
			const ctx = createContext();
			let resolveCreate!: () => void;
			const createGate = new Promise<void>((r) => {
				resolveCreate = r;
			});
			mockedCreateGoogleContextCache.mockImplementation(() =>
				createGate.then(() =>
					Promise.resolve({
						expireTime: '2099-01-01T00:00:00.000Z',
						name: 'projects/p/locations/us-central1/cachedContents/shared',
					}),
				),
			);

			const inner = jest.fn().mockResolvedValue({ generations: [] });
			const modelA = createModel(paramsWithTools, inner);
			const modelB = createModel(paramsWithTools, inner);
			applyPatch(modelA, ctx, metadataStorage);
			applyPatch(modelB, ctx, metadataStorage);

			const opts = {
				allowed_function_names: ['math'] as string[],
				tool_choice: 'auto',
				tools: paramsWithTools.tools,
			};
			const g1 = modelA._generate(systemAndUserMessages, opts);
			const g2 = modelB._generate(systemAndUserMessages, opts);
			await Promise.all([g1, g2]);

			expect(mockedCreateGoogleContextCache).toHaveBeenCalledTimes(1);

			resolveCreate();
			await flushBackgroundWork();

			const hash = computeConfigHash(systemAndUserMessages, location, paramsWithTools);
			expect((await metadataStorage.read(hash))?.kind).toBe('existing');
		});
	});

	describe('pending metadata', () => {
		it('skips scheduling another create while pending', async () => {
			const hash = computeConfigHash(systemAndUserMessages, location, paramsWithTools);
			const metadataStorage = createInMemoryMetadataStorage({
				[hash]: { kind: 'pending' },
			});
			const ctx = createContext();
			const model = createModel(paramsWithTools);
			applyPatch(model, ctx, metadataStorage);

			await model._generate(systemAndUserMessages, {
				allowed_function_names: ['math'],
				tool_choice: 'auto',
				tools: paramsWithTools.tools,
			});

			expect(mockedCreateGoogleContextCache).not.toHaveBeenCalled();
		});
	});
});
