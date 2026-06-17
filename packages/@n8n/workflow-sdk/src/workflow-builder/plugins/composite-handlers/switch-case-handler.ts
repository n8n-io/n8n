/**
 * Switch/Case Composite Handler Plugin
 *
 * Handles SwitchCaseComposite and SwitchCaseBuilder structures - switch/case branching patterns.
 */

import {
	collectFromTarget,
	addBranchTargetNodes,
	processBranchForComposite,
	processBranchForBuilder,
	fixupBranchConnectionTargets,
} from './branch-handler-utils';
import type {
	SwitchCaseComposite,
	ConnectionTarget,
	NodeInstance,
	SwitchCaseBuilder,
} from '../../../types/base';
import { isSwitchCaseBuilder } from '../../node-builders/node-builder';
import { isSwitchCaseComposite } from '../../type-guards';
import type { CompositeHandlerPlugin, MutablePluginContext } from '../types';

/**
 * Type representing either Composite or Builder format
 */
type SwitchCaseInput = SwitchCaseComposite | SwitchCaseBuilder<unknown>;

/**
 * Handler for Switch/Case composite structures.
 *
 * Recognizes SwitchCaseComposite and SwitchCaseBuilder patterns and adds the
 * switch node and its cases to the workflow graph.
 */
export const switchCaseHandler: CompositeHandlerPlugin<SwitchCaseInput> = {
	id: 'core:switch-case',
	name: 'Switch/Case Handler',
	priority: 100,

	canHandle(input: unknown): input is SwitchCaseInput {
		return isSwitchCaseComposite(input) || isSwitchCaseBuilder(input);
	},

	getHeadNodeName(input: SwitchCaseInput): { name: string; id: string } {
		if (isSwitchCaseBuilder(input)) {
			return { name: input.switchNode.name, id: input.switchNode.id };
		}
		const composite = input;
		return { name: composite.switchNode.name, id: composite.switchNode.id };
	},

	collectPinData(
		input: SwitchCaseInput,
		collector: (node: NodeInstance<string, string, unknown>) => void,
	): void {
		// Collect from Switch node
		collector(input.switchNode);

		// Collect from cases
		if ('caseMapping' in input && input.caseMapping instanceof Map) {
			// SwitchCaseBuilder
			for (const [, target] of input.caseMapping) {
				collectFromTarget(target, collector);
			}
		} else if ('cases' in input && Array.isArray(input.cases)) {
			// SwitchCaseComposite
			for (const caseNode of input.cases) {
				collectFromTarget(caseNode, collector);
			}
		}
	},

	addNodes(input: SwitchCaseInput, ctx: MutablePluginContext): string {
		// Handle sourceChain if present (for trigger.to(switch).onCase() pattern)
		const builderWithChain = input as { sourceChain?: unknown };
		if (builderWithChain.sourceChain) {
			ctx.addBranchToGraph(builderWithChain.sourceChain);
		}

		// Build the switch node connections to its cases
		const switchMainConns = new Map<number, ConnectionTarget[]>();

		// Handle SwitchCaseBuilder differently - need to set up connections BEFORE adding case nodes
		if ('caseMapping' in input && input.caseMapping instanceof Map) {
			const builder = input;

			// IMPORTANT: Build Switch connections BEFORE adding case nodes
			// This ensures that when merge handlers run, they can detect existing Switch→Merge connections
			// and skip creating duplicates at the wrong output index

			// Collect target node IDs alongside names for post-dedup fixup
			const targetNodeIds = new Map<number, string[]>();

			// Connect switch to each case at the correct output index
			for (const [caseIndex, target] of builder.caseMapping) {
				processBranchForBuilder(target, caseIndex, switchMainConns, targetNodeIds);
			}

			// Add the Switch node with connections to cases
			// If the node already exists (e.g., added by merge handler via addBranchToGraph),
			// merge the connections rather than overwriting
			const existingNode = ctx.nodes.get(builder.switchNode.name);
			if (existingNode) {
				// Merge switchMainConns into existing connections
				const existingMainConns =
					existingNode.connections.get('main') ?? new Map<number, ConnectionTarget[]>();
				for (const [outputIndex, targets] of switchMainConns) {
					const existingTargets: ConnectionTarget[] = existingMainConns.get(outputIndex) ?? [];
					// Add new targets that don't already exist
					for (const target of targets) {
						const alreadyExists = existingTargets.some(
							(t) => t.node === target.node && t.index === target.index,
						);
						if (!alreadyExists) {
							existingTargets.push(target);
						}
					}
					existingMainConns.set(outputIndex, existingTargets);
				}
				existingNode.connections.set('main', existingMainConns);
			} else {
				// Node doesn't exist, add it fresh
				const switchConns = new Map<string, Map<number, ConnectionTarget[]>>();
				switchConns.set('main', switchMainConns);
				ctx.nodes.set(builder.switchNode.name, {
					instance: builder.switchNode,
					connections: switchConns,
				});
			}

			// NOW add case nodes - this must happen AFTER Switch node is added with its connections
			// so that merge handlers can detect existing Switch→Merge connections and skip duplicates
			for (const [, target] of builder.caseMapping) {
				addBranchTargetNodes(target, ctx);
			}

			// Fix stale connection targets after dedup renames
			if (ctx.nameMapping) {
				fixupBranchConnectionTargets(switchMainConns, targetNodeIds, ctx.nameMapping);
			}

			return builder.switchNode.name;
		}

		// SwitchCaseComposite: add cases first, then use results for connections
		if ('cases' in input && Array.isArray(input.cases)) {
			input.cases.forEach((caseNode, index) => {
				processBranchForComposite(caseNode, index, ctx, switchMainConns);
			});
		}

		// Add the switch node with connections to cases
		const switchConns = new Map<string, Map<number, ConnectionTarget[]>>();
		switchConns.set('main', switchMainConns);
		ctx.nodes.set(input.switchNode.name, {
			instance: input.switchNode,
			connections: switchConns,
		});

		return input.switchNode.name;
	},
};
