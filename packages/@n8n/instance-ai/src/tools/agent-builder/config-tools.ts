/**
 * read_config plus the shared config persistence pipeline used by build_agent.
 * Validation, freshness (hash) checks, `$fromAI` dynamic-selector enforcement,
 * and native-web-search reject/normalize are reimplemented here; only the
 * snapshot read and persist go through `context.agentBuilderService`.
 */
import { Tool } from '@n8n/agents';
import {
	applyNativeWebSearchDefaultOn,
	rejectIfDynamicSelectorUsesFromAi,
	rejectIfEmptyInstructions,
	rejectIfUnsupportedNativeWebSearch,
	type AgentConfigValidationMessages,
} from '@n8n/ai-utilities/agent-config';
import {
	formatZodErrors,
	RunnableAgentJsonConfigSchema,
	sanitizeAgentJsonConfig,
	tryParseConfigJson,
	type AgentJsonConfig,
} from '@n8n/api-types';
import { z } from 'zod';

import { resolveAgentBuilderTarget } from './agent-target-binding';
import { STALE_CONFIG_ERROR, withConfigHash, type HashedSnapshot } from './config-helpers';
import type { InstanceAiAgentBuilderService, InstanceAiContext } from '../../types';
import { AGENT_BUILDER_TOOL_IDS } from '../tool-ids';

/** LLM-facing follow-up guidance for the instance-ai agent-builder tools. */
const INSTANCE_AI_CONFIG_MESSAGES: AgentConfigValidationMessages = {
	emptyInstructionsFollowUp: 'editing the config file and calling build_agent again.',
	dynamicSelectorFollowUp:
		'Load the agent-builder resource-locators reference, resolve a credential if missing ' +
		'(credentials tool, action "list"), then call get_resource_locator_options and write the ' +
		'returned parameterValue into nodeParameters.',
};

interface AgentBuilderDeps {
	service: InstanceAiAgentBuilderService;
	agentId: string;
	projectId: string;
	nodeTypesProvider: InstanceAiContext['nodeTypesProvider'];
}

/** Resolve the agent-builder deps from context or thread binding, or null when not configured. */
async function resolveDeps(context: InstanceAiContext): Promise<AgentBuilderDeps | null> {
	if (!context.agentBuilderService) return null;
	const target = await resolveAgentBuilderTarget(context);
	if (!target) return null;
	return {
		service: context.agentBuilderService,
		agentId: target.agentId,
		projectId: target.projectId,
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

const readConfigInputSchema = z.object({});

export const baseConfigHashSchema = z
	.string()
	.nullable()
	.describe(
		'configHash from the immediately preceding read_config result; null only if no config exists',
	);

async function getHashedSnapshot(deps: AgentBuilderDeps): Promise<HashedSnapshot> {
	return withConfigHash(await deps.service.getConfigSnapshot(deps.agentId, deps.projectId));
}

/**
 * Run the shared validation gauntlet on a candidate config and persist it.
 * Returns the success/failure tool response. Post-schema content rejections
 * are reported as stage `'validation'`.
 */
async function validateAndPersist(
	deps: AgentBuilderDeps,
	candidate: AgentJsonConfig,
	previousConfig: AgentJsonConfig | null,
) {
	const empty = rejectIfEmptyInstructions(candidate, INSTANCE_AI_CONFIG_MESSAGES);
	if (empty) return { ok: false as const, stage: 'validation', errors: empty };

	const unsupportedWebSearch = rejectIfUnsupportedNativeWebSearch(candidate);
	if (unsupportedWebSearch) {
		return { ok: false as const, stage: 'validation', errors: unsupportedWebSearch };
	}

	const dynamicSelector = rejectIfDynamicSelectorUsesFromAi(
		candidate,
		previousConfig,
		deps.nodeTypesProvider,
		INSTANCE_AI_CONFIG_MESSAGES,
	);
	if (dynamicSelector) {
		return { ok: false as const, stage: 'validation', errors: dynamicSelector };
	}

	// Seed the "native model gets web search by default" ergonomic as an explicit
	// flag; the host's updateConfig owns provider-tool reconciliation so the write
	// and read paths stay in agreement.
	const configWithDefaults = applyNativeWebSearchDefaultOn(candidate);

	try {
		const result = await deps.service.updateConfig(
			deps.agentId,
			deps.projectId,
			configWithDefaults,
		);
		return { ok: true as const, ...withConfigHash(result) };
	} catch (e) {
		return {
			ok: false as const,
			stage: 'validation',
			errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
		};
	}
}

/** read_config handler — usable standalone or via the agent_builder router. */
async function handleReadConfig(context: InstanceAiContext) {
	const deps = await resolveDeps(context);
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

/**
 * Parse, freshness-check, validate, and persist a complete agent config JSON
 * string. Shared pipeline behind `build_agent` (the file content is the JSON).
 */
export async function persistConfigJson(
	context: InstanceAiContext,
	json: string,
	baseConfigHash: string | null,
) {
	const deps = await resolveDeps(context);
	if (!deps) return NOT_CONFIGURED;

	const parsed = tryParseConfigJson(json);
	if (!parsed.ok) return { ok: false as const, stage: 'parse', errors: parsed.errors };

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
	if (baseConfigHash !== snapshot.configHash) {
		return { ok: false as const, stage: 'stale', errors: [STALE_CONFIG_ERROR], ...snapshot };
	}

	const zodResult = RunnableAgentJsonConfigSchema.safeParse(sanitizeAgentJsonConfig(parsed.data));
	if (!zodResult.success) {
		return { ok: false as const, stage: 'schema', errors: formatZodErrors(zodResult.error) };
	}

	return await validateAndPersist(deps, zodResult.data, snapshot.config);
}

export function createReadConfigTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.READ_CONFIG)
		.description(
			'Read the latest persisted agent configuration and freshness metadata. ' +
				'Returns { ok: true, config, configHash, updatedAt, versionId }. ' +
				'Call this before every build_agent and use configHash as baseConfigHash. Use the returned ' +
				'config to (re)write the agent config file in the workspace when editing an existing agent.',
		)
		.input(readConfigInputSchema)
		.handler(async () => await handleReadConfig(context))
		.build();
}
