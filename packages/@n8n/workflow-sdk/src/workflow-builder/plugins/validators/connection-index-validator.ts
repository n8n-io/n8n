/**
 * Connection Index Validator
 *
 * Graph-level bounds for well-known control-flow nodes without requiring a
 * full INodeTypes provider (IF / Switch / Split In Batches / Merge).
 */

import { isRecord } from '@n8n/utils/is-record';

import { NODE_TYPES } from '../../../constants/node-types';
import { isNodeChain, type GraphNode, type NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

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

function maxWiredOutputIndex(graphNode: GraphNode): number {
	let max = -1;
	const mainConns = graphNode.connections.get('main');
	if (mainConns) {
		for (const [outputIndex, targets] of mainConns) {
			if (targets.length > 0) max = Math.max(max, outputIndex);
		}
	}
	if (typeof graphNode.instance.getConnections === 'function') {
		for (const conn of graphNode.instance.getConnections()) {
			if (resolveTargetNodeName(conn.target) !== undefined) {
				max = Math.max(max, conn.outputIndex ?? 0);
			}
		}
	}
	return max;
}

function resolveSwitchAllowedMax(parameters: Record<string, unknown>): number | undefined {
	const rules = parameters.rules;
	const values =
		isRecord(rules) && Array.isArray(rules.values)
			? rules.values
			: isRecord(rules) && Array.isArray(rules.rules)
				? rules.rules
				: undefined;
	if (!values) return undefined;

	const ruleCount = values.length;
	if (ruleCount === 0) return undefined;

	const options = isRecord(parameters.options) ? parameters.options : undefined;
	const fallback = options?.fallbackOutput;
	// Outputs 0..ruleCount-1 for rules; fallbackOutput === 'extra' adds index ruleCount.
	if (fallback === 'extra') {
		return ruleCount;
	}
	return ruleCount - 1;
}

function mergeMaxInputIndex(parameters: Record<string, unknown>): number {
	const numberInputs = parameters.numberInputs;
	if (typeof numberInputs === 'number' && numberInputs >= 2) {
		return numberInputs - 1;
	}
	// Default Merge has 2 inputs (indices 0 and 1).
	return 1;
}

function collectMergeInputIndices(
	mapKey: string,
	originalName: string,
	ctx: PluginContext,
): Set<number> {
	const indices = new Set<number>();
	for (const graphNode of ctx.nodes.values()) {
		const mainConns = graphNode.connections.get('main');
		if (mainConns) {
			for (const targets of mainConns.values()) {
				for (const target of targets) {
					if (target.node === mapKey) {
						indices.add(target.index);
					}
				}
			}
		}
		if (typeof graphNode.instance.getConnections === 'function') {
			for (const conn of graphNode.instance.getConnections()) {
				const target = conn.target;
				const targetName =
					typeof target === 'object' && target !== null && 'name' in target
						? (target as { name: string }).name
						: typeof target === 'object' &&
								target !== null &&
								'node' in target &&
								typeof (target as { node: { name?: string } }).node === 'object'
							? (target as { node: { name?: string } }).node.name
							: undefined;
				const inputIndex =
					typeof target === 'object' &&
					target !== null &&
					'_isInputTarget' in target &&
					typeof (target as { inputIndex?: number }).inputIndex === 'number'
						? (target as { inputIndex: number }).inputIndex
						: (conn.targetInputIndex ?? 0);
				if (targetName === mapKey || targetName === originalName) {
					indices.add(inputIndex);
				}
			}
		}
	}
	return indices;
}

/**
 * Validator for out-of-range IF/Switch/SIB/Merge connection indices.
 */
export const connectionIndexValidator: ValidatorPlugin = {
	id: 'core:connection-index',
	name: 'Connection Index Validator',
	priority: 34,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[] {
		const issues: ValidationIssue[] = [];
		const type = node.type;

		if (type === NODE_TYPES.IF) {
			const maxWired = maxWiredOutputIndex(graphNode);
			if (maxWired > 1) {
				issues.push({
					code: 'INVALID_OUTPUT_INDEX',
					message:
						`'${node.name}' IF node only has outputs 0 (true) and 1 (false)` +
						(node.config?.onError === 'continueErrorOutput'
							? ', plus an error pin via .onError()'
							: '') +
						`. Connection uses output index ${maxWired}.`,
					severity: 'warning',
					violationLevel: 'major',
					nodeName: node.name,
				});
			}
			return issues;
		}

		if (type === NODE_TYPES.SPLIT_IN_BATCHES) {
			const maxWired = maxWiredOutputIndex(graphNode);
			if (maxWired > 1) {
				issues.push({
					code: 'INVALID_OUTPUT_INDEX',
					message:
						`'${node.name}' Split In Batches only has outputs 0 (done) and 1 (each batch). ` +
						`Connection uses output index ${maxWired}.`,
					severity: 'warning',
					violationLevel: 'major',
					nodeName: node.name,
				});
			}
			return issues;
		}

		if (type === NODE_TYPES.SWITCH) {
			const parameters = node.config?.parameters;
			if (!isRecord(parameters)) return issues;
			const allowedMax = resolveSwitchAllowedMax(parameters);
			if (allowedMax === undefined || allowedMax < 0) return issues;
			const maxWired = maxWiredOutputIndex(graphNode);
			if (maxWired > allowedMax) {
				issues.push({
					code: 'INVALID_OUTPUT_INDEX',
					message:
						`'${node.name}' Switch connection uses output index ${maxWired}, but only indices ` +
						`0-${allowedMax} are valid for its rules` +
						(isRecord(parameters.options) && parameters.options.fallbackOutput === 'extra'
							? ' (+ fallback)'
							: '') +
						'.',
					severity: 'warning',
					violationLevel: 'major',
					nodeName: node.name,
				});
			}
			return issues;
		}

		if (type === NODE_TYPES.MERGE) {
			const parameters = isRecord(node.config?.parameters) ? node.config.parameters : {};
			const allowedMax = mergeMaxInputIndex(parameters);
			const wired = collectMergeInputIndices(node.name, node.name, ctx);
			for (const index of wired) {
				if (index > allowedMax) {
					issues.push({
						code: 'INVALID_INPUT_INDEX',
						message:
							`Connection to '${node.name}' uses input index ${index}, but Merge only has ` +
							`inputs 0-${allowedMax} (numberInputs=${allowedMax + 1}).`,
						severity: 'warning',
						violationLevel: 'major',
						nodeName: node.name,
					});
				}
			}
		}

		return issues;
	},
};
