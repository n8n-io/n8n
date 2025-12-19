import type { User, PublicUser } from '@n8n/db';

export const validateUser = (user: PublicUser) => {
	expect(typeof user.id).toBe('string');
	expect(user.email).toBeDefined();
	expect(user.firstName).toBeDefined();
	expect(user.lastName).toBeDefined();
	expect(typeof user.isOwner).toBe('boolean');
	expect(user.isPending).toBe(false);
	expect(user.signInType).toBe('email');
	expect(user.settings).toBe(null);
	expect(user.personalizationAnswers).toBeNull();
	expect(user.password).toBeUndefined();
	expect(user.role).toBeDefined();
	expect(typeof (user as any).mfaEnabled).toBe('boolean');
};

export type UserInvitationResult = {
	user: Pick<User, 'id' | 'email'> & { inviteAcceptUrl: string; emailSent: boolean };
	error?: string;
};
