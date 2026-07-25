/**
 * Output Fixture Validator
 *
 * - OUTPUT_FIXTURE_ITEM_ENVELOPE: SDK `output` mocks are raw $json objects.
 *   Wrapping them as `{ json: { ... } }` double-nests and breaks every
 *   downstream `$json.field` path.
 * - MISSING_OUTPUT_FIXTURE: triggers / HTTP Request / unresolved-credential
 *   nodes whose fields are read downstream need a declared `output`, or
 *   shape-aware validators (expression-path, pagination, LLM text path) go dark.
 */

import { isRecord } from '@n8n/utils/is-record';

import { isHttpRequestType, isWebhookType } from '../../../constants/node-types';
import { isNodeChain, type GraphNode, type NodeInstance } from '../../../types/base';
import { isTriggerNodeType } from '../../../utils/trigger-detection';
import { extractExpressions } from '../../validation-helpers';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const CODE_NODE_TYPE = 'n8n-nodes-base.code';

/** Triggers that rarely need fixtures for downstream field reads. */
const FIXTURE_OPTIONAL_TRIGGERS = new Set([
	'n8n-nodes-base.manualTrigger',
	'n8n-nodes-base.scheduleTrigger',
	'n8n-nodes-base.cron',
	'n8n-nodes-base.start',
]);

function resolveTargetNodeName(target: unknown): string | undefined {
	if (!target) return undefined;
	if (
		typeof target === 'object' &&
		'node' in target &&
		typeof (target as { node: unknown }).node === 'object'
	) {
		return (target as { node: { name?: string } }).node?.name;
	}
	if (isNodeChain(target)) {
		return target.head.name;
	}
	if (typeof target === 'object' && 'name' in target) {
		return (target as { name: string }).name;
	}
	return undefined;
}

function mainSuccessors(sourceName: string, nodes: ReadonlyMap<string, GraphNode>): string[] {
	const graphNode = nodes.get(sourceName);
	if (!graphNode) return [];

	const names: string[] = [];
	const mainConns = graphNode.connections.get('main');
	if (mainConns) {
		for (const [_outputIndex, targets] of mainConns) {
			for (const target of targets) {
				names.push(target.node);
			}
		}
	}
	if (typeof graphNode.instance.getConnections === 'function') {
		for (const conn of graphNode.instance.getConnections()) {
			const name = resolveTargetNodeName(conn.target);
			if (name) names.push(name);
		}
	}
	return [...new Set(names)];
}

function hasDeclaredOutput(node: NodeInstance<string, string, unknown>): boolean {
	const output = node.config?.output;
	return Array.isArray(output) && output.length > 0;
}

function isItemEnvelope(item: unknown): boolean {
	if (!isRecord(item)) return false;
	if (!('json' in item) || !isRecord(item.json)) return false;
	// Pure envelope: only `json` (optionally paired with `pairedItem`/`binary`).
	const keys = Object.keys(item).filter((key) => key !== 'pairedItem' && key !== 'binary');
	return keys.length === 1 && keys[0] === 'json';
}

function isUnresolvedNewCredential(cred: unknown): boolean {
	if (!isRecord(cred)) return false;
	if (!('__newCredential' in cred) || cred.__newCredential !== true) return false;
	const id = 'id' in cred ? cred.id : undefined;
	return typeof id !== 'string' || id.length === 0;
}

function hasUnresolvedNewCredential(node: NodeInstance<string, string, unknown>): boolean {
	const creds = node.config?.credentials;
	if (!creds || !isRecord(creds)) return false;
	return Object.values(creds).some(isUnresolvedNewCredential);
}

function needsOutputFixture(node: NodeInstance<string, string, unknown>): boolean {
	if (isHttpRequestType(node.type) || isWebhookType(node.type)) {
		return true;
	}
	if (isTriggerNodeType(node.type) && !FIXTURE_OPTIONAL_TRIGGERS.has(node.type)) {
		return true;
	}
	return hasUnresolvedNewCredential(node);
}

function readsInputJson(node: NodeInstance<string, string, unknown>): boolean {
	const params = node.config?.parameters;
	if (!isRecord(params)) return false;

	for (const { expression } of extractExpressions(params)) {
		if (
			expression.includes('$json') ||
			expression.includes('$input.') ||
			/\$\(\s*['"]/.test(expression)
		) {
			return true;
		}
	}

	if (node.type === CODE_NODE_TYPE && typeof params.jsCode === 'string') {
		const code = params.jsCode;
		return (
			code.includes('$json') ||
			code.includes('$input.') ||
			code.includes('items') ||
			/\$\(\s*['"]/.test(code)
		);
	}

	return false;
}

function hasDownstreamJsonConsumer(
	sourceName: string,
	nodes: ReadonlyMap<string, GraphNode>,
): boolean {
	const visited = new Set<string>();
	const queue = [...mainSuccessors(sourceName, nodes)];

	while (queue.length > 0) {
		const name = queue.shift();
		if (!name || visited.has(name)) continue;
		visited.add(name);

		const graphNode = nodes.get(name);
		if (!graphNode) continue;
		if (readsInputJson(graphNode.instance)) {
			return true;
		}
		queue.push(...mainSuccessors(name, nodes));
	}

	return false;
}

/**
 * Validator for SDK output fixture shape and presence.
 */
export const outputFixtureValidator: ValidatorPlugin = {
	id: 'core:output-fixture',
	name: 'Output Fixture Validator',
	priority: 42,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[] {
		const issues: ValidationIssue[] = [];
		const output = node.config?.output;

		if (Array.isArray(output)) {
			for (let i = 0; i < output.length; i++) {
				if (!isItemEnvelope(output[i])) continue;
				issues.push({
					code: 'OUTPUT_FIXTURE_ITEM_ENVELOPE',
					message:
						`'${node.name}' declares output[${i}] as an n8n runtime item envelope \`{ json: { ... } }\`. ` +
						'SDK node output mocks are raw $json objects — use `output: [{ field: value }]` not ' +
						'`output: [{ json: { field: value } }]`. The envelope double-nests and makes every ' +
						'downstream `$json.field` path miss.',
					severity: 'warning',
					violationLevel: 'major',
					nodeName: node.name,
					parameterPath: `output[${i}]`,
				});
			}
		}

		if (
			needsOutputFixture(node) &&
			!hasDeclaredOutput(node) &&
			hasDownstreamJsonConsumer(node.name, ctx.nodes)
		) {
			issues.push({
				code: 'MISSING_OUTPUT_FIXTURE',
				message:
					`'${node.name}' has no declared \`output\` fixture, but downstream nodes read its fields via ` +
					'`$json` / `$input` / Code. Shape-aware validators (expression-path, HTTP pagination, LLM text path) ' +
					'no-op without declared output — add `output: [{ ... }]` matching the real payload shape ' +
					'(raw $json objects, not `{ json: ... }` envelopes).',
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
				parameterPath: 'output',
			});
		}

		return issues;
	},
};
