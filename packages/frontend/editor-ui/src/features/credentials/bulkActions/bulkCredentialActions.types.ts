import type { CredentialsResource } from '@/Interface';
import type {
	SharedBulkActionResult,
	SharedBulkActionResultItem,
} from '@/app/types/bulkActions.types';

export type BulkCredentialActionId = 'move' | 'delete';

export type BulkCredentialActionItemStatus = 'completed' | 'failed' | 'notAttempted';

export type BulkCredentialActionResultItem = SharedBulkActionResultItem<
	'credential',
	BulkCredentialActionItemStatus
>;

export type NormalizedBulkCredentialActionResult = SharedBulkActionResult<
	'credential',
	BulkCredentialActionItemStatus
>;

export type ResolvedBulkCredentialAction = {
	id: BulkCredentialActionId;
	label: string;
	destructive: boolean;
	affected: CredentialsResource[];
};

export type BulkCredentialActionConfig = {
	destinationProjectId?: string;
};

export type BulkCredentialActionError = {
	message: string;
	details: string[];
};
