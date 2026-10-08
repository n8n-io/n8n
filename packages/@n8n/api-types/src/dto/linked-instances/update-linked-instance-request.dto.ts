import { Z } from '../../zod-class';
import {
	linkedInstanceNameSchema,
	linkedInstanceRemoteProjectIdSchema,
	linkedInstanceTokenSchema,
} from './linked-instance.schema';

/** Each field is optional. The server rejects a request that changes nothing. */
export class UpdateLinkedInstanceRequestDto extends Z.class({
	name: linkedInstanceNameSchema.optional(),
	token: linkedInstanceTokenSchema.optional(),
	defaultRemoteProjectId: linkedInstanceRemoteProjectIdSchema.optional(),
}) {}
