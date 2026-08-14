type UserNameParts = {
	firstName?: string | null;
	lastName?: string | null;
	email?: string | null;
};

export function formatUserDisplayName(user: UserNameParts): string {
	return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || '';
}
