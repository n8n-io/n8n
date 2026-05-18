/**
 * Unknown Config Keys Validator Plugin
 *
 * Detects keys at the top level of a node's `config` that aren't recognized
 * `NodeConfig` fields. These keys are silently dropped during serialization,
 * which is a common failure mode for LLM-based MCP clients that pattern-match
 * the SDK shape and place node parameters directly under `config` instead of
 * `config.parameters`.
 *
 * Without this check, `validate_workflow` returns `valid: true` even though
 * the resulting workflow has empty parameters and only fails at execution
 * time with a generic "Unknown error".
 *
 * See https://github.com/n8n-io/n8n/issues/29154
 */

import type { GraphNode, NodeInstance } from '../../../types/base';
import type { ValidatorPlugin, ValidationIssue, PluginContext } from '../types';

/**
 * Top-level keys recognized by `NodeConfig`. Keys outside this set are dropped
 * by the JSON serializer. Keep in sync with the `NodeConfig` interface in
 * `types/base.ts`.
 */
const KNOWN_CONFIG_KEYS: ReadonlySet<string> = new Set([
	'parameters',
	'credentials',
	'name',
	'position',
	'webhookId',
	'disabled',
	'notes',
	'notesInFlow',
	'executeOnce',
	'retryOnFail',
	'alwaysOutputData',
	'onError',
	'pinData',
	'output',
	'subnodes',
]);

function formatKeys(keys: string[]): string {
	return keys.map((k) => `"${k}"`).join(', ');
}

export const unknownConfigKeysValidator: ValidatorPlugin = {
	id: 'core:unknown-config-keys',
	name: 'Unknown Config Keys Validator',
	priority: 50,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const config = node.config as Record<string, unknown> | undefined;
		if (!config) return [];

		const unknownKeys = Object.keys(config).filter(
			// Internal markers (e.g. `_originalName` set by fromJSON) are intentional
			// and not part of the public NodeConfig contract.
			(key) => !KNOWN_CONFIG_KEYS.has(key) && !key.startsWith('_'),
		);

		if (unknownKeys.length === 0) return [];

		return [
			{
				code: 'UNKNOWN_CONFIG_KEY',
				message: `Node '${node.name}' has unknown key(s) at the top level of config: ${formatKeys(unknownKeys)}. Did you mean to place them inside config.parameters? Top-level keys outside the NodeConfig fields are silently dropped during serialization, leaving the node with empty parameters.`,
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
			},
		];
	},
};
