/**
 * read_config / write_config / patch_config — the core agent-config mutation
 * tools. Validation, freshness (hash) checks, RFC-6902 patching, `$fromAI`
 * dynamic-selector enforcement, and native-web-search reject/normalize are
 * reimplemented here; only the snapshot read and persist go through
 * `context.agentBuilderService`.
 */
import { Tool } from '@n8n/agents';
import {
	formatZodErrors,
	RunnableAgentJsonConfigSchema,
	sanitizeAgentJsonConfig,
	tryParseConfigJson,
	type AgentJsonConfig,
} from '@n8n/api-types';
import { applyPatch, deepClone, validate, type Operation } from 'fast-json-patch';
import { z } from 'zod';

import {
	rejectIfDynamicSelectorUsesFromAi,
	rejectIfEmptyInstructions,
	STALE_CONFIG_ERROR,
	withConfigHash,
	type HashedSnapshot,
} from './config-helpers';
import {
	applyNativeWebSearchBuilderDefaults,
	rejectIfUnsupportedNativeWebSearch,
} from './native-web-search';
import type { InstanceAiAgentBuilderService, InstanceAiContext } from '../../types';
import { AGENT_BUILDER_TOOL_IDS } from '../tool-ids';

interface AgentBuilderDeps {
	service: InstanceAiAgentBuilderService;
	agentId: string;
	projectId: string;
	nodeTypesProvider: InstanceAiContext['nodeTypesProvider'];
}

/** Resolve the agent-builder deps from context, or null when not configured. */
function resolveDeps(context: InstanceAiContext): AgentBuilderDeps | null {
	if (!context.agentBuilderService || !context.agentBuilderTarget) return null;
	return {
		service: context.agentBuilderService,
		agentId: context.agentBuilderTarget.agentId,
		projectId: context.agentBuilderTarget.projectId,
		nodeTypesProvider: context.nodeTypesProvider,
	};
}

const NOT_CONFIGURED = {
	ok: false as const,
	errors: [
		{
			path: '(root)',
			message:
				'No agent is being built yet. Call create_agent first to create one (or open an existing agent).',
		},
	],
};

/** JSON value — required (no `undefined`) so patch `value` matches `Operation`. */
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.array(jsonValueSchema),
		z.record(jsonValueSchema),
	]),
);

/** RFC-6902 patch operations, validated structurally so no `as` cast is needed. */
const jsonPatchOperationSchema = z.discriminatedUnion('op', [
	z.object({ op: z.literal('add'), path: z.string(), value: jsonValueSchema }),
	z.object({ op: z.literal('remove'), path: z.string() }),
	z.object({ op: z.literal('replace'), path: z.string(), value: jsonValueSchema }),
	z.object({ op: z.literal('move'), from: z.string(), path: z.string() }),
	z.object({ op: z.literal('copy'), from: z.string(), path: z.string() }),
	z.object({ op: z.literal('test'), path: z.string(), value: jsonValueSchema }),
]);
const jsonPatchSchema = z.array(jsonPatchOperationSchema);

export const readConfigInputSchema = z.object({});

const baseConfigHashSchema = z
	.string()
	.nullable()
	.describe(
		'configHash from the immediately preceding read_config result; null only if no config exists',
	);

export const writeConfigInputSchema = z.object({
	json: z.string().describe('Complete agent configuration as a JSON string'),
	baseConfigHash: baseConfigHashSchema,
});

export const patchConfigInputSchema = z.object({
	operations: z.string().describe('RFC 6902 JSON Patch operations array as a JSON string'),
	baseConfigHash: baseConfigHashSchema,
});

async function getHashedSnapshot(deps: AgentBuilderDeps): Promise<HashedSnapshot> {
	return withConfigHash(await deps.service.getConfigSnapshot(deps.agentId, deps.projectId));
}

/**
 * Run the shared validation gauntlet on a candidate config and persist it.
 * Returns the success/failure tool response.
 */
async function validateAndPersist(
	deps: AgentBuilderDeps,
	candidate: AgentJsonConfig,
	previousConfig: AgentJsonConfig | null,
	failureStage: string,
) {
	const empty = rejectIfEmptyInstructions(candidate);
	if (empty) return { ok: false as const, stage: failureStage, errors: empty.errors };

	const unsupportedWebSearch = rejectIfUnsupportedNativeWebSearch(candidate);
	if (unsupportedWebSearch) {
		return { ok: false as const, stage: failureStage, errors: unsupportedWebSearch.errors };
	}

	const dynamicSelector = rejectIfDynamicSelectorUsesFromAi(
		candidate,
		previousConfig,
		deps.nodeTypesProvider,
	);
	if (dynamicSelector) {
		return { ok: false as const, stage: failureStage, errors: dynamicSelector.errors };
	}

	// Normalize native web-search provider tools so builder-saved configs are deterministic.
	const normalized = applyNativeWebSearchBuilderDefaults(candidate);

	try {
		const result = await deps.service.updateConfig(deps.agentId, deps.projectId, normalized);
		return { ok: true as const, ...withConfigHash(result) };
	} catch (e) {
		return {
			ok: false as const,
			stage: failureStage,
			errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
		};
	}
}

/** read_config handler — usable standalone or via the agent_builder router. */
export async function handleReadConfig(context: InstanceAiContext) {
	const deps = resolveDeps(context);
	if (!deps) return NOT_CONFIGURED;
	try {
		return { ok: true as const, ...(await getHashedSnapshot(deps)) };
	} catch (e) {
		return {
			ok: false as const,
			errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
		};
	}
}

