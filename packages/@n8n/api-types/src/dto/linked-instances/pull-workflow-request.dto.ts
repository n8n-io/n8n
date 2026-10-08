import { Z } from '../../zod-class';
import {
	linkedInstanceRemoteWorkflowIdSchema,
	linkedInstanceTransferProjectIdSchema,
} from './linked-instance-transfer.schema';

/** Brings a workflow of a linked instance to this instance. */
export class LinkedInstancePullRequestDto extends Z.class({
	remoteWorkflowId: linkedInstanceRemoteWorkflowIdSchema,
	/** A project in this instance. Defaults to the personal project of the user. */
	projectId: linkedInstanceTransferProjectIdSchema.optional(),
}) {}
