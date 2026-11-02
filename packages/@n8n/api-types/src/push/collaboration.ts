import type { Iso8601DateTimeString } from '../datetime';
import type { MinimalUser } from '../user';

export type Collaborator = {
	user: MinimalUser;
	lastSeen: Iso8601DateTimeString;
};

/**
 * Exclusive union: exactly one of `workflowId` or `agentId` is set,
 * never both, never neither.
 */
export type CollaborationTarget =
	| { workflowId: string; agentId?: never }
	| { agentId: string; workflowId?: never };

export type CollaboratorsChanged = {
	type: 'collaboratorsChanged';
	data: CollaborationTarget & {
		collaborators: Collaborator[];
	};
};

export type WriteAccessAcquired = {
	type: 'writeAccessAcquired';
	data: CollaborationTarget & {
		userId: string;
		clientId: string;
	};
};

export type WriteAccessReleased = {
	type: 'writeAccessReleased';
	data: CollaborationTarget;
};

export type CollaborationPushMessage =
	| CollaboratorsChanged
	| WriteAccessAcquired
	| WriteAccessReleased;
