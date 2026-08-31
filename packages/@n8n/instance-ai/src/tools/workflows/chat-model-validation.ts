import type { ModelInfo, ProviderCatalog, ProviderInfo } from '@n8n/agents/catalog';
import { getCachedCatalog } from '@n8n/agents/catalog';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import type { NodeJSON } from '@n8n/workflow-sdk';
import { getChildNodes, NodeConnectionTypes, type IConnections } from 'n8n-workflow';

import { N8N_CONNECT_DISPLAY_NAME, isAiGatewayManagedCredential } from './credential-utils';
import type { InstanceAiContext } from '../../types';
import { isChatModelNode, resolveChatModelCatalogEntry } from '../nodes/preferred-chat-model';

export { isChatModelNode };

export type ChatModelFailureKind =
	| 'invalid_model'
	| 'unsupported_parameter'
	| 'capability_mismatch';

const CATALOG_FETCH_TIMEOUT_MS = 5000;
const MAX_REPLACEMENT_SUGGESTIONS = 3;

/** Google's models API / Gemini nodes store ids as `models/<id>`. */
const GOOGLE_MODEL_ID_PREFIX = 'models/';

/** Dated snapshot suffixes: Anthropic `-20251001`, OpenAI `-2024-08-06`. */
const SNAPSHOT_SUFFIX = /-(?:\d{8}|\d{4}-\d{2}-\d{2})$/;

const CHAT_MODEL_ERROR_PATTERNS: Array<{
	kind: ChatModelFailureKind;
	pattern: RegExp;
}> = [
	{
		kind: 'unsupported_parameter',
		pattern:
			/\b(?:unsupported_parameter|invalid_parameter)\b|(?:unsupported (?:parameter|value|option)|parameter [^\s]+ is not supported|does not support (?:temperature|top_p|max_tokens|max_completion_tokens|thinking)|(?:temperature|top_p|max_tokens|max_completion_tokens|thinking) (?:is not supported|cannot be set|is not allowed))/i,
	},
	{
		kind: 'invalid_model',
		pattern:
			/\b(?:model_not_found|not_found_error|invalid_model_id|invalid_model|unknown_model)\b|(?:(?:model|models\/|deployment|engine)[\s\S]*?(?:not found|does not exist|is not found|was not found|invalid|unknown|not available)|(?:resource ['"]?models\/[^\s'"]+['"]? was not found))/i,
	},
	{
		kind: 'capability_mismatch',
		pattern:
			/\b(?:not a chat model|not supported for (?:generateContent|this operation)|does not support (?:tools|tool use|function calling|functions|vision|multimodal)|only supported (?:via|for) responses api)\b/i,
	},
];

/** Versionless alias of a dated snapshot id (`claude-haiku-4-5-20251001` → `claude-haiku-4-5`). */
export function stripSnapshotSuffix(id: string): string {
	return id.replace(SNAPSHOT_SUFFIX, '');
}

/**
 * Normalize a chat-model node parameter value to the id shape used by
 * models.dev and most provider `/models` endpoints.
 */
export function normalizeChatModelId(raw: string): string {
	const withoutGooglePrefix = raw.startsWith(GOOGLE_MODEL_ID_PREFIX)
		? raw.slice(GOOGLE_MODEL_ID_PREFIX.length)
		: raw;
	return stripSnapshotSuffix(withoutGooglePrefix);
}

export function extractResourceLocatorValue(value: unknown): string | undefined {
	if (typeof value === 'string' && value !== '') return value;
	if (typeof value !== 'object' || value === null || !('__rl' in value)) return undefined;
	const locatorValue: unknown = Reflect.get(value, 'value');
	return typeof locatorValue === 'string' && locatorValue !== '' ? locatorValue : undefined;
}

/** Chat-model nodes disagree on the parameter name: OpenAI/Anthropic use
 *  `model` (often an RLC), Gemini/Vertex use `modelName` (plain string). */
const CHAT_MODEL_ID_PARAMETER_KEYS = ['model', 'modelName', 'modelId'] as const;

export function extractChatModelParameter(
	parameters: Record<string, unknown>,
): { key: (typeof CHAT_MODEL_ID_PARAMETER_KEYS)[number]; modelId: string } | undefined {
	for (const key of CHAT_MODEL_ID_PARAMETER_KEYS) {
		const modelId = extractResourceLocatorValue(parameters[key]);
		if (modelId) return { key, modelId };
	}
	return undefined;
}

