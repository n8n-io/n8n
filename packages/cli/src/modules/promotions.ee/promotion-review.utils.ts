import type { User } from '@n8n/db';

/** A line that starts with `/` would run as a GitLab quick action under the token. */
const escapeGitLabQuickActions = (text: string) =>
	text
		.split('\n')
		.map((line) => line.replace(/^(\s*)\//, '$1\\/'))
		.join('\n');

const displayName = ({ firstName, lastName }: User) =>
	[firstName, lastName].filter(Boolean).join(' ') || null;

/**
 * GitLab shows the GitLab user of the token as the approver, so the note names the n8n user.
 * It never posts an email, because everyone with access to the project can read the note.
 */
export const approvalNote = (approver: User) => {
	const name = displayName(approver);
	return escapeGitLabQuickActions(
		name ? `Approved and merged in n8n by ${name}.` : 'Approved and merged in n8n.',
	);
};

export const mergeRequestDescription = (actor: User, commitSha: string, body = '') => {
	const lead = body.replace(/^\n+/, '').replace(/\n+$/, '');
	const name = displayName(actor);
	const attribution = [
		name
			? `Opened by n8n for a promotion of changes by ${name}.`
			: 'Opened by n8n for a promotion of changes.',
		'',
		`Commit: ${commitSha}`,
	];
	return escapeGitLabQuickActions((lead ? [lead, '', ...attribution] : attribution).join('\n'));
};
