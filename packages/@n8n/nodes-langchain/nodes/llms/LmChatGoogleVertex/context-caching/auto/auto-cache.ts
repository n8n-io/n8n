import type { BaseMessage } from '@langchain/core/messages';
import type { ChatGenerationChunk, ChatResult } from '@langchain/core/outputs';
import type { ChatVertexAI } from '@langchain/google-vertexai';
import type {
	IDataObject,
	ISupplyDataFunctions,
	Logger,
	LogMetadata,
	NodeExecutionHint,
} from 'n8n-workflow';

import {
	CACHE_CREATE_LOG_TEXT_MAX,
	CACHE_TOO_SHORT_ERROR_TTL,
	CONTEXT_CACHE_PENDING_METADATA_TTL_SECONDS,
} from './consts';
import type { ContextCacheMetadata, PendingCache } from './context-cache-metadata';
import { isExistingContextCache, isNotCacheable, isPendingCache } from './context-cache-metadata';
import { computeRedisMetadataTtlSecondsForSuccess } from './compute-redis-metadata-ttl';
import { computeConfigHash, type InvocationParamsForHash } from './config-hash';
import {
	CacheMinimumTokenCountError,
	createGoogleContextCache,
	GoogleContextCacheApiError,
} from './google-context-cache-api';
import {
	vertexContextCacheCreateFailedHint,
	vertexContextCacheHitHint,
	vertexContextCacheTooShortFirstHitHint,
	vertexContextCacheTooShortFromStoreHint,
} from './hints';
import type { ContextCacheMetadataStorage } from './storage/context-cache-metadata-storage';
import {
	getFirstSystemMessagePlainText,
	parseExpireMs,
	stripSystemMessages,
	stripToolCallOptions,
} from '../utils';

export {
	CACHE_TOO_SHORT_ERROR_TTL,
	CONTEXT_CACHE_PENDING_METADATA_TTL_SECONDS,
	VERTEX_CONTEXT_CACHE_REDIS_METADATA_SAFETY_BUFFER_SEC,
} from './consts';

export type { ContextCacheMetadataStorage } from './storage/context-cache-metadata-storage';

export type { ContextCacheMetadata } from './context-cache-metadata';

// --- Request body (Google cachedContents.create) -----------------------------------------------

export type VertexContent = {
	role: string;
	parts: Array<{ text?: string }>;
};

function systemInstructionFromMessages(messages: BaseMessage[]): VertexContent | undefined {
	const text = getFirstSystemMessagePlainText(messages);
	if (!text) return undefined;
	return { parts: [{ text }], role: 'system' };
}

function toolConfigFromParams(
	params: InvocationParamsForHash,
): Record<string, unknown> | undefined {
	const choice = params.tool_choice;
	if (choice === undefined || choice === null || typeof choice !== 'string') return undefined;
	if (['auto', 'any', 'none'].includes(choice)) {
		return {
			functionCallingConfig: {
				allowedFunctionNames: params.allowed_function_names as string[] | undefined,
				mode: choice,
			},
		};
	}
	return {
		functionCallingConfig: {
			allowedFunctionNames: [choice],
			mode: 'any',
		},
	};
}

function aiAgentHasCacheableContext(
	systemInstruction: VertexContent | undefined,
	tools: unknown,
): boolean {
	const hasTools = Array.isArray(tools) && tools.length > 0;
	const hasSystemParts = (systemInstruction?.parts?.length ?? 0) > 0;
	return hasSystemParts || hasTools;
}