export function classifyChatModelFailure(
	errorMessage: string | undefined,
): ChatModelFailureKind | undefined {
	if (!errorMessage) return undefined;
	for (const { kind, pattern } of CHAT_MODEL_ERROR_PATTERNS) {
		if (pattern.test(errorMessage)) return kind;
	}
	return undefined;
}

function compareByReleaseDateDesc(a: ModelInfo, b: ModelInfo): number {
	const timeA = a.releaseDate ? Date.parse(a.releaseDate) || null : null;
	const timeB = b.releaseDate ? Date.parse(b.releaseDate) || null : null;
	if (timeA !== null && timeB !== null && timeA !== timeB) return timeB - timeA;
	if (timeA !== null && timeB === null) return -1;
	if (timeA === null && timeB !== null) return 1;
	return a.id.localeCompare(b.id);
}

/**
 * Newest tool-capable models from the catalog (same policy as the agents
 * builder recommendations). Used as replacement suggestions — never hardcoded.
 */
export function suggestReplacementModels(
	provider: ProviderInfo | undefined,
	limit = MAX_REPLACEMENT_SUGGESTIONS,
): string[] {
	if (!provider) return [];
	const models = Object.values(provider.models);
	const toolCapable = models.filter((model) => model.toolCall);
	const pool = toolCapable.length > 0 ? toolCapable : models;
	return pool
		.sort(compareByReleaseDateDesc)
		.slice(0, limit)
		.map((model) => model.id);
}

function formatReplacementGuidance(suggestions: string[]): string {
	if (suggestions.length === 0) {
		return 'Use nodes(action="explore-resources") on the chat-model node with its connected credential to list allowed models.';
	}
	return (
		`Prefer one of: ${suggestions.map((id) => `"${id}"`).join(', ')}. ` +
		'Confirm with nodes(action="explore-resources") against the connected credential before repairing.'
	);
}

export function buildChatModelFailureGuidance(
	kind: ChatModelFailureKind,
	errorMessage: string,
	replacementSuggestions: string[] = [],
	aiCreditsAvailable = false,
): string {
	const base =
		'Verification failed because of a chat-model configuration problem, not workflow logic. ' +
		'Do not guess another model ID — pick a replacement from a verified source.';
	const replacements = formatReplacementGuidance(replacementSuggestions);

	switch (kind) {
		case 'unsupported_parameter':
			return (
				base +
				' Remove or adjust the parameter the provider rejected (often temperature, top_p, or max_tokens on models that disallow sampling). ' +
				replacements +
				' Original error: ' +
				errorMessage
			);
		case 'capability_mismatch':
			return (
				base +
				' The chosen model cannot perform this node operation (for example image generation, computer use, or Responses API-only models). ' +
				replacements +
				(aiCreditsAvailable
					? ' Or switch to Gateway credits (no API key required) when the task fits a covered model.'
					: '') +
				' Original error: ' +
				errorMessage
			);
		case 'invalid_model':
			return (
				base +
				' ' +
				replacements +
				(aiCreditsAvailable
					? " If the user's own key cannot reach any working model, switch the node to Gateway credits (no API key required) instead of another guessed ID."
					: " If the user's own key cannot reach any working model, ask the user for a provider or key that works instead of another guessed ID.") +
				' Original error: ' +
				errorMessage
			);
	}
}

async function loadCatalogWithTimeout(): Promise<ProviderCatalog | undefined> {
	let timer: NodeJS.Timeout | undefined;
	try {
		return await Promise.race([
			getCachedCatalog(),
			new Promise<undefined>((resolve) => {
				timer = setTimeout(() => resolve(undefined), CATALOG_FETCH_TIMEOUT_MS);
			}),
		]);
	} catch {
		return undefined;
	} finally {
		if (timer) clearTimeout(timer);
	}
}

function lookupCatalogModel(
	provider: ProviderInfo | undefined,
	modelId: string,
): ModelInfo | undefined {
	if (!provider) return undefined;
	const normalized = normalizeChatModelId(modelId);
	const stripped = stripSnapshotSuffix(modelId);
	return (
		provider.models[modelId] ??
		provider.models[normalized] ??
		provider.models[stripped] ??
		Object.values(provider.models).find(
			(model) =>
				model.id === modelId ||
				model.id === normalized ||
				normalizeChatModelId(model.id) === normalized,
		)
	);
}

