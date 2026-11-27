// ---------------------------------------------------------------------------
// Own-model resolver (AGENT-1676)
//
// A seeded Agent runs on the model its user picked. The eval only has keys for
// some providers, so each model in the Agent's config takes the first route
// that works:
//   1. direct           — its own provider has a real key; run as-is
//   2. openrouter-same  — the same model through OpenRouter
//   3. comparable       — a model of the same tier from model-tiers.ts
//   4. skipped          — nothing maps; the run is skipped, not failed
// Only providers whose key is set count (`hasRealCredentialKey`). The restore
// binds each rewritten model to the case's credential of its provider type, so
// the resolver also says which credential types the case must declare.
// ---------------------------------------------------------------------------

import {
	AGENT_MODEL_PROVIDER_CREDENTIAL_TYPES,
	getAgentModelProviderCredentialTypes,
	getProviderPrefix,
	isAgentModelProvider,
	splitModelId,
	type AgentJsonConfig,
} from '@n8n/api-types';

import {
	COMPARABLE_MODEL_FAMILIES,
	FRONTIER_MODEL_TOKENS,
	OPENROUTER_HOST_PROVIDERS,
	OPENROUTER_VENDOR_ALIASES,
	OPENROUTER_VENDOR_BY_PROVIDER,
	NO_OPENROUTER_TWIN,
	OPENROUTER_FREE_SUFFIX,
	SMALL_MODEL_TOKENS,
	type ModelTier,
} from './model-tiers';
import { hasRealCredentialKey } from './seeder';
import { z } from 'zod';
import { isDirectAgentRun } from '../harness/agent-run-schema';
import type { TestCaseCredential, WorkflowTestCase } from '../types';

/** Ordered from most to least faithful to the user's own model. */
export const MODEL_RESOLUTION_KINDS = [
	'direct',
	'openrouter-same',
	'comparable',
	'skipped',
] as const;
export type ModelResolutionKind = (typeof MODEL_RESOLUTION_KINDS)[number];

const modelResolutionSchema = z.discriminatedUnion('kind', [
	z.object({
		kind: z.enum(['direct', 'openrouter-same', 'comparable']),
		originalModel: z.string(),
		actualModel: z.string(),
		credentialType: z.string(),
	}),
	z.object({ kind: z.literal('skipped'), originalModel: z.string(), reason: z.string() }),
]);

export type ModelResolution = z.infer<typeof modelResolutionSchema>;

const slotModelResolutionSchema = modelResolutionSchema.and(
	z.object({
		slot: z.string(),
		/** Set on a memory worker left unset: the runtime runs it on the main model. */
		inheritsFrom: z.literal('model').optional(),
	}),
);
export type SlotModelResolution = z.infer<typeof slotModelResolutionSchema>;

export const MODEL_FALLBACK_TAG = 'model-fallback';

/** What the resolver did to one seeded Agent. Recorded on every run of it. */
export const agentModelResolutionSchema = z.object({
	/** The least faithful route any model in the config took. */
	modelResolution: z.enum(MODEL_RESOLUTION_KINDS),
	/** The main model before and after resolution. */
	originalModel: z.string().optional(),
	actualModel: z.string().optional(),
	slots: z.array(slotModelResolutionSchema),
	/** Config paths removed because they don't carry over to the new provider. */
	droppedOptions: z.array(z.string()),
	/** Credential types the case must declare so the restore can bind every model. */
	credentialTypes: z.array(z.string()),
	/** How episodic memory's embeddings (always OpenAI) will run. */
	embeddings: z.enum(['none', 'openai', 'no-embedding-key']),
	tags: z.array(z.string()),
	skipReason: z.string().optional(),
});

export type AgentModelResolution = z.infer<typeof agentModelResolutionSchema>;
type EmbeddingResolution = AgentModelResolution['embeddings'];

/** Model credential types with a real key in this process's env. */
export function availableModelCredentialTypes(): ReadonlySet<string> {
	const types = Object.values(AGENT_MODEL_PROVIDER_CREDENTIAL_TYPES).flat();
	return new Set(types.filter((type) => hasRealCredentialKey(type)));
}

// ---------------------------------------------------------------------------
// One model
// ---------------------------------------------------------------------------

