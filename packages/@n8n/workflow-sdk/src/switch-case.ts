import type {
	SwitchCaseComposite,
	NodeInstance,
	NodeConfig,
	NodeChain,
	IDataObject,
} from './types/base';
import { isNodeChain } from './types/base';
import { isFanOut } from './fan-out';
import type { FanOutTargets } from './fan-out';

/**
 * A case target - can be a node, node chain, null, or fanOut
 */
export type SwitchCaseTarget =
	| null
	| NodeInstance<string, string, unknown>
	| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
	| FanOutTargets;

/**
 * Named input syntax for switch case
 * Keys are caseN format where N is the output index
 */
export interface SwitchCaseNamedInputs {
	[key: `case${number}`]: SwitchCaseTarget;
}

/**
 * Extended config for Switch case that includes version and id
 */
export interface SwitchCaseConfig extends NodeConfig<IDataObject> {
	/** Node version (defaults to 3.4) */
	version?: number | string;
	/** Node ID (auto-generated if omitted) */
	id?: string;
}

/**
 * Check if an object is a NodeInstance (has type, version, config, then method)
 */
function isNodeInstance(obj: unknown): obj is NodeInstance<string, string, unknown> {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		'type' in obj &&
		'version' in obj &&
		'config' in obj &&
		'then' in obj &&
		typeof (obj as NodeInstance<string, string, unknown>).then === 'function'
	);
}

/**
 * Check if an object is a SwitchCaseNamedInputs (has caseN keys)
 */
function isSwitchCaseNamedInputs(obj: unknown): obj is SwitchCaseNamedInputs {
	if (obj === null || typeof obj !== 'object') return false;
	// Check it's not a NodeInstance or array
	if (Array.isArray(obj)) return false;
	if (isNodeInstance(obj)) return false;
	// Check keys are caseN format
	const keys = Object.keys(obj);
	if (keys.length === 0) return false;
	// All keys must be caseN format
	return keys.every((key) => /^case\d+$/.test(key));
}

/**
 * Extract all nodes from a SwitchCaseTarget
 */
function extractNodesFromCaseTarget(
	target: SwitchCaseTarget,
): NodeInstance<string, string, unknown>[] {
	if (target === null) return [];
	if (isFanOut(target)) {
		return target.targets;
	}
	if (isNodeChain(target)) {
		return target.allNodes;
	}
	// It's a single NodeInstance
	return [target];
}

/**
 * Switch case composite using named syntax.
 * This allows explicit mapping of cases to output indices.
 */
class SwitchCaseCompositeNamedSyntax implements SwitchCaseComposite {
	readonly switchNode: NodeInstance<'n8n-nodes-base.switch', string, unknown>;
	readonly cases: NodeInstance<string, string, unknown>[];
	/** Map from output index to case targets */
	readonly caseMapping: Map<number, SwitchCaseTarget>;
	/** All nodes from all cases (for workflow-builder) */
	readonly _allCaseNodes: NodeInstance<string, string, unknown>[];
	/** Marker to identify this as named syntax */
	readonly _isNamedSyntax = true;

	constructor(
		switchNode: NodeInstance<'n8n-nodes-base.switch', string, unknown>,
		inputs: SwitchCaseNamedInputs,
	) {
		this.switchNode = switchNode;

		// Parse case indices and build mapping
		this.caseMapping = new Map();
		const allNodes: NodeInstance<string, string, unknown>[] = [];

		for (const [key, target] of Object.entries(inputs)) {
			const caseIndex = parseInt(key.replace('case', ''), 10);
			this.caseMapping.set(caseIndex, target);

			// Collect all nodes for _allCaseNodes
			const caseNodes = extractNodesFromCaseTarget(target);
			for (const node of caseNodes) {
				if (!allNodes.some((n) => n.name === node.name)) {
					allNodes.push(node);
				}
			}
		}

		this._allCaseNodes = allNodes;
		// cases is used by workflow-builder - provide empty array, use caseMapping instead
		this.cases = [];
	}
}

/**
 * Type guard to check if a SwitchCaseComposite uses named syntax
 */
export function isSwitchCaseNamedSyntax(
	composite: SwitchCaseComposite,
): composite is SwitchCaseCompositeNamedSyntax {
	return '_isNamedSyntax' in composite && composite._isNamedSyntax === true;
}

/**
 * Create a Switch case composite for multi-way branching.
 *
 * Requires named syntax: switchCase(switchNode, { case0: target, case1: target, ... })
 *
 * @param switchNode - A pre-declared Switch node (n8n-nodes-base.switch)
 * @param inputs - Named inputs { case0: target, case1: target, ... }
 *
 * @example
 * ```typescript
 * // First declare the Switch node:
 * const routeByType = node({
 *   type: 'n8n-nodes-base.switch',
 *   version: 3.2,
 *   config: {
 *     name: 'Route by Type',
 *     parameters: {
 *       mode: 'rules',
 *       rules: { ... }
 *     }
 *   }
 * });
 *
 * // Then use it with named inputs:
 * workflow('id', 'Test')
 *   .add(trigger)
 *   .then(switchCase(routeByType, {
 *     case0: handleTypeA,
 *     case1: handleTypeB,
 *     case2: handleFallback
 *   }))
 *   .toJSON();
 *
 * // Fan-out: one case connects to multiple parallel nodes:
 * switchCase(switchNode, {
 *   case0: fanOut(nodeA, nodeB),
 *   case1: nodeC
 * })
 * ```
 */
export function switchCase(
	switchNode: NodeInstance<'n8n-nodes-base.switch', string, unknown>,
	inputs: SwitchCaseNamedInputs,
): SwitchCaseComposite {
	// Validate that first argument is a Switch node
	if (!isNodeInstance(switchNode) || switchNode.type !== 'n8n-nodes-base.switch') {
		throw new Error(
			'switchCase() requires a Switch node as first argument. Use: switchCase(switchNode, { case0: ..., case1: ... })',
		);
	}

	// Validate that second argument is named inputs
	if (!isSwitchCaseNamedInputs(inputs)) {
		throw new Error(
			'switchCase() requires named inputs as second argument. Use: switchCase(switchNode, { case0: ..., case1: ... })',
		);
	}

	return new SwitchCaseCompositeNamedSyntax(switchNode, inputs);
}
