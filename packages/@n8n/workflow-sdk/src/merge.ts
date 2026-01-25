import type { NodeInstance, NodeChain, MergeMode } from './types/base';
import { node } from './node-builder';

/**
 * MergeInputTarget - a terminal target representing merge.input(n)
 * Chains ending here cannot continue with .then()
 */
export interface MergeInputTarget {
	readonly _isMergeInput: true;
	readonly mergeBuilder: MergeBuilder;
	readonly inputIndex: number;
	// NO .then() method - this is a terminal target
}

/**
 * Configuration for creating a MergeBuilder
 */
export interface MergeConfig {
	name?: string;
	version?: number;
	position?: [number, number];
	parameters?: {
		mode?: MergeMode;
		numberInputs?: number;
		[key: string]: unknown;
	};
}

/**
 * MergeBuilder - new builder syntax for merge
 */
export interface MergeBuilder {
	/** Get an input target for this merge node */
	input(index: number): MergeInputTarget;
	/** Chain after merge (workflow continues from merge output) */
	then<T extends NodeInstance<string, string, unknown>>(
		target: T,
	): NodeChain<NodeInstance<'n8n-nodes-base.merge', string, unknown>, T>;
	/** The merge node */
	readonly mergeNode: NodeInstance<'n8n-nodes-base.merge', string, unknown>;
	/** All input targets created */
	readonly _inputTargets: Map<number, MergeInputTarget>;
	/** Marker to identify this as a MergeBuilder */
	readonly _isMergeBuilder: true;
}

/**
 * Type guard to check if object is a MergeInputTarget
 */
export function isMergeInputTarget(obj: unknown): obj is MergeInputTarget {
	return (
		obj !== null && typeof obj === 'object' && '_isMergeInput' in obj && obj._isMergeInput === true
	);
}

/**
 * Type guard to check if object is a MergeBuilder
 */
export function isMergeBuilder(obj: unknown): obj is MergeBuilder {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		'_isMergeBuilder' in obj &&
		obj._isMergeBuilder === true
	);
}

/**
 * Implementation of MergeBuilder
 */
class MergeBuilderImpl implements MergeBuilder {
	readonly mergeNode: NodeInstance<'n8n-nodes-base.merge', string, unknown>;
	readonly _inputTargets: Map<number, MergeInputTarget> = new Map();
	readonly _isMergeBuilder = true as const;

	constructor(config: MergeConfig) {
		// Create the merge node
		this.mergeNode = node({
			type: 'n8n-nodes-base.merge',
			version: config.version ?? 3,
			config: {
				name: config.name ?? 'Merge',
				position: config.position,
				parameters: config.parameters ?? {},
			},
		}) as NodeInstance<'n8n-nodes-base.merge', string, unknown>;
	}

	input(index: number): MergeInputTarget {
		// Check if we already have a target for this index
		let target = this._inputTargets.get(index);
		if (!target) {
			target = {
				_isMergeInput: true as const,
				mergeBuilder: this,
				inputIndex: index,
			};
			this._inputTargets.set(index, target);
		}
		return target;
	}

	then<T extends NodeInstance<string, string, unknown>>(
		target: T,
	): NodeChain<NodeInstance<'n8n-nodes-base.merge', string, unknown>, T> {
		return this.mergeNode.then(target);
	}
}

/**
 * Create a merge builder for parallel branch execution.
 *
 * @example
 * ```typescript
 * const myMerge = merge({ name: 'Combine', parameters: { mode: 'combine' }});
 * nodeA.then(myMerge.input(0));
 * nodeB.then(myMerge.input(1));
 * myMerge.then(nextNode);
 * ```
 *
 * @param config - Configuration for the merge node
 * @returns MergeBuilder for configuring inputs and chaining
 */
export function merge(config: MergeConfig): MergeBuilder {
	return new MergeBuilderImpl(config);
}
