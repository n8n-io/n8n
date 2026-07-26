/**
 * Error Routes Validator
 *
 * Ensures nodes with `onError: 'continueErrorOutput'` wire their error output
 * (main[resolveErrorOutputIndex]) and that no connection leaves a main output
 * port the node does not expose. Mirrors instance-ai's error_routes_consistent
 * check, aligned with SDK `.onError()` / foldLegacyErrorConnections semantics.
 */

import { isRecord } from '@n8n/utils/is-record';

import { NODE_TYPES } from '../../../constants/node-types';
import {
	isNodeChain,
	resolveErrorOutputIndex,
	type ConnectionTarget,
	type GraphNode,
	type IDataObject,
	type NodeInstance,
} from '../../../types/base';
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

function switchRuleCount(parameters: IDataObject): number {
	const rules = parameters.rules;
	if (!isRecord(rules)) return 0;
	const values = rules.values ?? rules.rules;
	return Array.isArray(values) ? values.length : 0;
}

/** Main outputs the node type exposes before the optional error pin. */
function naturalMainOutputCount(type: string, parameters: IDataObject): number {
	if (type === NODE_TYPES.IF) return 2;
	if (type === NODE_TYPES.SPLIT_IN_BATCHES) return 2;
	if (type === NODE_TYPES.SWITCH) {
		const ruleCount = switchRuleCount(parameters);
		if (ruleCount === 0) return 0;
		const options = isRecord(parameters.options) ? parameters.options : undefined;
		return options?.fallbackOutput === 'extra' ? ruleCount + 1 : ruleCount;
	}
	return 1;
}

function maxAllowedMainOutputIndex(
	type: string,
	parameters: IDataObject,
	onError: string | undefined,
): number {
	const natural = naturalMainOutputCount(type, parameters);
	if (natural === 0) return -1;
	if (onError === 'continueErrorOutput') {
		return resolveErrorOutputIndex(type, parameters);
	}
	return natural - 1;
}

function hasContinueErrorOutput(node: NodeInstance<string, string, unknown>): boolean {
	return node.config?.onError === 'continueErrorOutput';
}

/**
 * Validator for continueErrorOutput routing and illegal main output indices.
 */
export const errorRoutesValidator: ValidatorPlugin = {
	id: 'core:error-routes',
	name: 'Error Routes Validator',
	priority: 33,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const issues: ValidationIssue[] = [];
		const parameters: IDataObject = isRecord(node.config?.parameters) ? node.config.parameters : {};
		const wired = wiredMainOutputIndices(graphNode);
		const onError = node.config?.onError;
		const allowedMax = maxAllowedMainOutputIndex(node.type, parameters, onError);

		for (const outputIndex of wired) {
			if (outputIndex <= allowedMax) continue;
			issues.push({
				code: 'ERROR_OUTPUT_INVALID_PORT',
				message:
					`'${node.name}' has a connection from main output ${outputIndex}, but it only exposes ` +
					`outputs 0-${allowedMax}` +
					(onError === 'continueErrorOutput'
						? ` (including the error pin at main[${resolveErrorOutputIndex(node.type, parameters)}] from onError: 'continueErrorOutput')`
						: " (set onError: 'continueErrorOutput' and use .onError(handler) to add an error pin)") +
					'.',
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
			});
		}

		if (!hasContinueErrorOutput(node)) return issues;

		const errorIndex = resolveErrorOutputIndex(node.type, parameters);
		if (wired.has(errorIndex)) return issues;

		const naturalMax = naturalMainOutputCount(node.type, parameters) - 1;
		const successWired =
			naturalMainOutputCount(node.type, parameters) === 1 &&
			[...wired].some((index) => index >= 0 && index <= naturalMax);

		if (successWired) {
			issues.push({
				code: 'ERROR_OUTPUT_MISROUTED',
				message:
					`'${node.name}' sets onError: 'continueErrorOutput' but its error output main[${errorIndex}] ` +
					'is unwired while the success output carries downstream nodes. Failures route to the error ' +
					`pin, not the success output — wire the handler with .onError(handler) (main[${errorIndex}]), ` +
					'not .to(handler) on the success path.',
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
			});
			return issues;
		}

		issues.push({
			code: 'ERROR_OUTPUT_NOT_WIRED',
			message:
				`'${node.name}' sets onError: 'continueErrorOutput' but its error output main[${errorIndex}] ` +
				'is wired to nothing — HTTP/API failures are dropped silently. Connect a handler with .onError(handler).',
			severity: 'warning',
			violationLevel: 'major',
			nodeName: node.name,
		});

		return issues;
	},
};
