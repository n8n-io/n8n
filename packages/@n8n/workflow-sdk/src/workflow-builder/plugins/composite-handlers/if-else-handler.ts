/**
 * If/Else Composite Handler Plugin
 *
 * Handles IfElseComposite and IfElseBuilder structures - if/else branching patterns.
 */

import {
	collectFromTarget,
	addBranchTargetNodes,
	processBranchForComposite,
	processBranchForBuilder,
	fixupBranchConnectionTargets,
} from './branch-handler-utils';
import type {
	IfElseComposite,
	ConnectionTarget,
	NodeInstance,
	IfElseBuilder,
} from '../../../types/base';
import { isIfElseBuilder } from '../../node-builders/node-builder';
import { isIfElseComposite } from '../../type-guards';
import type { CompositeHandlerPlugin, MutablePluginContext } from '../types';

/**
 * Type representing either Composite or Builder format
 */
type IfElseInput = IfElseComposite | IfElseBuilder<unknown>;

/**
 * Handler for If/Else composite structures.
 *
 * Recognizes IfElseComposite and IfElseBuilder patterns and adds the if node
 * and its branches to the workflow graph.
 */
export const ifElseHandler: CompositeHandlerPlugin<IfElseInput> = {
	id: 'core:if-else',
	name: 'If/Else Handler',
	priority: 100,

	canHandle(input: unknown): input is IfElseInput {
		return isIfElseComposite(input) || isIfElseBuilder(input);
	},

	getHeadNodeName(input: IfElseInput): { name: string; id: string } {
		if (isIfElseBuilder(input)) {
			return { name: input.ifNode.name, id: input.ifNode.id };
		}
		const composite = input;
		return { name: composite.ifNode.name, id: composite.ifNode.id };
	},

	collectPinData(
		input: IfElseInput,
		collector: (node: NodeInstance<string, string, unknown>) => void,
	): void {
		// Collect from IF node
		if (isIfElseBuilder(input)) {
			collector(input.ifNode);
			collectFromTarget(input.trueBranch, collector);
			collectFromTarget(input.falseBranch, collector);
		} else {
			const composite = input;
			collector(composite.ifNode);
			collectFromTarget(composite.trueBranch, collector);
			collectFromTarget(composite.falseBranch, collector);
		}
	},

	addNodes(input: IfElseInput, ctx: MutablePluginContext): string {
		const ifMainConns = new Map<number, ConnectionTarget[]>();

		// Handle IfElseBuilder differently - need to set up connections BEFORE adding branches
		if (isIfElseBuilder(input)) {
			const builder = input;

			// IMPORTANT: Build IF connections BEFORE adding branch nodes
			// This ensures that when merge handlers run, they can detect existing IF→Merge connections
			// and skip creating duplicates at the wrong output index

			// Collect target node IDs alongside names for post-dedup fixup
			const targetNodeIds = new Map<number, string[]>();

			// Connect IF to true branch (output 0)
			processBranchForBuilder(builder.trueBranch, 0, ifMainConns, targetNodeIds);

			// Connect IF to false branch (output 1)
			processBranchForBuilder(builder.falseBranch, 1, ifMainConns, targetNodeIds);

			// Add the IF node with connections to branches
			// If the node already exists (e.g., added by merge handler via addBranchToGraph),
			// merge the connections rather than overwriting
			const existingIfNode = ctx.nodes.get(builder.ifNode.name);
			if (existingIfNode) {
				// Merge ifMainConns into existing connections
				const existingMainConns =
					existingIfNode.connections.get('main') ?? new Map<number, ConnectionTarget[]>();
				for (const [outputIndex, targets] of ifMainConns) {
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
				existingIfNode.connections.set('main', existingMainConns);
			} else {
				// Node doesn't exist, add it fresh
				const ifConns = new Map<string, Map<number, ConnectionTarget[]>>();
				ifConns.set('main', ifMainConns);
				ctx.nodes.set(builder.ifNode.name, {
					instance: builder.ifNode,
					connections: ifConns,
				});
			}

			// NOW add branch nodes - this must happen AFTER IF node is added with its connections
			// so that merge handlers can detect existing IF→Merge connections and skip duplicates
			addBranchTargetNodes(builder.trueBranch, ctx);
			addBranchTargetNodes(builder.falseBranch, ctx);

			// Fix stale connection targets after dedup renames
			if (ctx.nameMapping) {
				fixupBranchConnectionTargets(ifMainConns, targetNodeIds, ctx.nameMapping);
			}

			return builder.ifNode.name;
		}

		// IfElseComposite: add branches first, then use results for connections
		const composite = input;

		// Process true branch (output 0)
		processBranchForComposite(composite.trueBranch, 0, ctx, ifMainConns);

		// Process false branch (output 1)
		processBranchForComposite(composite.falseBranch, 1, ctx, ifMainConns);

		// Add the IF node with connections to branches
		const ifConns = new Map<string, Map<number, ConnectionTarget[]>>();
		ifConns.set('main', ifMainConns);
		ctx.nodes.set(composite.ifNode.name, {
			instance: composite.ifNode,
			connections: ifConns,
		});

		return composite.ifNode.name;
	},
};
