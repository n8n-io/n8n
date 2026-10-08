import { z } from 'zod';

import { Z } from '../../zod-class';
import { linkedInstanceTransferWorkflowIdSchema } from './linked-instance-transfer.schema';

/** Moves a workflow of this instance to a linked instance. */
export class LinkedInstanceTransferRequestDto extends Z.class({
	workflowId: linkedInstanceTransferWorkflowIdSchema,
	/** Puts the copy live in the linked instance. */
	publish: z.boolean().optional(),
	/**
	 * Turns off the workflow in this instance after the move. It stays on when the new version is
	 * not live in the linked instance, or is live there but needs set-up first.
	 */
	deactivateLocal: z.boolean().optional(),
}) {}
