import { z } from 'zod';

import { Z } from '../../zod-class';

const workflowIdsSchema = z.array(z.string().min(1)).min(1).max(100);

export class BulkArchiveWorkflowsDto extends Z.class({
	workflowIds: workflowIdsSchema,
}) {}

export class BulkDeleteWorkflowsDto extends Z.class({
	workflowIds: workflowIdsSchema,
}) {}

export class BulkUnpublishWorkflowsDto extends Z.class({
	workflowIds: workflowIdsSchema,
}) {}

export class BulkTransferWorkflowsDto extends Z.class({
	workflowIds: workflowIdsSchema,
	destinationProjectId: z.string().min(1),
	destinationParentFolderId: z.string().min(1).optional(),
	shareCredentials: z.array(z.string().min(1)).optional(),
}) {}

export const bulkWorkflowActionItemStatusSchema = z.enum([
	'completed',
	'unchanged',
	'failed',
	'notAttempted',
]);

export type BulkWorkflowActionItemStatus = z.infer<typeof bulkWorkflowActionItemStatusSchema>;

export type BulkWorkflowActionResultItem = {
	workflowId: string;
	status: BulkWorkflowActionItemStatus;
	reason?: string;
	message?: string;
};

export type BulkWorkflowActionResult = {
	status: 'completed' | 'partial';
	results: BulkWorkflowActionResultItem[];
	unsharedCredentialIds?: string[];
};
