import type { Iso8601DateTimeString } from '../types';
import type { User } from '../user';

export interface Collaborator {
	user: User;
	lastSeen: Iso8601DateTimeString;
}

interface CollaboratorsChanged {
	type: 'collaboratorsChanged';
	data: {
		workflowId: string;
		collaborators: Collaborator[];
	};
}

export type CollaborationPushMessage = CollaboratorsChanged;
