import { z } from 'zod';
import { Z } from 'zod-class';

const userIdSchema = z.string().uuid();
const roleSchema = z.enum(['global:member', 'global:admin']);

export class BulkInviteUsersRequestDto extends Z.class({
	invitations: z
		.array(
			z.object({
				email: z.string().email(),
				role: roleSchema.default('global:member'),
			}),
		)
		.min(1)
		.max(100),
}) {}

export class BulkUpdateRolesRequestDto extends Z.class({
	userRoleUpdates: z
		.array(
			z.object({
				userId: userIdSchema,
				newRole: roleSchema,
			}),
		)
		.min(1)
		.max(50),
}) {}

export class BulkStatusUpdateRequestDto extends Z.class({
	userIds: z.array(userIdSchema).min(1).max(50),
	disabled: z.boolean(),
}) {}

export class BulkDeleteUsersRequestDto extends Z.class({
	userIds: z.array(userIdSchema).min(1).max(20),
	transferToUserId: z.string().uuid().optional(),
}) {}

export class BulkOperationResponseDto extends Z.class({
	success: z.array(
		z.object({
			userId: userIdSchema,
			message: z.string(),
		}),
	),
	errors: z.array(
		z.object({
			userId: userIdSchema.optional(),
			email: z.string().email().optional(),
			error: z.string(),
		}),
	),
	totalProcessed: z.number(),
}) {}
