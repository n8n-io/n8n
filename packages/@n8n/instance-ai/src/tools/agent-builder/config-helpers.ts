/**
 * Pure helpers shared by read_config / write_config / patch_config.
 *
 * The hashing, freshness, empty-instructions, and `$fromAI` dynamic-selector
 * enforcement logic is reimplemented here (not delegated to the host) so the
 * instance-ai builder behaves identically to the CLI agent builder. The only
 * host dependency is the synchronous node-types provider used to read node
 * parameter metadata.
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
import { createHash } from 'node:crypto';

import {
	collectFromAiParameterReferences,
	hasMatchingFromAiParameterReference,
	type FromAiParameterReference,
} from './from-ai-node-parameters';
import type { AgentConfigSnapshot } from '../../types';

export const EMPTY_INSTRUCTIONS_ERROR: ConfigValidationError = {
	path: '/instructions',
	message:
		'Refusing to write an agent with empty instructions. Ask the user what the agent should do before calling write_config or patch_config again.',
};

export const STALE_CONFIG_ERROR: ConfigValidationError = {
	path: '(root)',
	message:
		'Agent config changed since you last read it. Call read_config and retry with the returned configHash.',
};

function canonicalizeJson(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalizeJson);
	if (typeof value !== 'object' || value === null) return value;
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(value as Record<string, unknown>).sort()) {
		sorted[key] = canonicalizeJson((value as Record<string, unknown>)[key]);
	}
	return sorted;
}

/** Stable SHA-256 of the canonicalized config — the `configHash` returned to the LLM. */
export function getAgentConfigHash(config: AgentJsonConfig | null): string | null {
	if (!config) return null;
	return createHash('sha256')
		.update(JSON.stringify(canonicalizeJson(config)))
		.digest('hex');
}

export interface HashedSnapshot extends AgentConfigSnapshot {
	configHash: string | null;
}

export function withConfigHash(snapshot: AgentConfigSnapshot): HashedSnapshot {
	return { ...snapshot, configHash: getAgentConfigHash(snapshot.config) };
}

export function rejectIfEmptyInstructions(
	config: AgentJsonConfig,
): { errors: ConfigValidationError[] } | null {
	if (!config.instructions.trim()) return { errors: [EMPTY_INSTRUCTIONS_ERROR] };
	return null;
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
 * tolerated so unrelated edits don't fail. Requires `nodeTypesProvider`; when
 * absent (pure-package contexts) the check is skipped.
 */
export function rejectIfDynamicSelectorUsesFromAi(
	config: AgentJsonConfig,
	previousConfig: AgentJsonConfig | null,
	nodeTypesProvider: INodeTypes | undefined,
): { errors: ConfigValidationError[] } | null {
	if (!nodeTypesProvider) return null;
	const errors: ConfigValidationError[] = [];

	for (const [toolIndex, tool] of (config.tools ?? []).entries()) {
		if (tool.type !== 'node') continue;

		const fromAiReferences = collectFromAiParameterReferences(tool.node.nodeParameters);
		if (fromAiReferences.length === 0) continue;

		let properties;
		try {
			properties = nodeTypesProvider.getByNameAndVersion(
				tool.node.nodeType,
				tool.node.nodeTypeVersion,
			).description.properties;
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
					'Do not use $fromAI for this value. Load the agent-builder resource-locators reference, ' +
					'resolve a credential if missing (credentials tool, action "list"), then call ' +
					'get_resource_locator_options and write the returned parameterValue into nodeParameters.',
			});
		}
	}

	return errors.length === 0 ? null : { errors };
}
