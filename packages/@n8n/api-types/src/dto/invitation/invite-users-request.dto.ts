import { assignableGlobalRoleSchema } from '@n8n/permissions';
import { z } from 'zod';

const invitedUserSchema = z.object({
	email: z.string().email(),
	role: assignableGlobalRoleSchema.default('global:member'),
});

const invitationsSchema = z.array(invitedUserSchema);

export class InviteUsersRequestDto extends Array<z.infer<typeof invitedUserSchema>> {
	static safeParse(data: unknown) {
		return invitationsSchema.safeParse(data);
	}
}