/** write_config handler — usable standalone or via the agent_builder router. */
export async function handleWriteConfig(
	context: InstanceAiContext,
	input: z.infer<typeof writeConfigInputSchema>,
) {
	const deps = resolveDeps(context);
	if (!deps) return NOT_CONFIGURED;

	const parsed = tryParseConfigJson(input.json);
	if (!parsed.ok) return { ok: false as const, errors: parsed.errors };

	let snapshot: HashedSnapshot;
	try {
		snapshot = await getHashedSnapshot(deps);
	} catch (e) {
		return {
			ok: false as const,
			stage: 'stale',
			errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
		};
	}
	if (input.baseConfigHash !== snapshot.configHash) {
		return { ok: false as const, stage: 'stale', errors: [STALE_CONFIG_ERROR], ...snapshot };
	}

	const zodResult = RunnableAgentJsonConfigSchema.safeParse(sanitizeAgentJsonConfig(parsed.data));
	if (!zodResult.success) {
		return { ok: false as const, errors: formatZodErrors(zodResult.error) };
	}

	return await validateAndPersist(deps, zodResult.data, snapshot.config, 'schema');
}

/** patch_config handler — usable standalone or via the agent_builder router. */
export async function handlePatchConfig(
	context: InstanceAiContext,
	input: z.infer<typeof patchConfigInputSchema>,
) {
	const deps = resolveDeps(context);
	if (!deps) return NOT_CONFIGURED;

	const parsedJson = tryParseConfigJson(input.operations);
	if (!parsedJson.ok) return { ok: false as const, stage: 'parse', errors: parsedJson.errors };
	const parsedOps = jsonPatchSchema.safeParse(parsedJson.data);
	if (!parsedOps.success) {
		return { ok: false as const, stage: 'parse', errors: formatZodErrors(parsedOps.error) };
	}
	const ops: Operation[] = parsedOps.data;

	let snapshot: HashedSnapshot;
	try {
		snapshot = await getHashedSnapshot(deps);
	} catch (e) {
		return {
			ok: false as const,
			stage: 'stale',
			errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
		};
	}
	if (input.baseConfigHash !== snapshot.configHash) {
		return { ok: false as const, stage: 'stale', errors: [STALE_CONFIG_ERROR], ...snapshot };
	}
	if (!snapshot.config) {
		return {
			ok: false as const,
			stage: 'patch',
			errors: [{ path: '(root)', message: 'Agent has no JSON config yet.' }],
		};
	}

	let patched: unknown;
	try {
		const patchError = validate(ops, snapshot.config);
		if (patchError) {
			// `JsonPatchError.operation` is typed `any` upstream — parse defensively.
			const failedOp = z.object({ path: z.string() }).safeParse(patchError.operation);
			return {
				ok: false as const,
				stage: 'patch',
				errors: [
					{
						path: failedOp.success ? failedOp.data.path : '(root)',
						message: patchError.message ?? 'Invalid patch operation',
					},
				],
			};
		}

		patched = applyPatch(deepClone(snapshot.config), ops).newDocument;
	} catch (e) {
		// `validate`/`applyPatch` return a JsonPatchError for RFC-6902 violations but
		// re-throw anything else — notably the TypeError from the built-in
		// __proto__/constructor prototype-pollution guard. Surface those as a
		// structured patch error instead of letting them crash the handler.
		return {
			ok: false as const,
			stage: 'patch',
			errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
		};
	}

	const zodResult = RunnableAgentJsonConfigSchema.safeParse(sanitizeAgentJsonConfig(patched));
	if (!zodResult.success) {
		return { ok: false as const, stage: 'schema', errors: formatZodErrors(zodResult.error) };
	}

	return await validateAndPersist(deps, zodResult.data, snapshot.config, 'schema');
}

export function createReadConfigTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.READ_CONFIG)
		.description(
			'Read the latest persisted agent configuration and freshness metadata. ' +
				'Returns { ok: true, config, configHash, updatedAt, versionId }. ' +
				'Call this before every write_config or patch_config and use configHash as baseConfigHash.',
		)
		.input(readConfigInputSchema)
		.handler(async () => await handleReadConfig(context))
		.build();
}

export function createWriteConfigTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.WRITE_CONFIG)
		.description(
			'Create or replace the agent configuration by writing a complete JSON string. ' +
				'Requires baseConfigHash from the immediately preceding read_config result, or from a stale retry response. ' +
				'Do not use a configHash copied from the prompt snapshot. ' +
				'Returns { ok: true, config, configHash, updatedAt, versionId } on success or ' +
				'{ ok: false, stage, errors } with path, message fields on failure.',
		)
		.input(writeConfigInputSchema)
		.handler(async (input) => await handleWriteConfig(context, input))
		.build();
}

export function createPatchConfigTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.PATCH_CONFIG)
		.description(
			'Apply RFC 6902 JSON Patch operations to the current agent configuration. ' +
				'Pass an array of patch operations as a JSON string. ' +
				'Requires baseConfigHash from the immediately preceding read_config result, or from a stale retry response. ' +
				'Do not use a configHash copied from the prompt snapshot. ' +
				'Supported ops: add, remove, replace, move, copy, test. ' +
				'Returns { ok: true, ... } on success or { ok: false, stage, errors } on failure. ' +
				'stage is "parse", "stale", "patch", or "schema".',
		)
		.input(patchConfigInputSchema)
		.handler(async (input) => await handlePatchConfig(context, input))
		.build();
}
