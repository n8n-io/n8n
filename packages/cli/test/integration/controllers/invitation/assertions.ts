import { isPerson, type Person, type User } from '@n8n/db';
import validator from 'validator';

import type { UserInvitationResult } from '../../shared/utils/users';

export function assertReturnedUserProps(user: Person) {
	expect(validator.isUUID(user.id)).toBe(true);
	expect(user.email).toBeDefined();
	expect(user.personalizationAnswers).toBeNull();
	expect(user.password).toBeUndefined();
	expect(user.isPending).toBe(false);
}

export const assertStoredUserProps = (user: User) => {
	if (!isPerson(user)) throw new Error('Expected the stored user to be a person');
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
