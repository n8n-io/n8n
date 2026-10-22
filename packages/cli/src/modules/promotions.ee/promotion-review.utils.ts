import type { User } from '@n8n/db';

/** A line that starts with `/` would run as a GitLab quick action under the token. */
const escapeGitLabQuickActions = (text: string) =>
	text
		.split('\n')
		.map((line) => line.replace(/^(\s*)\//, '$1\\/'))
		.join('\n');

const displayName = ({ firstName, lastName }: User) =>
	[firstName, lastName].filter(Boolean).join(' ') || null;

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
