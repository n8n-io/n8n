import type { IWorkflowDataProxyAdditionalKeys } from 'n8n-workflow';

export type {
	ColoringStateEffect,
	Html,
	Plaintext,
	RawSegment,
	Resolvable,
	ResolvableState,
	Resolved,
	Segment,
} from '@n8n/expression-editor';

/**
 * Collection of data, intended to be sufficient for resolving expressions
 * in parameter name/value without referencing global state
 */
export interface ExpressionLocalResolveContext {
	localResolve: true;
	additionalKeys: IWorkflowDataProxyAdditionalKeys;
	nodeName: string;
	/**
	 * Allowed to be undefined (e.g., trigger node, partial execution)
	 */
	inputNode?: {
		name: string;
		runIndex: number;
		branchIndex: number;
	};
}
