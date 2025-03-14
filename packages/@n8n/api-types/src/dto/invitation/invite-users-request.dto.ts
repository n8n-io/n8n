import { z } from 'zod';

const roleSchema = z.enum(['global:member', 'global:admin']);

const invitedUserSchema = z.object({
	email: z.string().email(),
	role: roleSchema.default('global:member'),
});

const invitationsSchema = z.array(invitedUserSchema);

export class InviteUsersRequestDto extends Array<z.infer<typeof invitedUserSchema>> {
	static safeParse(data: unknown) {
		return invitationsSchema.safeParse(data);
	}
}
