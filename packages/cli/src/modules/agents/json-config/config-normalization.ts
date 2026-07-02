/**
 * Agent-config normalization + validation — the single source of truth for the
 * business rules that used to live (duplicated) in each builder tool layer.
 * `AgentConfigService.updateConfig` runs these on every write so the persisted
 * config always agrees with the read/compose path.
 *
 * Split of responsibilities:
 * - `reconcileNativeWebSearch` runs in the service on EVERY write. It derives
 *   the native web-search provider tools from the EXPLICIT `config.webSearch`
 *   state and never resurrects a disabled state (`defaultEnabled: false`).
 * - `applyNativeWebSearchDefaultOn` is the builder ergonomic ("a fresh native
 *   agent gets web search on") — builders call it to make the default explicit
 *   BEFORE persisting; the service never auto-enables on its own.
 */
import {
	findNodeParameterProperty,
	getDynamicNodeParameterLookup,
	normalizeParameterPath,
} from '@n8n/ai-utilities/node-catalog';
import type {
	AgentJsonConfig,
	AgentJsonNodeToolConfig,
	ConfigValidationError,
} from '@n8n/api-types';
import type { INodeTypes } from 'n8n-workflow';

import {
	collectFromAiParameterReferences,
	hasMatchingFromAiParameterReference,
	type FromAiParameterReference,
} from './from-ai-node-parameters';
import {
	getNativeWebSearchProviderTools,
	hasNativeWebSearchProvider,
	isNativeWebSearchRequested,
} from './native-web-search-provider-tools';

export const EMPTY_INSTRUCTIONS_ERROR: ConfigValidationError = {
	path: '/instructions',
	message:
		'Refusing to write an agent with empty instructions. Ask the user what the agent should do before saving the config again.',
};

/**
 * Reconcile the native web-search provider tools with the config's EXPLICIT
 * `config.webSearch` state. Unlike the old builder normalizer this never
 * auto-enables (`defaultEnabled: false`) and keeps an explicit
 * `webSearch.enabled: false` intact, so a disable survives the round-trip. The
 * derived `providerTools` are always written explicitly (even to `{}`) so a
 * disable actually clears previously-persisted native tools instead of the
 * partial-update path resurrecting them.
 */
export function reconcileNativeWebSearch(config: AgentJsonConfig): AgentJsonConfig {
	const providerTools = getNativeWebSearchProviderTools(config, {
		includeDefaultArgs: true,
		defaultEnabled: false,
	});
	// Emit `providerTools` explicitly whenever web search is in play — either the
	// config touches `webSearch`, already carried provider tools, or reconciling
	// produced some. This guarantees a disable actually clears previously-persisted
	// native tools (the partial-update path would otherwise keep them) without
	// littering `providerTools: {}` onto configs that never use web search.
	const webSearchTouched = config.config?.webSearch !== undefined;
	const hadProviderTools = config.providerTools !== undefined;
	if (Object.keys(providerTools).length === 0 && !webSearchTouched && !hadProviderTools) {
		return config;
	}
	return { ...config, providerTools };
}

/**
 * Builder ergonomic: turn native web search ON by default for a native-capable
 * model unless the user explicitly disabled it or chose a fallback provider.
 * Makes the default explicit in `config.webSearch` so the service's
 * reconcile-only write path derives the provider tools deterministically.
 */
export function applyNativeWebSearchDefaultOn(config: AgentJsonConfig): AgentJsonConfig {
	const webSearch = config.config?.webSearch;
	const explicitlyDisabled = webSearch?.enabled === false;
	const usesFallbackProvider = webSearch?.provider === 'brave' || webSearch?.provider === 'searxng';
	const shouldDefaultOn =
		hasNativeWebSearchProvider(config.model) &&
		isNativeWebSearchRequested(config) &&
		!explicitlyDisabled &&
		!usesFallbackProvider &&
		webSearch?.enabled !== true;

	if (!shouldDefaultOn) return config;

	return {
		...config,
		config: { ...(config.config ?? {}), webSearch: { ...webSearch, enabled: true } },
	};
}

export function rejectIfEmptyInstructions(config: AgentJsonConfig): ConfigValidationError[] | null {
	if (!config.instructions.trim()) return [EMPTY_INSTRUCTIONS_ERROR];
	return null;
}

