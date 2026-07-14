type UserNameParts = {
	firstName: string | null | undefined;
	lastName: string | null | undefined;
};

export function formatWorkflowHistoryAuthorName(user: UserNameParts): string {
	return [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
}

export function formatWorkflowHistoryAuthorNameViaMcp(user: UserNameParts): string {
	const name = formatWorkflowHistoryAuthorName(user);
	return name ? `${name} (via MCP)` : '';
}

export function formatWorkflowHistoryAuthorNameForImport(user: UserNameParts): string {
	const name = formatWorkflowHistoryAuthorName(user);
	return name ? `import by ${name}` : 'import';
}

/** All author labels that may appear in workflow_history.authors for a given user. */
export function getWorkflowHistoryAuthorLabelsForUser(user: UserNameParts): string[] {
	const name = formatWorkflowHistoryAuthorName(user);
	if (!name) return [];

	return [
		name,
		formatWorkflowHistoryAuthorNameViaMcp(user),
		formatWorkflowHistoryAuthorNameForImport(user),
	];
}
