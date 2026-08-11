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

import type { GraphNode, NodeConfig, NodeInstance } from '../../../types/base';
import {
	type ValidatorPlugin,
	type ValidationIssue,
	type PluginContext,
	formatNodeRef,
} from '../types';

// The `Record<keyof NodeConfig, true>` annotation makes TypeScript the source
// of truth: if a field is added to `NodeConfig`, the literal errors with
// "Property '<new field>' is missing"; if a field is removed, the literal
// errors because the listed key is no longer assignable.
const KNOWN_CONFIG_KEY_MAP: Record<keyof NodeConfig, true> = {
	parameters: true,
	credentials: true,
	name: true,
	position: true,
	webhookId: true,
	disabled: true,
	notes: true,
	notesInFlow: true,
	executeOnce: true,
	retryOnFail: true,
	maxTries: true,
	waitBetweenTries: true,
	alwaysOutputData: true,
	onError: true,
	extendsCredential: true,
	pinData: true,
	output: true,
	subnodes: true,
};

const KNOWN_CONFIG_KEYS: ReadonlySet<string> = new Set(Object.keys(KNOWN_CONFIG_KEY_MAP));

export const unknownConfigKeysValidator: ValidatorPlugin = {
	id: 'core:unknown-config-keys',
	name: 'Unknown Config Keys Validator',
	priority: 50,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		if (!node.config) return [];

		const unknownKeys = Object.keys(node.config).filter(
			// Internal markers (e.g. `_originalName` set by fromJSON) are intentional
			// and not part of the public NodeConfig contract.
			(key) => !KNOWN_CONFIG_KEYS.has(key) && !key.startsWith('_'),
		);

		if (unknownKeys.length === 0) return [];

		const nodeRef = formatNodeRef(node.name, undefined, node.type);
		const keyList = unknownKeys.map((k) => `"${k}"`).join(', ');
		return [
			{
				code: 'UNKNOWN_CONFIG_KEY',
				message: `Node ${nodeRef} has unknown key(s) at the top level of config: ${keyList}. Did you mean to place them inside config.parameters? Top-level keys outside the NodeConfig fields are silently dropped during serialization, leaving the node with empty parameters.`,
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
			},
		];
	},
};
