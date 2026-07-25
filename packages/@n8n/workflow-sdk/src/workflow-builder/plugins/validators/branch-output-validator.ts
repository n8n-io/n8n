/**
 * Branch Output Validator
 *
 * Flags IF / Switch nodes that are in the graph but missing wired outputs.
 * The common builder bug is calling `.onTrue()` / `.onFalse()` / `.onCase()`
 * as standalone statements after `export default` — those never reach the
 * builder, so the branch node has empty main outputs.
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

function wiredMainOutputIndices(graphNode: GraphNode): Set<number> {
	const wired = new Set<number>();

	const mainConns = graphNode.connections.get('main');
	if (mainConns) {
		for (const [outputIndex, targets] of mainConns) {
			if (targets.length > 0) {
				wired.add(outputIndex);
			}
		}
	}

	if (typeof graphNode.instance.getConnections === 'function') {
		for (const conn of graphNode.instance.getConnections()) {
			if (resolveTargetNodeName(conn.target) !== undefined) {
				wired.add(conn.outputIndex ?? 0);
			}
		}
	}

	return wired;
}

function switchRuleCount(parameters: Record<string, unknown>): number {
	const rules = parameters.rules;
	if (!isRecord(rules)) return 0;
	const values = rules.values ?? rules.rules;
	return Array.isArray(values) ? values.length : 0;
}

/**
 * Validator for unwired IF/Switch branch outputs.
 */
export const branchOutputValidator: ValidatorPlugin = {
	id: 'core:branch-output',
	name: 'Branch Output Validator',
	nodeTypes: [NODE_TYPES.IF, NODE_TYPES.SWITCH],
	priority: 35,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const wired = wiredMainOutputIndices(graphNode);
		const issues: ValidationIssue[] = [];

		if (node.type === NODE_TYPES.IF) {
			const missing: string[] = [];
			if (!wired.has(0)) missing.push('true (.onTrue / output 0)');
			if (!wired.has(1)) missing.push('false (.onFalse / output 1)');
			if (missing.length === 0) return issues;

			issues.push({
				code: 'BRANCH_OUTPUT_NOT_WIRED',
				message:
					`'${node.name}' IF node is missing wired branch(es): ${missing.join(' and ')}. ` +
					'Wire branches on the workflow builder chain ' +
					'(`.to(ifNode).onTrue(...).onFalse(...)` or `.to(ifNode.onTrue(...).onFalse(...))`), ' +
					'not as standalone statements on the IF variable after `export default` — those are dropped.',
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
			});
			return issues;
		}

		if (node.type === NODE_TYPES.SWITCH) {
			const parameters = node.config?.parameters;
			const ruleCount = isRecord(parameters) ? switchRuleCount(parameters) : 0;
			if (ruleCount === 0) return issues;

			const missingIndices: number[] = [];
			for (let i = 0; i < ruleCount; i++) {
				if (!wired.has(i)) missingIndices.push(i);
			}
			if (missingIndices.length === 0) return issues;

			issues.push({
				code: 'BRANCH_OUTPUT_NOT_WIRED',
				message:
					`'${node.name}' Switch node has ${ruleCount} rule(s) but missing wired case(s): ` +
					`${missingIndices.map((i) => `.onCase(${i}, …)`).join(', ')}. ` +
					'Wire cases on the workflow builder chain with zero-based `.onCase(index, target)`, ' +
					'not as standalone statements after `export default`.',
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
			});
		}

		return issues;
	},
};
