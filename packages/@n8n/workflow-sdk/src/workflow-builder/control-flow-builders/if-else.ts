import type { NodeInstance, NodeChain, IfElseBuilder, SwitchCaseBuilder } from '../../types/base';

/**
 * A branch target - can be a node, node chain, null, plain array (fan-out), or nested builder
 */
export type IfElseTarget =
	| null
	| NodeInstance<string, string, unknown>
	| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
	| Array<
			| NodeInstance<string, string, unknown>
			| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
	  >
	| IfElseBuilder<unknown>
	| SwitchCaseBuilder<unknown>;
