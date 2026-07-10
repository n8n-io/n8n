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
	rejectIfUnsupportedNativeWebSearch,
	type AgentConfigValidationMessages,
} from '@n8n/ai-utilities/agent-config';
import {
	AgentJsonConfigSchema,
	formatZodErrors,
	RunnableAgentJsonConfigSchema,
	sanitizeAgentJsonConfig,
	tryParseConfigJson,
	type AgentJsonConfig,
} from '@n8n/api-types';
import { createHash } from 'node:crypto';
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

interface CredentialBinding {
	value: string;
	context: string;
	credentialType: string;
}

interface CredentialBindingWarning {
	code: 'CREDENTIAL_BINDING_REMOVED';
	message: string;
	path: string;
}

interface DestructiveChanges {
	customToolIds: string[];
	skillIds: string[];
}

interface PersistConfigOptions {
	destructiveChangeConfirmation?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const referenceValidationErrorSchema = z.object({
	code: z.literal('AGENT_CONFIG_REFERENCE_VALIDATION'),
	issues: z.array(z.object({ path: z.string(), message: z.string() })),
});

const nodeValidationErrorSchema = z.object({
	code: z.literal('AGENT_CONFIG_NODE_VALIDATION'),
	issues: z.array(
		z.object({
			code: z.string(),
			path: z.string(),
			message: z.string(),
			toolName: z.string(),
			nodeType: z.string(),
			nodeTypeVersion: z.number(),
		}),
	),
});

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
		if (!result.config) {
			return {
				ok: false as const,
				stage: 'persist',
				errors: [{ path: '(root)', message: 'Agent config persistence returned no config.' }],
			};
		}
		return {
			ok: true as const,
			...withConfigHash(result),
			validation: classifyAgentConfig(
				result.config,
				collectCredentialBindingWarnings(configWithDefaults, result.config),
			),
		};
	} catch (e) {
		const nodeError = nodeValidationErrorSchema.safeParse(e);
		if (nodeError.success) {
			return {
				ok: false as const,
				stage: 'node-validation',
				errors: nodeError.data.issues,
			};
		}
		const referenceError = referenceValidationErrorSchema.safeParse(e);
		if (referenceError.success) {
			return {
				ok: false as const,
				stage: 'reference-validation',
				errors: referenceError.data.issues,
			};
		}
		return {
			ok: false as const,
			stage: 'validation',
			errors: [{ path: '(root)', message: e instanceof Error ? e.message : String(e) }],
		};
	}
}

type MissingAgentSetup = 'model' | 'credential' | 'instructions';

function classifyAgentConfig(
	config: AgentJsonConfig,
	warnings: CredentialBindingWarning[] = [],
): {
	status: 'runnable' | 'valid-draft';
	missingSetup: MissingAgentSetup[];
	warnings: CredentialBindingWarning[];
} {
	const missingSetup: MissingAgentSetup[] = [];
	if (config.model.trim().length === 0) missingSetup.push('model');
	if (!config.credential || config.credential.trim().length === 0) missingSetup.push('credential');
	if (config.instructions.trim().length === 0) missingSetup.push('instructions');

	return {
		status:
			missingSetup.length === 0 && RunnableAgentJsonConfigSchema.safeParse(config).success
				? 'runnable'
				: 'valid-draft',
		missingSetup,
		warnings,
	};
}

function collectCredentialBindings(config: AgentJsonConfig): Map<string, CredentialBinding> {
	const bindings = new Map<string, CredentialBinding>();
	if (config.credential && config.credential.trim().length > 0) {
		bindings.set('credential', {
			value: config.credential,
			context: 'model',
			credentialType: 'model',
		});
	}

	const visit = (value: unknown, path: string, context: string): void => {
		if (Array.isArray(value)) {
			value.forEach((entry, index) =>
				visit(entry, path ? `${path}.${index}` : String(index), context),
			);
			return;
		}
		if (typeof value !== 'object' || value === null) return;

		for (const [key, entry] of Object.entries(value)) {
			const entryPath = path ? `${path}.${key}` : key;
			if (
				(key === 'credential' || key === 'credentialId') &&
				typeof entry === 'string' &&
				entry.trim().length > 0
			) {
				bindings.set(entryPath, {
					value: entry,
					context,
					credentialType: key,
				});
				continue;
			}

			if (key === 'credentials' && isRecord(entry)) {
				for (const [credentialType, credentialRef] of Object.entries(entry)) {
					const credentialPath = `${entryPath}.${credentialType}`;
					if (!isRecord(credentialRef)) continue;
					const id = credentialRef.id;
					if (typeof id === 'string' && id.trim().length > 0) {
						bindings.set(`${credentialPath}.id`, {
							value: id,
							context,
							credentialType,
						});
					} else {
						visit(credentialRef, credentialPath, context);
					}
				}
				continue;
			}

			visit(entry, entryPath, context);
		}
	};

	for (const [toolIndex, tool] of (config.tools ?? []).entries()) {
		if (tool.type !== 'node') continue;
		visit(tool.node, `tools.${toolIndex}.node`, `tool "${tool.name}"`);
	}

	const { credential: _credential, tools: _tools, ...remainingConfig } = config;
	visit(remainingConfig, '', 'agent');
	return bindings;
}

