/**
 * Agent / Chat Model Pairing Validator
 *
 * Soft compatibility checks — there is no full version matrix yet:
 * - Agent should have a language model subnode
 * - Prefer lmChat* over deprecated lmOpenAi / lm* completions models
 * - Agent v2+ should not pair with ancient typeVersion < 1 on chat models
 */

import { isRecord } from '@n8n/utils/is-record';

import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const AGENT_TYPE = '@n8n/n8n-nodes-langchain.agent';
const DEPRECATED_MODEL_TYPES = new Set(['@n8n/n8n-nodes-langchain.lmOpenAi']);

function parseVersion(version: unknown): number {
	if (typeof version === 'number') return version;
	if (typeof version === 'string') {
		const parsed = Number.parseFloat(version);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
}

function asNodeInstance(value: unknown): NodeInstance<string, string, unknown> | undefined {
	if (!isRecord(value)) return undefined;
	if (typeof value.type !== 'string' || typeof value.name !== 'string') return undefined;
	return value as unknown as NodeInstance<string, string, unknown>;
}

function collectModelSubnodes(
	node: NodeInstance<string, string, unknown>,
): Array<NodeInstance<string, string, unknown>> {
	const subnodes = node.config?.subnodes;
	if (!isRecord(subnodes)) return [];
	const models: Array<NodeInstance<string, string, unknown>> = [];
	for (const key of ['model', 'languageModel']) {
		const value = subnodes[key];
		const entries = Array.isArray(value) ? value : value !== undefined ? [value] : [];
		for (const entry of entries) {
			const instance = asNodeInstance(entry);
			if (instance) models.push(instance);
		}
	}
	return models;
}

/**
 * Validator for Agent ↔ language-model pairing heuristics.
 */
export const agentModelPairingValidator: ValidatorPlugin = {
	id: 'core:agent-model-pairing',
	name: 'Agent Model Pairing Validator',
	nodeTypes: [AGENT_TYPE],
	priority: 48,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const issues: ValidationIssue[] = [];
		const models = collectModelSubnodes(node);
		const agentVersion = parseVersion(node.version);

		if (models.length === 0) {
			issues.push({
				code: 'AGENT_MODEL_PAIRING',
				message:
					`'${node.name}' has no language model subnode. Attach one with languageModel(...) / ` +
					'subnodes.model (prefer lmChat* chat models).',
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
				parameterPath: 'subnodes.model',
			});
			return issues;
		}

		for (const model of models) {
			if (DEPRECATED_MODEL_TYPES.has(model.type)) {
				issues.push({
					code: 'AGENT_MODEL_PAIRING',
					message:
						`'${node.name}' pairs with deprecated/non-chat model '${model.name}' [${model.type}]. ` +
						'Prefer an lmChat* chat model (e.g. lmChatOpenAi) for AI Agent workflows.',
					severity: 'warning',
					violationLevel: 'minor',
					nodeName: node.name,
					parameterPath: 'subnodes.model',
				});
			}

			const modelVersion = parseVersion(model.version);
			if (agentVersion >= 2 && modelVersion > 0 && modelVersion < 1) {
				issues.push({
					code: 'AGENT_MODEL_PAIRING',
					message:
						`'${node.name}' (typeVersion ${agentVersion}) pairs with '${model.name}' ` +
						`typeVersion ${modelVersion}. Use a current chat-model typeVersion (>= 1).`,
					severity: 'warning',
					violationLevel: 'minor',
					nodeName: node.name,
					parameterPath: 'subnodes.model',
				});
			}
		}

		return issues;
	},
};