function buildCachedContentRequestBody(input: {
	messages: BaseMessage[];
	modelResourceName: string;
	params: InvocationParamsForHash;
	ttlSeconds: number;
	displayNameSuffix: string;
}): Record<string, unknown> {
	const systemInstruction = systemInstructionFromMessages(input.messages);
	const tools = input.params.tools;
	const toolConfig = toolConfigFromParams(input.params);
	const body: Record<string, unknown> = {
		displayName: `n8n-vertex-cache-${input.displayNameSuffix.slice(0, 32)}`,
		model: input.modelResourceName,
		ttl: `${input.ttlSeconds}s`,
	};
	if (systemInstruction) body.systemInstruction = systemInstruction;
	if (Array.isArray(tools) && tools.length > 0) body.tools = tools;
	if (toolConfig) body.toolConfig = toolConfig;
	return body;
}

// --- Debug logging for cache create -------------------------------------------------------------

function firstTextFromSystemInstructionBody(systemInstruction: unknown): string | undefined {
	if (!systemInstruction || typeof systemInstruction !== 'object') return undefined;
	const parts = (systemInstruction as { parts?: unknown }).parts;
	if (!Array.isArray(parts)) return undefined;
	for (const part of parts) {
		if (part && typeof part === 'object' && 'text' in part) {
			const text = (part as { text?: unknown }).text;
			if (typeof text === 'string' && text.length > 0) return text;
		}
	}
	return undefined;
}

function summarizeCachedContentCreateBody(body: Record<string, unknown>): LogMetadata {
	const systemText = firstTextFromSystemInstructionBody(body.systemInstruction);
	const tools = body.tools;
	const toolsSummary =
		!Array.isArray(tools) || tools.length === 0
			? { present: false }
			: {
					present: true,
					toolCount: tools.length,
					tools: tools.map((tool, index) => {
						if (tool && typeof tool === 'object' && 'functionDeclarations' in tool) {
							const declarations = (tool as { functionDeclarations?: Array<{ name?: string }> })
								.functionDeclarations;
							return {
								functionCount: declarations?.length ?? 0,
								functionNames: declarations?.map((d) => d.name).filter(Boolean) ?? [],
								index,
							};
						}
						return { index, keys: Object.keys(tool as object) };
					}),
				};

	const preview =
		systemText === undefined
			? undefined
			: systemText.length <= CACHE_CREATE_LOG_TEXT_MAX
				? systemText
				: `${systemText.slice(0, CACHE_CREATE_LOG_TEXT_MAX)}… (${systemText.length} chars total)`;

	return {
		displayName: body.displayName,
		model: body.model,
		toolConfig: body.toolConfig,
		ttl: body.ttl,
		systemInstruction: {
			inRequest: systemText !== undefined,
			textPreview: preview,
		},
		tools: toolsSummary,
	};
}

// --- Model patch (LangChain) -------------------------------------------------------------------

type PatchDeps = {
	contextCacheTtlSeconds: number;
	credentials: IDataObject;
	executionId: string;
	location: string;
	logger: Logger;
	metadataStorage: ContextCacheMetadataStorage;
	modelResourceName: string;
	parentNodeId: string;
	projectId: string;
	workflowId: string;
};

type RunPlan =
	| { cacheName: string; type: 'warm' }
	| { executionHints?: NodeExecutionHint[]; type: 'cold_no_create' }
	| { body: Record<string, unknown>; hash: string; type: 'cold_create' };

