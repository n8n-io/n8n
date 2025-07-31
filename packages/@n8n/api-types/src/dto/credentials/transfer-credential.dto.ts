import { z } from 'zod';
import { Z } from 'zod-class';

export class TransferCredentialBodyDto extends Z.class({
	destinationProjectId: z.string().uuid('Invalid project ID format'),
	shareWithWorkflows: z.array(z.string().uuid()).optional(),
}) {}

export class BatchTransferCredentialsRequestDto extends Z.class({
	credentialIds: z.array(z.string().uuid()).min(1).max(50),
	destinationProjectId: z.string().uuid(),
	shareWithWorkflows: z.array(z.string().uuid()).optional(),
}) {}

export class TransferCredentialResponseDto extends Z.class({
	id: z.string().uuid(),
	name: z.string(),
	type: z.string(),
	transferredAt: z.string().datetime(),
	fromProjectId: z.string().uuid(),
	toProjectId: z.string().uuid(),
	sharedWorkflows: z.array(z.string().uuid()).optional(),
}) {}

export class BatchTransferCredentialsResponseDto extends Z.class({
	success: z.array(
		z.object({
			credentialId: z.string().uuid(),
			name: z.string(),
			message: z.string(),
		}),
	),
	errors: z.array(
		z.object({
			credentialId: z.string().uuid(),
			name: z.string().optional(),
			error: z.string(),
		}),
	),
	totalProcessed: z.number(),
	successCount: z.number(),
	errorCount: z.number(),
}) {}