export function resolveModel(model: string, available: ReadonlySet<string>): ModelResolution {
	const direct = isFreeVariant(model)
		? undefined
		: firstAvailable(getAgentModelProviderCredentialTypes(getProviderPrefix(model)), available);
	if (direct)
		return { kind: 'direct', originalModel: model, actualModel: model, credentialType: direct };

	const openRouterModel = available.has('openRouterApi') ? openRouterTwin(model) : undefined;
	if (openRouterModel) {
		return {
			kind: 'openrouter-same',
			originalModel: model,
			actualModel: openRouterModel,
			credentialType: 'openRouterApi',
		};
	}
	return comparableModel(model, available);
}

function firstAvailable(types: readonly string[], available: ReadonlySet<string>) {
	return types.find((type) => available.has(type));
}

function comparableModel(model: string, available: ReadonlySet<string>): ModelResolution {
	const family = COMPARABLE_MODEL_FAMILIES.find((f) => available.has(f.credentialType));
	if (!family) {
		return {
			kind: 'skipped',
			originalModel: model,
			reason: `no model mapping for ${model}: no real key for its provider, OpenRouter, or a comparable model`,
		};
	}
	return {
		kind: 'comparable',
		originalModel: model,
		actualModel: family.models[modelTier(model)],
		credentialType: family.credentialType,
	};
}

/** The same model's OpenRouter id, or undefined when OpenRouter has no twin. */
function openRouterTwin(model: string): string | undefined {
	if (NO_OPENROUTER_TWIN.some((pattern) => pattern.test(model))) return undefined;
	const { provider, model: name } = splitModelId(model);
	if (provider === 'openrouter') {
		return isFreeVariant(model) ? model.slice(0, -OPENROUTER_FREE_SUFFIX.length) : undefined;
	}
	if (!isAgentModelProvider(provider)) return undefined;
	const vendor = OPENROUTER_VENDOR_BY_PROVIDER[provider];
	if (vendor) return openRouterId(vendor, name);
	if (!OPENROUTER_HOST_PROVIDERS.has(provider)) return undefined;
	const hosted = splitModelId(name);
	if (hosted.provider === '') return undefined;
	return openRouterId(OPENROUTER_VENDOR_ALIASES[hosted.provider] ?? hosted.provider, hosted.model);
}

function isFreeVariant(model: string): boolean {
	return getProviderPrefix(model) === 'openrouter' && model.endsWith(OPENROUTER_FREE_SUFFIX);
}

function openRouterId(vendor: string, name: string): string {
	return `openrouter/${vendor}/${vendor === 'anthropic' ? openRouterClaudeName(name) : name}`;
}

/** Anthropic ids use dashes and a date (`claude-haiku-4-5-20251001`); OpenRouter
 *  uses a dotted version and no date (`claude-haiku-4.5`). */
function openRouterClaudeName(name: string): string {
	return name.replace(/-\d{8}$/, '').replace(/(\d)-(\d+)$/, '$1.$2');
}

function modelTier(model: string): ModelTier {
	const tokens = model.toLowerCase().split(/[^a-z0-9]+/);
	const size = (token: string) => (/^\d+b$/.test(token) ? Number.parseInt(token, 10) : undefined);
	if (tokens.some((t) => SMALL_MODEL_TOKENS.has(t) || (size(t) ?? Infinity) < 30)) return 'small';
	if (tokens.some((t) => FRONTIER_MODEL_TOKENS.has(t) || (size(t) ?? 0) >= 300)) return 'frontier';
	return 'mid';
}

// ---------------------------------------------------------------------------
// One Agent config
// ---------------------------------------------------------------------------

/** A `{ model, credential }` slot inside a (cloned) config, mutated in place. */
interface ModelSlotRef {
	slot: string;
	target: { model: string };
}

/** Every model the config names: main, sub-agent tiers, and memory workers. */
function modelSlots(config: AgentJsonConfig): ModelSlotRef[] {
	const slots: ModelSlotRef[] = config.model ? [{ slot: 'model', target: config }] : [];
	for (const [level, entry] of Object.entries(config.subAgents?.modelsByDifficulty ?? {})) {
		if (entry) slots.push({ slot: `subAgents.modelsByDifficulty.${level}`, target: entry });
	}
	return [...slots, ...memoryModelSlots(config.memory)];
}

