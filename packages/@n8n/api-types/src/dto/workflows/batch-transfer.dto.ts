import { z } from 'zod';
import { Z } from 'zod-class';

export class BatchTransferWorkflowsRequestDto extends Z.class({
	workflowIds: z.array(z.string().uuid()).min(1).max(50),
	destinationProjectId: z.string().uuid(),
	shareCredentials: z.array(z.string().uuid()).optional(),
	destinationParentFolderId: z.string().uuid().optional(),
}) {}

export class BatchTransferWorkflowsResponseDto extends Z.class({
	success: z.array(
		z.object({
			workflowId: z.string().uuid(),
			name: z.string(),
			message: z.string(),
			sharedCredentials: z.array(z.string().uuid()).optional(),
		}),
	),
	errors: z.array(
		z.object({
			workflowId: z.string().uuid(),
			name: z.string().optional(),
			error: z.string(),
		}),
	),
	totalProcessed: z.number(),
	successCount: z.number(),
	errorCount: z.number(),
}) {}

export class TransferWorkflowResponseDto extends Z.class({
	id: z.string().uuid(),
	name: z.string(),
	transferredAt: z.string().datetime(),
	fromProjectId: z.string().uuid(),
	toProjectId: z.string().uuid(),
	destinationParentFolderId: z.string().uuid().optional(),
	sharedCredentials: z.array(z.string().uuid()).optional(),
}) {}