function isDeprecatedModelId(provider: ProviderInfo | undefined, modelId: string): boolean {
	if (!provider?.deprecatedModelIds || provider.deprecatedModelIds.length === 0) return false;
	const deprecatedSet = new Set(provider.deprecatedModelIds);
	const normalized = normalizeChatModelId(modelId);
	return (
		deprecatedSet.has(modelId) ||
		deprecatedSet.has(normalized) ||
		deprecatedSet.has(stripSnapshotSuffix(modelId))
	);
}

function computeCatalogChatModelIssues(
	nodeType: string,
	parameters: Record<string, unknown>,
	catalog: ProviderCatalog | undefined,
): Record<string, string[]> {
	const issues: Record<string, string[]> = {};
	if (!catalog) return issues;

	const entry = resolveChatModelCatalogEntry(nodeType);
	if (!entry) return issues;

	const extracted = extractChatModelParameter(parameters);
	if (!extracted) return issues;

	const { key, modelId } = extracted;
	const provider = catalog[entry.modelsDevProviderId];
	const suggestions = suggestReplacementModels(provider);

	if (isDeprecatedModelId(provider, modelId)) {
		issues[key] = [
			`"${modelId}" is deprecated according to the live models.dev catalog and will fail at run time. ` +
				formatReplacementGuidance(suggestions),
		];
		return issues;
	}

	const catalogModel = lookupCatalogModel(provider, modelId);
	if (!catalogModel) return issues;

	const options =
		typeof parameters.options === 'object' && parameters.options !== null
			? (parameters.options as Record<string, unknown>)
			: {};
	if (catalogModel.temperature === false && typeof options.temperature === 'number') {
		issues.options = [
			`Model "${modelId}" does not accept temperature according to the live models.dev catalog. Remove options.temperature.`,
		];
	}

	return issues;
}

/**
 * Locator values and credential names are user-controlled; keep them
 * single-line and short before embedding them in agent-facing guidance.
 */
function sanitizeForGuidance(value: string, maxLength = 120): string {
	const singleLine = value.replace(/\s+/g, ' ').trim();
	return singleLine.length > maxLength ? `${singleLine.slice(0, maxLength)}…` : singleLine;
}

/**
 * Ask the host which list-backed locator parameters the connected credential
 * cannot reach, and turn each into a parameter issue.
 */
export async function computeUnavailableLocatorIssues(
	context: InstanceAiContext,
	node: NodeJSON,
	parameters: Record<string, unknown>,
	typeVersion: number,
	credentialType: string,
	credential: { id: string; name: string },
): Promise<Record<string, string[]>> {
	if (!context.nodeService.findUnavailableLocatorValues) return {};

	const unavailable = await context.nodeService
		.findUnavailableLocatorValues({
			nodeType: node.type,
			version: typeVersion,
			credentialType,
			credentialId: credential.id,
			parameters,
		})
		.catch(() => []);

	const issues: Record<string, string[]> = {};
	for (const entry of unavailable) {
		const isModel = entry.name.toLowerCase().includes('model');
		const resourceType = isModel ? 'allowed models' : 'allowed options';
		issues[entry.name] = [
			`"${sanitizeForGuidance(entry.currentValue)}" isn't available with the connected credential "${sanitizeForGuidance(credential.name)}". ` +
				`Pick a value the credential offers instead — use nodes(action="explore-resources") to list ${resourceType}.`,
		];
	}
	return issues;
}

function resolveStoredCredential(
	node: NodeJSON,
	credentialType: string,
): { id: string; name: string } | undefined {
	const selected = node.credentials?.[credentialType];
	if (!selected || typeof selected !== 'object') return undefined;

	if (isAiGatewayManagedCredential(selected)) {
		return { id: AI_GATEWAY_MANAGED_TAG, name: N8N_CONNECT_DISPLAY_NAME };
	}

	const id: unknown = Reflect.get(selected, 'id');
	const name: unknown = Reflect.get(selected, 'name');
	if (typeof id !== 'string' || id === '') return undefined;
	return { id, name: typeof name === 'string' && name !== '' ? name : id };
}

/**
 * Catalog + credential-scoped checks for chat-model nodes. Used at validate
 * time and as a deterministic post-build backstop. No hardcoded model lists —
 * judgments come from models.dev and live provider lookups only.
 */
