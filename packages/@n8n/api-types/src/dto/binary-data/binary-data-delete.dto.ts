import { z } from 'zod';
import { Z } from 'zod-class';

/**
 * DTO for binary data deletion endpoint path parameter
 */
export class BinaryDataDeleteParamDto extends Z.class({
	/**
	 * The binary data ID to delete
	 * Must be in format "mode:fileId" (e.g., "filesystem:abc123")
	 */
	id: z
		.string()
		.refine((id) => id.includes(':'), {
			message: 'Missing binary data mode',
		})
		.refine(
			(id) => {
				const [mode] = id.split(':');
				return ['filesystem', 'filesystem-v2', 's3'].includes(mode);
			},
			{
				message: 'Invalid binary data mode',
			},
		),
}) {}

/**
 * DTO for binary data deletion request body (optional)
 */
export class BinaryDataDeleteBodyDto extends Z.class({
	/**
	 * Whether to force deletion even if file is referenced by active executions
	 * Defaults to false for safety
	 */
	force: z.boolean().default(false),

	/**
	 * Optional reason for deletion (for audit logging)
	 */
	reason: z.string().max(500).optional(),
}) {}
