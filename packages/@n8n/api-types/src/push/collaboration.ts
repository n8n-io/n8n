import type { Iso8601DateTimeString } from '../datetime';
import type { MinimalUser } from '../user';

export type Collaborator = {
	user: MinimalUser;
	lastSeen: Iso8601DateTimeString;
};

export type CollaboratorsChanged = {
	type: 'collaboratorsChanged';
	data: {
		workflowId?: string;
		agentId?: string;
		collaborators: Collaborator[];
	};
};

export type WriteAccessAcquired = {
	type: 'writeAccessAcquired';
	data: {
		workflowId?: string;
		agentId?: string;
		userId: string;
		clientId: string;
	};
};

export type WriteAccessReleased = {
	type: 'writeAccessReleased';
	data: {
		workflowId?: string;
		agentId?: string;
	};
};

export type CollaborationPushMessage =
	| CollaboratorsChanged
	| WriteAccessAcquired
	| WriteAccessReleased;