async function resolveRunPlan(
	model: ChatVertexAI,
	messages: BaseMessage[],
	options: object,
	deps: PatchDeps,
): Promise<RunPlan> {
	const params = model.invocationParams(options as never) as InvocationParamsForHash;
	const hash = computeConfigHash(messages, deps.location, params);

	const initialMeta = await deps.metadataStorage.read(hash);
	const nowMs = Date.now();
	const metaBase = {
		executionId: deps.executionId,
		hashPrefix: hash.slice(0, 8),
		parentNodeId: deps.parentNodeId,
		workflowId: deps.workflowId,
	};

	let meta = initialMeta;

	if (meta === null) {
		deps.logger.debug('VertexContextCache: cache_miss (no stored metadata)', metaBase);
	} else if (isPendingCache(meta)) {
		deps.logger.debug('VertexContextCache: cache_skip (pending create)', metaBase);
		return { type: 'cold_no_create' };
	} else if (isNotCacheable(meta)) {
		if (parseExpireMs(meta.retryNotBeforeIso) <= nowMs) {
			await deps.metadataStorage.delete(hash);
			meta = null;
			deps.logger.debug('VertexContextCache: cache_miss (not_cacheable window expired)', metaBase);
		} else {
			deps.logger.debug('VertexContextCache: cache_skip (not_cacheable in store)', metaBase);
			return {
				type: 'cold_no_create',
				executionHints: [vertexContextCacheTooShortFromStoreHint()],
			};
		}
	} else if (isExistingContextCache(meta)) {
		if (parseExpireMs(meta.expireTime) <= nowMs) {
			await deps.metadataStorage.delete(hash);
			meta = null;
			deps.logger.debug('VertexContextCache: cache_miss (expired)', metaBase);
		} else if (meta.location !== deps.location) {
			const storedLocation = meta.location;
			await deps.metadataStorage.delete(hash);
			meta = null;
			deps.logger.debug('VertexContextCache: cache_miss_binding (location mismatch)', {
				...metaBase,
				expectedLocation: deps.location,
				storedLocation,
			});
		} else if (meta.model !== deps.modelResourceName) {
			const storedModel = meta.model;
			await deps.metadataStorage.delete(hash);
			meta = null;
			deps.logger.debug('VertexContextCache: cache_miss_binding (model mismatch)', {
				...metaBase,
				expectedModel: deps.modelResourceName,
				storedModel,
			});
		} else {
			deps.logger.debug('VertexContextCache: cache_hit', {
				...metaBase,
				cacheNameSuffix: meta.cacheName.split('/').pop(),
			});
			return { cacheName: meta.cacheName, type: 'warm' };
		}
	} else {
		await deps.metadataStorage.delete(hash);
		meta = null;
		deps.logger.debug('VertexContextCache: cache_miss (invalid stored metadata)', metaBase);
	}

	const body = buildCachedContentRequestBody({
		displayNameSuffix: hash,
		messages,
		modelResourceName: deps.modelResourceName,
		params,
		ttlSeconds: deps.contextCacheTtlSeconds,
	});

	if (
		!aiAgentHasCacheableContext(body.systemInstruction as VertexContent | undefined, body.tools)
	) {
		deps.logger.debug(
			'VertexContextCache: cold path without cacheable prefix (skip create)',
			metaBase,
		);
		return { type: 'cold_no_create' };
	}

	return {
		body,
		hash,
		type: 'cold_create',
	};
}

function patchInvocationParamsForCachedContent(model: ChatVertexAI, cacheName: string): () => void {
	const originalInvocationParams = model.invocationParams.bind(model);
	model.invocationParams = (callOptions) => {
		const merged = originalInvocationParams(callOptions) as Record<string, unknown>;
		const next: Record<string, unknown> = { ...merged };
		delete next.tools;
		delete next.tool_choice;
		delete next.allowed_function_names;
		next.cachedContent = cacheName;
		return next;
	};
	return () => {
		model.invocationParams = originalInvocationParams;
	};
}

async function withCachedContentBinding(
	model: ChatVertexAI,
	cacheName: string,
	fn: () => Promise<ChatResult>,
): Promise<ChatResult> {
	const restore = patchInvocationParamsForCachedContent(model, cacheName);
	try {
		return await fn();
	} finally {
		restore();
	}
}

async function* streamWithCachedContentBinding(
	model: ChatVertexAI,
	cacheName: string,
	stream: AsyncGenerator<ChatGenerationChunk>,
): AsyncGenerator<ChatGenerationChunk> {
	const restore = patchInvocationParamsForCachedContent(model, cacheName);
	try {
		for await (const chunk of stream) {
			yield chunk;
		}
	} finally {
		restore();
	}
}

