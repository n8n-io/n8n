/**
 * Type Aliases
 *
 * Convenient type aliases for common patterns in the workflow SDK.
 * These improve readability when the exact type parameters don't matter.
 */

import type { NodeInstance, NodeChain, TriggerInstance } from './base';

/**
 * Any node instance - use when output type doesn't matter.
 * Shorthand for NodeInstance<string, string, unknown>
 */
export type AnyNode = NodeInstance<string, string, unknown>;

/**
 * Any node chain - use when head/tail types don't matter.
 * Shorthand for NodeChain<AnyNode, AnyNode>
 */
export type AnyChain = NodeChain<AnyNode, AnyNode>;

/**
 * Any trigger instance - use when output type doesn't matter.
 * Shorthand for TriggerInstance<string, string, unknown>
 */
export type AnyTrigger = TriggerInstance<string, string, unknown>;

/**
 * Parameter record type - generic parameters object.
 * Use this when you need to accept any node parameters.
 */
export type NodeParameters = Record<string, unknown>;