export async function computeChatModelValidationIssues(
	context: InstanceAiContext,
	node: NodeJSON,
): Promise<Record<string, string[]>> {
	if (!isChatModelNode(node.type)) return {};

	const typeVersion = node.typeVersion ?? 1;
	const parameters = (node.parameters ?? {}) as Record<string, unknown>;
	const catalog = await loadCatalogWithTimeout();
	const issues = computeCatalogChatModelIssues(node.type, parameters, catalog);

	const entry = resolveChatModelCatalogEntry(node.type);
	if (!entry) return issues;

	const storedCredential = resolveStoredCredential(node, entry.credentialType);
	if (storedCredential) {
		const unavailableIssues = await computeUnavailableLocatorIssues(
			context,
			node,
			parameters,
			typeVersion,
			entry.credentialType,
			storedCredential,
		);
		for (const [key, messages] of Object.entries(unavailableIssues)) {
			issues[key] = [...(issues[key] ?? []), ...messages];
		}
	}

	return issues;
}

/** A chat-model node name plus the parent agent/chain nodes it feeds via `ai_languageModel`. */
function relatedNamesForChatModelNode(
	nodeName: string,
	connections: IConnections | Record<string, unknown> | undefined,
): string[] {
	const names = [nodeName];
	if (connections) {
		names.push(
			...getChildNodes(
				connections as IConnections,
				nodeName,
				NodeConnectionTypes.AiLanguageModel,
				1,
			),
		);
	}
	return names;
}

/**
 * Chat-model node names plus parent agent/chain nodes they feed via
 * `ai_languageModel`. Provider errors often surface on the parent, not the
 * subnode — both must be considered for recovery classification.
 */
export function collectChatModelRelatedNodeNames(
	nodes: ReadonlyArray<{ name?: string; type?: string }>,
	connections: IConnections | Record<string, unknown> | undefined,
): Set<string> {
	const related = new Set<string>();
	for (const node of nodes) {
		if (node.name && isChatModelNode(node.type)) {
			for (const name of relatedNamesForChatModelNode(node.name, connections)) {
				related.add(name);
			}
		}
	}
	return related;
}

export interface ChatModelRecoveryContext {
	relatedNodeNames: Set<string>;
	/** Replacement model ids keyed by chat-model node name AND its parent agent/chain names. */
	suggestionsByNodeName: ReadonlyMap<string, string[]>;
	/**
	 * Node names (chat-model + parent agent/chain names) whose credential type
	 * is covered by n8n credits. Tracked per node so recovery never suggests
	 * credits for a provider the gateway does not cover.
	 */
	creditsCoveredNodeNames: ReadonlySet<string>;
}

/**
 * Precomputes everything the sync verification-failure classifier needs to
 * build chat-model recovery guidance: related node names, catalog-backed
 * replacement suggestions per node, and n8n-credits availability.
 */
export async function collectChatModelRecoveryContext(
	context: Pick<InstanceAiContext, 'credentialService'>,
	nodes: ReadonlyArray<{ name?: string; type?: string }>,
	connections: IConnections | Record<string, unknown> | undefined,
): Promise<ChatModelRecoveryContext> {
	const relatedNodeNames = collectChatModelRelatedNodeNames(nodes, connections);
	const suggestionsByNodeName = new Map<string, string[]>();
	const creditsCoveredNodeNames = new Set<string>();
	if (relatedNodeNames.size === 0) {
		return { relatedNodeNames, suggestionsByNodeName, creditsCoveredNodeNames };
	}

	const catalog = await loadCatalogWithTimeout();
	const gatewaySupportByCredType = new Map<string, boolean>();
	for (const node of nodes) {
		if (!node.name || !isChatModelNode(node.type)) continue;
		const entry = resolveChatModelCatalogEntry(node.type);
		if (!entry) continue;

		const relatedNames = relatedNamesForChatModelNode(node.name, connections);
		const suggestions = suggestReplacementModels(catalog?.[entry.modelsDevProviderId]);
		if (suggestions.length > 0) {
			for (const name of relatedNames) {
				suggestionsByNodeName.set(name, suggestions);
			}
		}

		if (context.credentialService.isAiGatewayCredentialType) {
			let supported = gatewaySupportByCredType.get(entry.credentialType);
			if (supported === undefined) {
				supported = await context.credentialService
					.isAiGatewayCredentialType(entry.credentialType)
					.catch(() => false);
				gatewaySupportByCredType.set(entry.credentialType, supported);
			}
			if (supported) {
				for (const name of relatedNames) {
					creditsCoveredNodeNames.add(name);
				}
			}
		}
	}

	return { relatedNodeNames, suggestionsByNodeName, creditsCoveredNodeNames };
}
