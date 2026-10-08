import { Z } from '../../zod-class';
import { linkedInstanceTransferWorkflowIdSchema } from './linked-instance-transfer.schema';

export class LinkedInstanceTransferPreflightRequestDto extends Z.class({
	workflowId: linkedInstanceTransferWorkflowIdSchema,
}) {}
