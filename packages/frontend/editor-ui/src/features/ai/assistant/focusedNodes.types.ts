export type FocusedNodeState = 'hidden' | 'unconfirmed' | 'confirmed';

export interface FocusedNode {
	nodeId: string;
	nodeName: string;
	nodeType: string;
	state: FocusedNodeState;
}

export interface FocusedNodesContextPayload {
	name: string;
	type: string;
	typeVersion: number;
	parameters: Record<string, unknown>;
	issues?: Record<string, string[]>;
	incomingConnections: string[];
	outgoingConnections: string[];
}
