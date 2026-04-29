import type { AgentJsonToolConfig } from '../json-config/agent-json-config';

export type AgentJsonNodeToolConfig = Extract<AgentJsonToolConfig, { type: 'node' }>;

/**
 * Mirrored node tools expose `toolDescription` as a node parameter, but the
 * agent config already has a top-level tool description. Keep generated configs
 * smaller by deriving the node parameter from that canonical description.
 */
export function withoutStaticNodeToolDescription(
	toolConfig: AgentJsonNodeToolConfig,
): AgentJsonNodeToolConfig {
	const nodeParameters = toolConfig.node.nodeParameters;
	if (!nodeParameters || !Object.prototype.hasOwnProperty.call(nodeParameters, 'toolDescription')) {
		return toolConfig;
	}

	const nodeParametersWithoutDescription = Object.fromEntries(
		Object.entries(nodeParameters).filter(([key]) => key !== 'toolDescription'),
	);

	return {
		...toolConfig,
		node: {
			...toolConfig.node,
			nodeParameters: nodeParametersWithoutDescription,
		},
	};
}

export function withDynamicNodeToolDescription(
	toolConfig: AgentJsonNodeToolConfig,
): AgentJsonNodeToolConfig {
	const sanitizedToolConfig = withoutStaticNodeToolDescription(toolConfig);
	const description = toolConfig.description?.trim();
	if (!description) return sanitizedToolConfig;

	const nodeParameters = sanitizedToolConfig.node.nodeParameters ?? {};

	return {
		...sanitizedToolConfig,
		node: {
			...sanitizedToolConfig.node,
			nodeParameters: {
				...nodeParameters,
				toolDescription: description,
			},
		},
	};
}