function memoryModelSlots(memory: AgentJsonConfig['memory']): ModelSlotRef[] {
	const observational = memory?.observationalMemory;
	const episodic = memory?.episodicMemory;
	const candidates = [
		['memory.observationalMemory.observerModel', observational?.observerModel],
		['memory.observationalMemory.reflectorModel', observational?.reflectorModel],
		[
			'memory.episodicMemory.reflectorModel',
			episodic?.enabled ? episodic.reflectorModel : undefined,
		],
	] as const;
	return candidates.flatMap(([slot, target]) => (target ? [{ slot, target }] : []));
}

/** Rewrite every model in the config to the route the eval can run, and say
 *  what was changed. The input is not mutated. */
export function resolveAgentConfigModels(
	input: AgentJsonConfig,
	available: ReadonlySet<string>,
): { config: AgentJsonConfig; resolution: AgentModelResolution } {
	const config = structuredClone(input);
	const slots: SlotModelResolution[] = modelSlots(config).map(({ slot, target }) => {
		const resolved = resolveModel(target.model, available);
		if (resolved.kind !== 'skipped') target.model = resolved.actualModel;
		return { slot, ...resolved };
	});
	const main = slots.find((s) => s.slot === 'model');
	const inherited = main ? inheritedWorkerSlots(config.memory, main) : [];
	const droppedOptions = main ? dropProviderOptions(config, main) : [];
	const embeddings = embeddingsOf(config, available);
	return { config, resolution: summarize([...slots, ...inherited], droppedOptions, embeddings) };
}

/** The runtime gives every memory worker left unset (and title generation) the
 *  Agent's own model and credential, so each follows the main model's route. */
function inheritedWorkerSlots(
	memory: AgentJsonConfig['memory'],
	main: SlotModelResolution,
): SlotModelResolution[] {
	return unsetMemoryWorkers(memory).map((slot) => ({ ...main, slot, inheritsFrom: 'model' }));
}

/** Memory workers that will run, but have no model of their own. */
function unsetMemoryWorkers(memory: AgentJsonConfig['memory']): string[] {
	if (!memory?.enabled) return [];
	const episodic = memory.episodicMemory;
	const workers: Array<[string, unknown]> = [
		...observationalWorkers(memory.observationalMemory),
		...(episodic?.enabled
			? [['memory.episodicMemory.reflectorModel', episodic.reflectorModel] as [string, unknown]]
			: []),
	];
	return workers.flatMap(([slot, model]) => (model === undefined ? [slot] : []));
}

/** Observational memory runs unless it is turned off explicitly. */
function observationalWorkers(
	observational: NonNullable<AgentJsonConfig['memory']>['observationalMemory'],
): Array<[string, unknown]> {
	if (observational?.enabled === false) return [];
	return [
		['memory.observationalMemory.observerModel', observational?.observerModel],
		['memory.observationalMemory.reflectorModel', observational?.reflectorModel],
	];
}

function summarize(
	slots: SlotModelResolution[],
	droppedOptions: string[],
	embeddings: EmbeddingResolution,
): AgentModelResolution {
	const main = slots.find((s) => s.slot === 'model');
	const skipped = slots.find((s) => s.kind === 'skipped');
	return {
		modelResolution: leastFaithful(slots),
		...(main ? { originalModel: main.originalModel } : {}),
		...(main?.kind !== undefined && main.kind !== 'skipped'
			? { actualModel: main.actualModel }
			: {}),
		slots,
		droppedOptions,
		credentialTypes: credentialTypesFor(slots, embeddings),
		embeddings,
		tags: slots.some((s) => s.kind === 'comparable') ? [MODEL_FALLBACK_TAG] : [],
		...(skipped?.kind === 'skipped' ? { skipReason: skipped.reason } : {}),
	};
}

function leastFaithful(slots: SlotModelResolution[]): ModelResolutionKind {
	const rank = (kind: ModelResolutionKind) => MODEL_RESOLUTION_KINDS.indexOf(kind);
	return slots.reduce<ModelResolutionKind>(
		(worst, slot) => (rank(slot.kind) > rank(worst) ? slot.kind : worst),
		'direct',
	);
}

function credentialTypesFor(slots: SlotModelResolution[], embeddings: EmbeddingResolution) {
	const types = slots.flatMap((s) => (s.kind === 'skipped' ? [] : [s.credentialType]));
	if (embeddings === 'openai') types.push('openAiApi');
	return [...new Set(types)];
}

/** Episodic memory always embeds with OpenAI, whatever the Agent's model, and
 *  does not go through the resolver. */
