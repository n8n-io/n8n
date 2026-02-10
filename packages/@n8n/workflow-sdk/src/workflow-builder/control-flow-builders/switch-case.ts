import type { NodeInstance, NodeChain } from '../../types/base';

/**
 * A case target - can be a node, node chain, null, or plain array (fan-out)
 */
export type SwitchCaseTarget =
	| null
	| NodeInstance<string, string, unknown>
	| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
	| Array<
			| NodeInstance<string, string, unknown>
			| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
	  >;
