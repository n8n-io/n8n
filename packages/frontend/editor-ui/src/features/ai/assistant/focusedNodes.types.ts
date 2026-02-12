import type { ChatRequest } from './assistant.types';

export type FocusedNodeState = 'hidden' | 'unconfirmed' | 'confirmed';

export interface FocusedNode {
	nodeId: string;
	nodeName: string;
	nodeType: string;
	state: FocusedNodeState;
}

/**
 * Payload structure for focused node context sent to the AI.
 * This is equivalent to ChatRequest.SelectedNodeContext.
 */
export type FocusedNodesContextPayload = ChatRequest.SelectedNodeContext;
