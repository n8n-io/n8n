import validator from 'validator';
import type { AuthUser } from '@db/entities/AuthUser';
import type { UserInvitationResult } from '../../shared/utils/users';

export function assertReturnedUserProps(user: AuthUser) {
	expect(validator.isUUID(user.id)).toBe(true);
	expect(user.email).toBeDefined();
	expect(user.personalizationAnswers).toBeNull();
	expect(user.password).toBeUndefined();
	expect(user.isPending).toBe(false);
	expect(user.apiKey).not.toBeDefined();
	expect(user.globalScopes).toBeDefined();
	expect(user.globalScopes).not.toHaveLength(0);
}

export const assertStoredUserProps = (user: AuthUser) => {
	expect(user.firstName).toBeNull();
	expect(user.lastName).toBeNull();
	expect(user.personalizationAnswers).toBeNull();
	expect(user.password).toBeNull();
	expect(user.isPending).toBe(true);
};

export const assertUserInviteResult = (data: UserInvitationResult) => {
	expect(validator.isUUID(data.user.id)).toBe(true);
	expect(data.user.inviteAcceptUrl).toBeUndefined();
	expect(data.user.email).toBeDefined();
	expect(data.user.emailSent).toBe(true);
};
