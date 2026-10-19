export function toError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}

type UserNameParts = {
	firstName?: string | null;
	lastName?: string | null;
	email?: string | null;
};

export function formatUserDisplayName(user: UserNameParts): string {
	return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || '';
}

/** Names whoever produced an activity entry. The fallback is passed in to keep i18n out of here. */
export function formatActorName(actor: UserNameParts | null, fallback: string): string {
	return actor ? formatUserDisplayName(actor) : fallback;
}
