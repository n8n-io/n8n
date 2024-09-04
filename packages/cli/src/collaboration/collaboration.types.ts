import type { Iso8601DateTimeString } from '@/interfaces';
import type { User } from '@/databases/entities/user';

export type ActiveWorkflowUser = {
	userId: User['id'];
	lastSeen: Iso8601DateTimeString;
};
