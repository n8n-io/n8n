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

export type WriteAccessAcquired = {
	type: 'writeAccessAcquired';
	data: {
		workflowId: string;
		userId: string;
	};
};

export type WriteAccessReleased = {
	type: 'writeAccessReleased';
	data: {
		workflowId: string;
	};
};

export type CollaborationPushMessage =
	| CollaboratorsChanged
	| WriteAccessAcquired
	| WriteAccessReleased;