export function rejectIfUnsupportedNativeWebSearch(
	config: AgentJsonConfig,
): ConfigValidationError[] | null {
	const webSearch = config.config?.webSearch;
	const requestsNativeWebSearch =
		webSearch?.enabled === true &&
		(webSearch.provider === undefined ||
			webSearch.provider === 'auto' ||
			webSearch.provider === 'native');
	if (!requestsNativeWebSearch || hasNativeWebSearchProvider(config.model)) return null;
	return [
		{
			path: '/config/webSearch/provider',
			message:
				'Native web search is only supported for Anthropic and OpenAI models. Use Brave or SearXNG fallback web search for this model.',
		},
	];
}

function isNodeTool(
	tool: NonNullable<AgentJsonConfig['tools']>[number] | undefined,
): tool is AgentJsonNodeToolConfig {
	return tool?.type === 'node';
}

function hasSameNodeToolIdentity(
	left: AgentJsonNodeToolConfig,
	right: AgentJsonNodeToolConfig,
): boolean {
	return (
		left.name === right.name &&
		left.node.nodeType === right.node.nodeType &&
		left.node.nodeTypeVersion === right.node.nodeTypeVersion
	);
}

function findPreviousNodeTool(
	previousConfig: AgentJsonConfig | null,
	currentTool: AgentJsonNodeToolConfig,
	currentToolIndex: number,
): AgentJsonNodeToolConfig | null {
	const previousTools = previousConfig?.tools ?? [];
	const sameIndexTool = previousTools[currentToolIndex];
	if (isNodeTool(sameIndexTool) && hasSameNodeToolIdentity(sameIndexTool, currentTool)) {
		return sameIndexTool;
	}
	const matchingTools = previousTools.filter(
		(tool): tool is AgentJsonNodeToolConfig =>
			isNodeTool(tool) && hasSameNodeToolIdentity(tool, currentTool),
	);
	return matchingTools.length === 1 ? matchingTools[0] : null;
}

function getDynamicSelectorPath(
	properties: ReturnType<INodeTypes['getByNameAndVersion']>['description']['properties'],
	parameterPath: string,
): string | null {
	const pathParts = normalizeParameterPath(parameterPath).split('.');
	for (let length = pathParts.length; length > 0; length--) {
		const candidatePath = pathParts.slice(0, length).join('.');
		const property = findNodeParameterProperty(properties, candidatePath);
		if (!property) continue;
		if (getDynamicNodeParameterLookup(property)) return candidatePath;
	}
	return null;
}

/**
 * Reject configs that leave a `$fromAI(...)` expression on a stable dynamic
 * selector (resourceLocator / loadOptions). New `$fromAI` references that did
 * not already exist on the previous config are flagged; pre-existing ones are
 * tolerated so unrelated edits don't fail.
 */
export function rejectIfDynamicSelectorUsesFromAi(
	config: AgentJsonConfig,
	previousConfig: AgentJsonConfig | null,
	nodeTypes: INodeTypes,
): ConfigValidationError[] | null {
	const errors: ConfigValidationError[] = [];

	for (const [toolIndex, tool] of (config.tools ?? []).entries()) {
		if (tool.type !== 'node') continue;

		const fromAiReferences = collectFromAiParameterReferences(tool.node.nodeParameters);
		if (fromAiReferences.length === 0) continue;

		let properties;
		try {
			properties = nodeTypes.getByNameAndVersion(tool.node.nodeType, tool.node.nodeTypeVersion)
				.description.properties;
		} catch {
			continue;
		}

		const previousTool = findPreviousNodeTool(previousConfig, tool, toolIndex);
		const previousFromAiReferences: FromAiParameterReference[] = previousTool
			? collectFromAiParameterReferences(previousTool.node.nodeParameters)
			: [];

		const reportedDynamicPaths = new Set<string>();
		for (const fromAiReference of fromAiReferences) {
			const dynamicPath = getDynamicSelectorPath(properties, fromAiReference.parameterPath);
			if (!dynamicPath || reportedDynamicPaths.has(dynamicPath)) continue;
			if (hasMatchingFromAiParameterReference(previousFromAiReferences, fromAiReference)) continue;

			reportedDynamicPaths.add(dynamicPath);
			errors.push({
				path: `/tools/${toolIndex}/node/nodeParameters/${fromAiReference.jsonPointer}`,
				message:
					`Node tool "${tool.name}" parameter "${dynamicPath}" is a dynamic selector. ` +
					'Do not use $fromAI for this value. Load skill agent-builder-resource-locators, ' +
					'resolve a credential if missing, then call get_resource_locator_options ' +
					'and write the returned parameterValue into nodeParameters.',
			});
		}
	}

	return errors.length === 0 ? null : errors;
}
