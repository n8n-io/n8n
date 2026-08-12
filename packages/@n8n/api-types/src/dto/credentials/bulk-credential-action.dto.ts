import { z } from 'zod';

import { Z } from '../../zod-class';

const credentialIdsSchema = z.array(z.string().min(1)).min(1).max(100);

export class BulkDeleteCredentialsDto extends Z.class({
	credentialIds: credentialIdsSchema,
}) {}

export class BulkTransferCredentialsDto extends Z.class({
	credentialIds: credentialIdsSchema,
	destinationProjectId: z.string().min(1),
}) {}

export type BulkCredentialActionResultItem = {
	credentialId: string;
	status: 'completed' | 'failed' | 'notAttempted';
	reason?: string;
	message?: string;
};

export type BulkCredentialActionResult = {
	status: 'completed' | 'partial';
	results: BulkCredentialActionResultItem[];
};
