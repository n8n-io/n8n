import '../../openapi-extend';
import { z } from 'zod';

import { invitedUserSchema } from '../invitation/invite-users-request.dto';
import { Z } from '../../zod-class';

/** Request body of `POST /users`: one or more users to invite. */
export class CreateUsersPublicDto extends Z.array(invitedUserSchema) {}

const invitedUserResultSchema = z.object({
	user: z.object({
		id: z.string().openapi({ readOnly: true, example: '123e4567-e89b-12d3-a456-426614174000' }),
		email: z.string().email().openapi({ example: 'john.doe@company.com' }),
		inviteAcceptUrl: z.string().optional().openapi({
			readOnly: true,
			description:
				'Link the invited user can open to finish setting up the account. Present only when the instance does not send invite emails.',
		}),
		emailSent: z.boolean().openapi({
			readOnly: true,
			description: 'Whether the invite email was sent to the user.',
		}),
		role: z.string().openapi({ readOnly: true, example: 'global:member' }),
	}),
	error: z.string().optional().openapi({
		readOnly: true,
		description: 'The reason the invite failed for this user. Empty when the invite succeeded.',
	}),
});

/** Response body of `POST /users`: one result per requested invite, in the same order. */
export class InvitedUsersPublicDto extends Z.array(invitedUserResultSchema) {}