async function writeExistingMetadata(
	storage: ContextCacheMetadataStorage,
	hash: string,
	fields: {
		cacheName: string;
		expireTime: string;
		location: string;
		model: string;
	},
	createDurationMs: number,
): Promise<void> {
	const ttlSeconds = computeRedisMetadataTtlSecondsForSuccess({
		createDurationMs,
		expireTimeIso: fields.expireTime,
	});
	const metadata: ContextCacheMetadata = { kind: 'existing', ...fields };
	await storage.write(hash, metadata, { ttlSeconds });
}

async function writeNotCacheableTooShort(
	storage: ContextCacheMetadataStorage,
	hash: string,
): Promise<void> {
	const retryNotBeforeIso = new Date(Date.now() + CACHE_TOO_SHORT_ERROR_TTL * 1000).toISOString();
	await storage.write(
		hash,
		{
			kind: 'not_cacheable',
			reason: 'CACHE_TOO_SHORT',
			retryNotBeforeIso,
		},
		{ ttlSeconds: CACHE_TOO_SHORT_ERROR_TTL },
	);
}

/**
 * Fire-and-forget: completes `cachedContents.create` and updates Redis metadata (or deletes on hard failure).
 */
function scheduleContextCacheCreate(
	plan: Extract<RunPlan, { type: 'cold_create' }>,
	ctx: ISupplyDataFunctions,
	deps: PatchDeps,
): void {
	void (async () => {
		deps.logger.debug('VertexContextCache: cache_create_start', {
			cachedContentsRequest: summarizeCachedContentCreateBody(plan.body),
			executionId: deps.executionId,
			hashPrefix: plan.hash.slice(0, 8),
			parentNodeId: deps.parentNodeId,
			workflowId: deps.workflowId,
		});
		try {
			const createStartedMs = Date.now();
			const result = await createGoogleContextCache(ctx, deps.credentials, {
				body: plan.body,
				location: deps.location,
				projectId: deps.projectId,
			});
			const createDurationMs = Date.now() - createStartedMs;
			await writeExistingMetadata(
				deps.metadataStorage,
				plan.hash,
				{
					cacheName: result.name,
					expireTime: result.expireTime,
					location: deps.location,
					model: deps.modelResourceName,
				},
				createDurationMs,
			);
			deps.logger.debug('VertexContextCache: cache_create_ok (metadata storage updated)', {
				cacheNameSuffix: result.name.split('/').pop(),
				executionId: deps.executionId,
				hashPrefix: plan.hash.slice(0, 8),
				parentNodeId: deps.parentNodeId,
				workflowId: deps.workflowId,
			});
		} catch (caught) {
			if (caught instanceof CacheMinimumTokenCountError) {
				deps.logger.debug('VertexContextCache: cache_create_error', {
					executionId: deps.executionId,
					hashPrefix: plan.hash.slice(0, 8),
					message: caught.message,
					parentNodeId: deps.parentNodeId,
					status: caught.status,
					workflowId: deps.workflowId,
				});
				await writeNotCacheableTooShort(deps.metadataStorage, plan.hash);
				ctx.addExecutionHints(vertexContextCacheTooShortFirstHitHint());
			} else if (caught instanceof GoogleContextCacheApiError) {
				deps.logger.debug('VertexContextCache: cache_create_error', {
					executionId: deps.executionId,
					hashPrefix: plan.hash.slice(0, 8),
					message: caught.message,
					parentNodeId: deps.parentNodeId,
					status: caught.status,
					workflowId: deps.workflowId,
				});
				await deps.metadataStorage.delete(plan.hash);
				ctx.addExecutionHints(vertexContextCacheCreateFailedHint(caught.message));
			} else {
				const message =
					caught instanceof Error && caught.message !== ''
						? caught.message
						: 'Vertex cachedContents create failed with an unexpected error';
				deps.logger.debug('VertexContextCache: cache_create_error', {
					executionId: deps.executionId,
					hashPrefix: plan.hash.slice(0, 8),
					message,
					parentNodeId: deps.parentNodeId,
					workflowId: deps.workflowId,
				});
				await deps.metadataStorage.delete(plan.hash);
				ctx.addExecutionHints(vertexContextCacheCreateFailedHint(message));
			}
		}
	})();
}

