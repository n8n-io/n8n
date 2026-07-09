import { extractFromAIParameters } from '@n8n/ai-utilities/fromai-helpers';
import type { AgentJsonToolConfig } from '@n8n/api-types';
import type { INodeParameters } from 'n8n-workflow';

import { resolveBuiltinNodeDefinitionDirs } from '@/modules/instance-ai/node-definition-resolver';

type NodeToolConfig = Extract<AgentJsonToolConfig, { type: 'node' }>;

/**
 * Throws when a node tool's parameters contain a malformed `$fromAI`
 * expression. Shared by the config save path and inline-agent execution.
 */
export function validateNodeToolExpressions(tools: AgentJsonToolConfig[] | undefined): void {
	for (const tool of tools ?? []) {
		if (tool.type !== 'node') continue;

		extractFromAIParameters((tool.node.nodeParameters ?? {}) as INodeParameters);
	}
}

/**
 * Validate node tool configurations against their JSON-Schema definitions.
 * Returns a combined error message, or `null` when every tool is valid.
 */
export async function validateNodeToolConfigs(
	tools: AgentJsonToolConfig[] | undefined,
): Promise<string | null> {
	const nodeTools = (tools ?? []).filter((t): t is NodeToolConfig => t.type === 'node');

	if (nodeTools.length === 0) return null;

	const { setSchemaBaseDirs, validateNodeConfig } = await import('@n8n/workflow-sdk');

	const dirs = resolveBuiltinNodeDefinitionDirs();
	if (dirs.length > 0) {
		setSchemaBaseDirs(dirs);
	}

	const errors: string[] = [];

	for (const tool of nodeTools) {
		const nodeType: string = tool.node.nodeType;
		const nodeTypeVersion: number = tool.node.nodeTypeVersion;
		const nodeParameters = tool.node.nodeParameters ?? {};

		const result = validateNodeConfig(
			nodeType,
			nodeTypeVersion,
			{ parameters: nodeParameters },
			{ isToolNode: true },
		);

		if (!result.valid) {
			const messages = result.errors
				.map((e: { path: string; message: string }) => e.message)
				.join('; ');
			errors.push(`Node tool "${tool.name}" (${nodeType}@${nodeTypeVersion}): ${messages}`);
		}
	}

	return errors.length > 0 ? errors.join('\n') : null;
}