function embeddingsOf(
	config: AgentJsonConfig,
	available: ReadonlySet<string>,
): EmbeddingResolution {
	if (!config.memory?.enabled || !config.memory.episodicMemory?.enabled) return 'none';
	return available.has('openAiApi') ? 'openai' : 'no-embedding-key';
}

/** Remove provider-specific options that don't carry over when the main model
 *  changes provider. Returns the dropped paths. */
function dropProviderOptions(config: AgentJsonConfig, main: SlotModelResolution): string[] {
	if (main.kind === 'skipped') return [];
	const provider = getProviderPrefix(main.actualModel);
	if (provider === getProviderPrefix(main.originalModel)) return [];
	return [...dropAnthropicPromptCaching(config, provider), ...dropProviderTools(config, provider)];
}

function dropAnthropicPromptCaching(config: AgentJsonConfig, provider: string): string[] {
	const caching = config.config?.promptCaching;
	if (provider === 'anthropic' || !caching?.anthropic) return [];
	delete caching.anthropic;
	return ['config.promptCaching.anthropic'];
}

/** `providerTools` keys are `<provider>.<tool>`; another provider's tools can't run. */
function dropProviderTools(config: AgentJsonConfig, provider: string): string[] {
	const tools = config.providerTools;
	if (!tools) return [];
	const dropped = Object.keys(tools).filter((key) => !key.startsWith(`${provider}.`));
	for (const key of dropped) delete tools[key];
	if (Object.keys(tools).length === 0) delete config.providerTools;
	return dropped.map((key) => `providerTools.${key}`);
}

/** One log line: the route, the main model before and after, and what was dropped. */
export function describeModelResolution(resolution: AgentModelResolution): string {
	if (resolution.skipReason) return `skipped: ${resolution.skipReason}`;
	const models = `${resolution.originalModel ?? '(no model)'} -> ${resolution.actualModel ?? '(no model)'}`;
	const dropped = resolution.droppedOptions.length
		? ` (dropped: ${resolution.droppedOptions.join(', ')})`
		: '';
	return `${resolution.modelResolution} ${models}${dropped}`;
}

// ---------------------------------------------------------------------------
// One case
// ---------------------------------------------------------------------------

type ResolvableCase = Pick<WorkflowTestCase, 'seed' | 'credentials' | 'tags' | 'agentRun'>;

/** Resolve every seeded Agent of a case: rewrite its models, declare the
 *  credential types the restore needs to bind them, and tag fallback runs.
 *  `resolutions` is positional to `seed.agents`; empty when nothing was seeded. */
export function resolveCaseAgentModels<T extends ResolvableCase>(
	testCase: T,
	available: ReadonlySet<string>,
): { testCase: T; resolutions: AgentModelResolution[] } {
	const seed = testCase.seed;
	if (seed?.mode !== 'inline' || seed.agents.length === 0) return { testCase, resolutions: [] };
	const resolved = seed.agents.map((agent) => ({
		agent,
		...resolveAgentConfigModels(agent.config, available),
	}));
	const resolutions = resolved.map((r) => r.resolution);
	const agents = resolved.map(({ agent, config }) => ({ ...agent, config }));
	return {
		testCase: {
			...testCase,
			seed: { ...seed, agents },
			credentials: withCredentialTypes(testCase.credentials, resolutions),
			tags: [...new Set([...testCase.tags, ...resolutions.flatMap((r) => r.tags)])],
		},
		resolutions,
	};
}

/** Seeded Agents run on their own model only when the case runs them directly
 *  (`agentRun.mode: 'direct'`, AGENT-1665). A case the assistant builds keeps the
 *  credentials it declared: those are what the builder is graded against. */
export function resolveDirectRunAgentModels<T extends ResolvableCase>(
	testCase: T,
	available: ReadonlySet<string>,
): { testCase: T; resolutions: AgentModelResolution[] } {
	if (!isDirectAgentRun(testCase)) return { testCase, resolutions: [] };
	return resolveCaseAgentModels(testCase, available);
}

function withCredentialTypes(
	declared: TestCaseCredential[] | undefined,
	resolutions: AgentModelResolution[],
): TestCaseCredential[] {
	const credentials = [...(declared ?? [])];
	for (const type of new Set(resolutions.flatMap((r) => r.credentialTypes))) {
		if (!credentials.some((c) => c.type === type)) credentials.push({ type });
	}
	return credentials;
}