/**
 * Patches {@link ChatVertexAI} so explicit context caches are created and reused per parent agent.
 * Safe with {@link ChatVertexAI.bindTools} because the same instance is invoked by the bound runnable.
 */
export function applyVertexAutoContextCachePatch(
	model: ChatVertexAI,
	ctx: ISupplyDataFunctions,
	deps: Omit<PatchDeps, 'executionId' | 'logger' | 'modelResourceName' | 'workflowId'> & {
		modelName: string;
	},
): void {
	const workflowId = ctx.getWorkflow().id ?? 'unknown';
	const executionId = ctx.getExecutionId();
	const modelResourceName = `projects/${deps.projectId}/locations/${deps.location}/publishers/google/models/${deps.modelName}`;

	const fullDeps: PatchDeps = {
		...deps,
		executionId,
		logger: ctx.logger,
		modelResourceName,
		workflowId,
	};

	const originalGenerate = model._generate.bind(model) as (
		messages: BaseMessage[],
		options: object,
		runManager?: unknown,
	) => Promise<ChatResult>;

	const originalStream = model._streamResponseChunks.bind(model) as (
		messages: BaseMessage[],
		options: object,
		runManager?: unknown,
	) => AsyncGenerator<ChatGenerationChunk>;

	model._generate = async (messages, options, runManager) => {
		const plan = await resolveRunPlan(model, messages, options as object, fullDeps);
		if (plan.type === 'warm') {
			ctx.addExecutionHints(vertexContextCacheHitHint(plan.cacheName));
			return await withCachedContentBinding(model, plan.cacheName, async () => {
				return await originalGenerate(
					stripSystemMessages(messages),
					stripToolCallOptions(options as object),
					runManager,
				);
			});
		}
		if (plan.type === 'cold_no_create') {
			if (plan.executionHints?.length) ctx.addExecutionHints(...plan.executionHints);
			return await originalGenerate(messages, options, runManager);
		}

		const pending: PendingCache = {
			kind: 'pending',
			startedAtIso: new Date().toISOString(),
		};
		const acquired = await fullDeps.metadataStorage.writeIfAbsent(plan.hash, pending, {
			ttlSeconds: CONTEXT_CACHE_PENDING_METADATA_TTL_SECONDS,
		});
		if (acquired) {
			scheduleContextCacheCreate(plan, ctx, fullDeps);
		}

		return await originalGenerate(messages, options, runManager);
	};

	model._streamResponseChunks = async function* (messages, options, runManager) {
		const plan = await resolveRunPlan(model, messages, options as object, fullDeps);
		if (plan.type === 'warm') {
			ctx.addExecutionHints(vertexContextCacheHitHint(plan.cacheName));
			yield* streamWithCachedContentBinding(
				model,
				plan.cacheName,
				originalStream(
					stripSystemMessages(messages),
					stripToolCallOptions(options as object),
					runManager,
				),
			);
			return;
		}
		if (plan.type === 'cold_no_create') {
			if (plan.executionHints?.length) ctx.addExecutionHints(...plan.executionHints);
			yield* originalStream(messages, options, runManager);
			return;
		}

		const pending: PendingCache = {
			kind: 'pending',
			startedAtIso: new Date().toISOString(),
		};
		const acquired = await fullDeps.metadataStorage.writeIfAbsent(plan.hash, pending, {
			ttlSeconds: CONTEXT_CACHE_PENDING_METADATA_TTL_SECONDS,
		});
		if (acquired) {
			scheduleContextCacheCreate(plan, ctx, fullDeps);
		}

		yield* originalStream(messages, options, runManager);
	};
}
