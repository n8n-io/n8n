import type { BuiltTool } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';

import { createToolRegistry } from '../tool-registry';
import { DOMAIN_TOOL_IDS } from '../tools/tool-ids';
import type { InstanceAiToolRegistry } from '../types';

interface CapturedTypeDefinition {
	nodeType: string;
	version?: string | number;
	content: string;
	builderHint?: string;
}

/** Cache key for a single `type-definition` request — disambiguates split nodes by discriminator. */
function typeDefinitionCacheKey(request: unknown): string {
	if (typeof request === 'string') return request;
	if (isRecord(request) && typeof request.nodeType === 'string') {
		const { nodeType, resource, operation, mode } = request;
		return [nodeType, resource, operation, mode]
			.filter((part): part is string => typeof part === 'string')
			.join('::');
	}
	return JSON.stringify(request);
}

/**
 * Wrap the `nodes` tool so every `type-definition` call the scout makes is
 * captured verbatim into `capture`, keyed by request. The scout's instructions
 * tell it to fetch definitions only for the nodes it recommends, so this
 * capture doubles as the host's source of truth for the final result — the
 * scout no longer has to re-paste the content itself (see
 * `appendCapturedTypeDefinitions`).
 */
export function wrapNodesToolForTypeDefinitionCapture(
	tools: InstanceAiToolRegistry,
	capture: Map<string, CapturedTypeDefinition>,
): InstanceAiToolRegistry {
	const nodesTool = tools.get(DOMAIN_TOOL_IDS.NODES);
	if (!nodesTool) return tools;

	const wrapped: BuiltTool = {
		...nodesTool,
		handler: async (input, ctx) => {
			const result = await nodesTool.handler?.(input, ctx);
			const definitions: unknown = isRecord(result) ? result.definitions : undefined;
			if (
				isRecord(input) &&
				input.action === 'type-definition' &&
				Array.isArray(input.nodeTypes) &&
				Array.isArray(definitions)
			) {
				input.nodeTypes.forEach((request: unknown, index: number) => {
					const definition: unknown = definitions[index];
					if (
						isRecord(definition) &&
						typeof definition.nodeType === 'string' &&
						typeof definition.content === 'string' &&
						definition.content
					) {
						capture.set(typeDefinitionCacheKey(request), {
							nodeType: definition.nodeType,
							...(typeof definition.version === 'string' || typeof definition.version === 'number'
								? { version: definition.version }
								: {}),
							content: definition.content,
							...(typeof definition.builderHint === 'string'
								? { builderHint: definition.builderHint }
								: {}),
						});
					}
				});
			}
			return result;
		},
	};

	const next = createToolRegistry(tools);
	next.set(DOMAIN_TOOL_IDS.NODES, wrapped);
	return next;
}

/** Append the host-captured, verbatim type definitions after the scout's compact debrief. */
export function appendCapturedTypeDefinitions(
	result: string,
	captured: Map<string, CapturedTypeDefinition>,
): string {
	if (captured.size === 0) return result;

	const blocks = Array.from(captured.values()).map(
		({ nodeType, version, content, builderHint }) => {
			const heading = version !== undefined ? `${nodeType} (v${version})` : nodeType;
			const hint = builderHint ? `\n\n${builderHint}` : '';
			return `### ${heading}\n\n${content}${hint}`;
		},
	);

	return `${result}\n\n## Type definitions\n\n${blocks.join('\n\n')}`;
}

export function createTypeDefinitionCapture(): Map<string, CapturedTypeDefinition> {
	return new Map();
}
