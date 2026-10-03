/**
 * Loop Wiring Validator
 *
 * Finds Loop Over Items (Split in Batches) wiring that runs without an error but gives wrong
 * results: a loop that never advances, `done` and `loop` swapped, items that leave the body
 * and so end the loop early, an inner loop that keeps its state, and a Merge inside a body.
 */

import type { WorkflowJSON } from '../../../types/base';
import { isInputTarget } from '../../node-builders/node-builder';
import { parseVersion } from '../../string-utils';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const LOOP_TYPE = 'n8n-nodes-base.splitInBatches';
const MERGE_TYPES = new Set([
	'n8n-nodes-base.merge',
	'@n8n/nodes-base-next.mergeAppend',
	'@n8n/nodes-base-next.mergeCombine',
]);
const IF_TYPES = new Set(['n8n-nodes-base.if', '@n8n/nodes-base-next.conditionIf']);
const SWITCH_TYPE = 'n8n-nodes-base.switch';
const FILTER_TYPE = 'n8n-nodes-base.filter';
/** The Switch contract: one output per case, then `fallback`. */
const CONTRACT_SWITCH_TYPE = '@n8n/nodes-base-next.conditionSwitch';
/** The Filter contract: `kept`, then `discarded`. */
const CONTRACT_FILTER_TYPE = '@n8n/nodes-base-next.conditionFilter';
const STOP_TYPES = new Set([
	'n8n-nodes-base.stopAndError',
	'@n8n/nodes-base-next.stopAndErrorStop',
]);

export interface LoopWiringNode {
	readonly name: string;
	readonly type: string;
	readonly version: number;
	readonly parameters?: Record<string, unknown>;
}