function collectCredentialBindingWarnings(
	candidate: AgentJsonConfig,
	persisted: AgentJsonConfig,
): CredentialBindingWarning[] {
	const candidateBindings = collectCredentialBindings(candidate);
	const persistedBindings = collectCredentialBindings(persisted);
	const warnings: CredentialBindingWarning[] = [];

	for (const [path, binding] of candidateBindings) {
		if (persistedBindings.get(path)?.value === binding.value) continue;
		warnings.push({
			code: 'CREDENTIAL_BINDING_REMOVED',
			path,
			message: `The ${binding.context} credential binding (${binding.credentialType}) at "${path}" was removed because it is not accessible in this project.`,
		});
	}

	return warnings.sort((left, right) => left.path.localeCompare(right.path));
}

function collectDestructiveChanges(
	previous: AgentJsonConfig | null,
	candidate: AgentJsonConfig,
): DestructiveChanges {
	const previousCustomToolIds = new Set(
		(previous?.tools ?? []).flatMap((tool) => (tool.type === 'custom' ? [tool.id] : [])),
	);
	const candidateCustomToolIds = new Set(
		candidate.tools?.flatMap((tool) => (tool.type === 'custom' ? [tool.id] : [])),
	);
	const previousSkillIds = new Set((previous?.skills ?? []).map((skill) => skill.id));
	const candidateSkillIds = new Set(candidate.skills?.map((skill) => skill.id));

	return {
		customToolIds:
			candidate.tools === undefined
				? []
				: [...previousCustomToolIds].filter((id) => !candidateCustomToolIds.has(id)).sort(),
		skillIds:
			candidate.skills === undefined
				? []
				: [...previousSkillIds].filter((id) => !candidateSkillIds.has(id)).sort(),
	};
}

function getDestructiveChangeConfirmationToken(
	configHash: string | null,
	changes: DestructiveChanges,
): string {
	return createHash('sha256')
		.update(
			JSON.stringify({
				configHash,
				customToolIds: changes.customToolIds,
				skillIds: changes.skillIds,
			}),
		)
		.digest('hex');
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
	const parsed = tryParseConfigJson(json);
	if (!parsed.ok) return { ok: false as const, stage: 'parse', errors: parsed.errors };
	return await persistConfigCandidate(context, parsed.data, baseConfigHash);
}

export async function persistConfigCandidate(
	context: InstanceAiContext,
	candidate: unknown,
	baseConfigHash: string | null,
	options: PersistConfigOptions = {},
) {
	const deps = await resolveDeps(context);
	if (!deps) return NOT_CONFIGURED;

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

	const zodResult = AgentJsonConfigSchema.safeParse(sanitizeAgentJsonConfig(candidate));
	if (!zodResult.success) {
		return { ok: false as const, stage: 'schema', errors: formatZodErrors(zodResult.error) };
	}

	const destructiveChanges = collectDestructiveChanges(snapshot.config, zodResult.data);
	if (destructiveChanges.customToolIds.length > 0 || destructiveChanges.skillIds.length > 0) {
		const confirmationToken = getDestructiveChangeConfirmationToken(
			snapshot.configHash,
			destructiveChanges,
		);
		if (options.destructiveChangeConfirmation !== confirmationToken) {
			return {
				ok: false as const,
				stage: 'confirmation',
				destructiveChanges,
				confirmationToken,
			};
		}
	}

	return await validateAndPersist(deps, zodResult.data, snapshot.config);
}

export function createReadConfigTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.READ_CONFIG)
		.description(
			'Read the latest persisted agent configuration and freshness metadata. ' +
				'Returns { ok: true, config, configHash, updatedAt, versionId }. ' +
				'Use for compatibility and debugging; prefer read_agent_source before TypeScript edits. ' +
				'Its configHash can be used as build_agent baseConfigHash.',
		)
		.input(readConfigInputSchema)
		.handler(async () => await handleReadConfig(context))
		.build();
}
