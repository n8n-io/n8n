import type { NodeInstance, NodeChain, IfElseBuilder, SwitchCaseBuilder } from './types/base';
import type { FanOutTargets } from './fan-out';

/**
 * A branch target - can be a node, node chain, null, fanOut, or nested builder
 */
export type IfElseTarget =
	| null
	| NodeInstance<string, string, unknown>
	| NodeChain<NodeInstance<string, string, unknown>, NodeInstance<string, string, unknown>>
	| FanOutTargets
	| IfElseBuilder<unknown>
	| SwitchCaseBuilder<unknown>;
