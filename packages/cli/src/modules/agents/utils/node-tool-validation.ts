import { extractFromAIParameters } from '@n8n/ai-utilities/fromai-helpers';
import type { AgentJsonToolConfig } from '@n8n/api-types';
import type { INodeParameters } from 'n8n-workflow';

import { resolveBuiltinNodeDefinitionDirs } from '@/modules/instance-ai/node-definition-resolver';
import {
	isUnsupportedEphemeralNodeOperation,
	unsupportedEphemeralNodeOperationMessage,
} from '@/node-execution/node-tool-operation-support';

type NodeToolConfig = Extract<AgentJsonToolConfig, { type: 'node' }>;

/**
 * Throws when a node tool's parameters contain a malformed `$fromAI`
 * expression.
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

	const { getSchemaBaseDirs, setSchemaBaseDirs, validateNodeConfig } = await import(
		'@n8n/workflow-sdk'
	);

	// setSchemaBaseDirs clears the SDK's module-global schema cache even when
	// the dirs are unchanged — and this now runs per item on the inline agent
	// execution path, so only (re)set on an actual change.
	const dirs = resolveBuiltinNodeDefinitionDirs();
	if (dirs.length > 0 && dirs.join('\n') !== getSchemaBaseDirs().join('\n')) {
		setSchemaBaseDirs(dirs);
	}

	const errors: string[] = [];

	for (const tool of nodeTools) {
		const nodeType: string = tool.node.nodeType;
		const nodeTypeVersion: number = tool.node.nodeTypeVersion;
		const nodeParameters = tool.node.nodeParameters ?? {};
		const operation = nodeParameters.operation;

		if (isUnsupportedEphemeralNodeOperation(operation)) {
			errors.push(
				`Node tool "${tool.name}" (${nodeType}@${nodeTypeVersion}): ${unsupportedEphemeralNodeOperationMessage(operation)}`,
			);
			continue;
		}

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
