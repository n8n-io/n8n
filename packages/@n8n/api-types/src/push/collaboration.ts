import type { Iso8601DateTimeString } from '../datetime';
import type { MinimalUser } from '../user';

export type Collaborator = {
	user: MinimalUser;
	lastSeen: Iso8601DateTimeString;
};

export type CollaboratorsChanged = {
	type: 'collaboratorsChanged';
	data: {
		workflowId: string;
		collaborators: Collaborator[];
	};
};

export type WorkflowEditOperation =
	| {
			action: 'addNode';
			nodeData: {
				id: string;
				name: string;
				type: string;
				typeVersion: number;
				position: [number, number];
				parameters?: Record<string, unknown>;
			};
			position?: number;
	  }
	| {
			action: 'removeNode';
			nodeId: string;
			position?: number;
	  }
	| {
			action: 'updateNode';
			nodeId: string;
			changes: Record<string, unknown>;
			position?: number;
	  }
	| {
			action: 'addConnection';
			connection: {
				source: string;
				sourceIndex: number;
				destination: string;
				destinationIndex: number;
				type?: string;
			};
			position?: number;
	  }
	| {
			action: 'removeConnection';
			connection: {
				source: string;
				sourceIndex: number;
				destination: string;
				destinationIndex: number;
			};
			position?: number;
	  };

export type WorkflowEditBroadcast = {
	type: 'workflowEditBroadcast';
	data: {
		workflowId: string;
		operation: WorkflowEditOperation;
		userId: string;
		operationId: string;
		timestamp: number;
	};
};

export type WorkflowCursorBroadcast = {
	type: 'workflowCursorBroadcast';
	data: {
		workflowId: string;
		userId: string;
		position?: {
			x: number;
			y: number;
		};
		selectedNodeId?: string;
		timestamp: number;
	};
};

export type CollaborationPushMessage =
	| CollaboratorsChanged
	| WorkflowEditBroadcast
	| WorkflowCursorBroadcast;
