import '../../openapi-extend';
import { z } from 'zod';

import { Z } from '../../zod-class';

/** The user as the Public API publishes it. `role` is present only when the caller asks for it. */
export const userPublicSchema = z.object({
	id: z.string().openapi({ readOnly: true, example: '123e4567-e89b-12d3-a456-426614174000' }),
	email: z.string().email().nullable().openapi({ example: 'john.doe@company.com' }),
	firstName: z.string().nullable().openapi({ readOnly: true, example: 'john' }),
	lastName: z.string().nullable().openapi({ readOnly: true, example: 'Doe' }),
	isPending: z.boolean().openapi({
		readOnly: true,
		description:
			'Whether the user finished setting up their account in response to the invitation (true) or not (false).',
	}),
	createdAt: z.string().datetime().openapi({ readOnly: true }),
	updatedAt: z.string().datetime().openapi({ readOnly: true }),
	mfaEnabled: z.boolean().openapi({
		readOnly: true,
		description: 'Whether the user has multi-factor authentication (MFA/2FA) enabled.',
		example: false,
	}),
	role: z.string().optional().openapi({ readOnly: true, example: 'global:owner' }),
});

export class UserPublicDto extends Z.class(userPublicSchema.shape) {}

export class UserListPublicDto extends Z.class({
	data: z.array(userPublicSchema),
	nextCursor: z.string().nullable().openapi({
		description:
			'Paginate through users by setting the cursor parameter to a nextCursor attribute returned by a previous request. Default value fetches the first page of the collection.',
		example: 'MTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDA',
	}),
}) {}