export interface LoopWiringEdge {
	readonly from: string;
	readonly output: number;
	readonly to: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** The return nodes named in the Reset expression that `forEach` writes, if it is one. */
function resetReturns(node: LoopWiringNode): string[] | undefined {
	const options = node.parameters?.options;
	const reset = isRecord(options) ? options.reset : undefined;
	const list =
		typeof reset === 'string'
			? /^=\{\{ !(\[.*\])\.includes\(\$prevNode\.name\) \}\}$/.exec(reset)?.[1]
			: undefined;
	try {
		const names: unknown = list === undefined ? undefined : JSON.parse(list);
		return Array.isArray(names) ? names.filter((name) => typeof name === 'string') : undefined;
	} catch {
		return undefined;
	}
}

/** Output slots of Loop Over Items. Version 2 has `loop` first, version 3 `done` first. */
function loopSlots(version: number) {
	return version >= 3 ? { done: 0, loop: 1 } : { done: 1, loop: 0 };
}

const listOf = (value: unknown): unknown[] => {
	if (Array.isArray(value)) return value;
	if (typeof value !== 'string') return [];
	try {
		const parsed: unknown = JSON.parse(value);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};

/**
 * The main outputs of a routing node, or `undefined` for a node that is not one. The fallback
 * of the Switch contract counts only when it connects: an open one is a legacy Switch without
 * a fallback output.
 */
function routingOutputs(node: LoopWiringNode, connects: (output: number) => boolean) {
	if (IF_TYPES.has(node.type) || node.type === CONTRACT_FILTER_TYPE) return 2;
	if (node.type === CONTRACT_SWITCH_TYPE) {
		const cases = listOf(node.parameters?.cases).length;
		return cases + (connects(cases) ? 1 : 0);
	}
	if (node.type !== SWITCH_TYPE) return undefined;
	const { mode, numberOutputs, rules, options } = node.parameters ?? {};
	if (mode === 'expression') return typeof numberOutputs === 'number' ? numberOutputs : 4;
	const values = isRecord(rules) && Array.isArray(rules.values) ? rules.values.length : 0;
	return values + (isRecord(options) && options.fallbackOutput === 'extra' ? 1 : 0);
}

function reach(start: readonly string[], step: (name: string) => readonly string[], stop: string) {
	const seen = new Set<string>();
	const queue = [...start];
	while (queue.length > 0) {
		const name = queue.shift();
		if (name === undefined || name === stop || seen.has(name)) continue;
		seen.add(name);
		queue.push(...step(name));
	}
	return seen;
}

const issue = (code: string, nodeName: string, message: string): ValidationIssue => ({
	code,
	message,
	nodeName,
	severity: 'error',
	violationLevel: 'major',
});

/** Problems in the wiring of each Loop Over Items node (version 2 and later). */
export function loopWiringIssues(
	nodes: readonly LoopWiringNode[],
	edges: readonly LoopWiringEdge[],
): ValidationIssue[] {
	const byName = new Map(nodes.map((node) => [node.name, node]));
	const targetsOf = (name: string, output?: number) =>
		edges
			.filter((edge) => edge.from === name && (output === undefined || edge.output === output))
			.map((edge) => edge.to);
	const sourcesOf = (name: string) =>
		edges.filter((edge) => edge.to === name).map((edge) => edge.from);
	const bodyOf = (loop: LoopWiringNode) =>
		reach(targetsOf(loop.name, loopSlots(loop.version).loop), (each) => targetsOf(each), loop.name);
	/** Sources of `name`, but for a loop node only the sources outside its own body. */
	const outerSources = (name: string) => {
		const node = byName.get(name);
		if (node?.type !== LOOP_TYPE) return sourcesOf(name);
		const inner = bodyOf(node);
		return sourcesOf(name).filter((source) => !inner.has(source));
	};

	return nodes
		.filter((node) => node.type === LOOP_TYPE && node.version >= 2)
		.flatMap((loop): ValidationIssue[] => {
			const name = loop.name;
			const slots = loopSlots(loop.version);
			const entries = targetsOf(name, slots.loop);
			const body = reach(entries, (each) => targetsOf(each), name);
			// The body of an inner loop belongs to that loop, so the walk goes on from its entry.
			const returns = reach(sourcesOf(name), (each) => outerSources(each), name);
			const members = new Set([...body].filter((member) => returns.has(member)));
			// Stop and Error fails the run, so its items are not lost without a sign.
			const returnsHome = (start: readonly string[]) =>
				start.some((target) => target === name || members.has(target)) ||
				(start.length > 0 &&
					start.every((target) => STOP_TYPES.has(byName.get(target)?.type ?? '')));
			// An inner loop may return to its outer loop node from its done output.
			const leadsBack = (start: readonly string[]) =>
				start.some(
					(target) =>
						target === name || (returns.has(target) && byName.get(target)?.type !== LOOP_TYPE),
				);

			if (entries.length === 0) {
				return [
					issue(
						'LOOP_BODY_MISSING',
						name,
						`'${name}' has nothing on its loop output (${slots.loop}), so no batch is processed. Connect the per-batch work to output ${slots.loop}.`,
					),
				];
			}
			if (leadsBack(targetsOf(name, slots.done))) {
				return [
					issue(
						'LOOP_OUTPUTS_SWAPPED',
						name,
						`The done output (${slots.done}) of '${name}' leads back into the loop. In version ${loop.version}, output ${slots.done} is done and output ${slots.loop} is loop.`,
					),
				];
			}
			if (members.size === 0 && !entries.includes(name)) {
				return [
					issue(
						'LOOP_NO_RETURN',
						name,
						`No node in the body of '${name}' connects back to it, so it processes only the first batch. Connect the end of the body to '${name}'.`,
					),
				];
			}

			const memberNodes = [...members].flatMap((member) => {
				const node = byName.get(member);
				return node ? [node] : [];
			});
			const dropped = memberNodes.flatMap((node) => {
				if (node.type === FILTER_TYPE) {
					return [
						issue(
							'LOOP_BRANCH_DROPS_ITEMS',
							node.name,
							`'${node.name}' in the body of '${name}' drops items. When it drops a whole batch, '${name}' stops early without an error. Use an IF node and route both outputs back to '${name}'.`,
						),
					];
				}
				const outputs = routingOutputs(node, (output) => targetsOf(node.name, output).length > 0);
				const lost = Array.from({ length: outputs ?? 0 }, (_, output) => output).filter(
					(output) => !returnsHome(targetsOf(node.name, output)),
				);
				return lost.length > 0
					? [
							issue(
								'LOOP_BRANCH_DROPS_ITEMS',
								node.name,
								`Items on output ${lost.join(', ')} of '${node.name}' never return to '${name}'. When a whole batch goes there, '${name}' stops early without an error. Route every output back to '${name}'.`,
							),
						]
					: [];
			});
			const nested = memberNodes
				.filter((node) => node.type === LOOP_TYPE && node.name !== name)
				.filter((node) => {
					const options = node.parameters?.options;
					const reset = isRecord(options) ? options.reset : undefined;
					// A reset that does not read `$prevNode` cannot tell an outer pass from a return.
					return !(
						typeof reset === 'string' &&
						reset.startsWith('=') &&
						reset.includes('$prevNode')
					);
				})
				.map((node) =>
					issue(
						'LOOP_NESTED_NO_RESET',
						node.name,
						`'${node.name}' is inside the loop of '${name}' and keeps its items between passes, so it skips work after the first pass. Set its Reset option to an expression on $prevNode that is true only when items come from outside '${node.name}', or use forEach in the typed SDK.`,
					),
				);
			const merges = memberNodes
				.filter((node) => MERGE_TYPES.has(node.type))
				.map((node) =>
					issue(
						'LOOP_MERGE_IN_BODY',
						node.name,
						`'${node.name}' merges inside the loop of '${name}'. It waits for both inputs on every pass, and an empty branch stops the loop. Merge after the loop instead.`,
					),
				);
			// A rename in the editor does not update the names in this expression.
			const named = resetReturns(loop);
			const backSources = [...members].filter((member) => targetsOf(member).includes(name));
			const stale =
				named && !isEqualSet(named, backSources)
					? [
							issue(
								'LOOP_RESET_STALE',
								name,
								`The Reset option of '${name}' names ${JSON.stringify(named)}, but the nodes that return to it are ${JSON.stringify([...backSources].sort())}. Update the names, or the loop starts again on every batch.`,
							),
						]
					: [];
			return [...dropped, ...nested, ...merges, ...stale];
		})
		.filter(
			(found, index, all) =>
				all.findIndex((other) => other.code === found.code && other.nodeName === found.nodeName) ===
				index,
		);
}

/** `loopWiringIssues` of saved workflow JSON. */
export function validateLoopWiring(json: WorkflowJSON): ValidationIssue[] {
	const nodes = json.nodes.flatMap((node): LoopWiringNode[] =>
		node.name === undefined
			? []
			: [
					{
						name: node.name,
						type: node.type,
						version: node.typeVersion,
						parameters: node.parameters,
					},
				],
	);
	const edges = Object.entries(json.connections ?? {}).flatMap(([from, byType]) =>
		(byType.main ?? []).flatMap((targets, output) =>
			(targets ?? []).map((target) => ({ from, output, to: target.node })),
		),
	);
	return loopWiringIssues(nodes, edges);
}

const isEqualSet = (a: readonly string[], b: readonly string[]) =>
	a.length === b.length && a.every((value) => b.includes(value));

function contextGraph(ctx: PluginContext) {
	const nodes = [...ctx.nodes].map(
		([name, graphNode]): LoopWiringNode => ({
			name,
			type: graphNode.instance.type,
			version: parseVersion(graphNode.instance.version),
			parameters: isRecord(graphNode.instance.config?.parameters)
				? graphNode.instance.config.parameters
				: undefined,
		}),
	);
	const edges = [...ctx.nodes].flatMap(([from, graphNode]) => {
		const stored = [...(graphNode.connections.get('main') ?? [])].flatMap(([output, targets]) =>
			targets.map((target) => ({ from, output, to: target.node })),
		);
		const declared =
			typeof graphNode.instance.getConnections === 'function'
				? graphNode.instance.getConnections().flatMap((connection) => {
						const { target } = connection;
						const to = isInputTarget(target) ? target.node.name : target.name;
						const main = (connection.connectionType ?? 'main') === 'main';
						return main ? [{ from, output: connection.outputIndex, to }] : [];
					})
				: [];
		return [...stored, ...declared];
	});
	return { nodes, edges };
}

export const loopWiringValidator: ValidatorPlugin = {
	id: 'core:loop-wiring',
	name: 'Loop Wiring Validator',
	priority: 5,

	validateNode: () => [],

	validateWorkflow(ctx: PluginContext): ValidationIssue[] {
		const { nodes, edges } = contextGraph(ctx);
		return loopWiringIssues(nodes, edges);
	},
};
