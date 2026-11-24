import type { PromotionMissingDependency } from '@n8n/api-types';

type NamedRef = { id: string; name: string };

/** Keeps the body readable when a selection holds many items. */
const MAX_LISTED_ITEMS = 50;

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

function listSection<T extends { id?: string; name: string }>(
	title: string,
	refs: T[],
	label: (ref: T) => string = ({ name }) => name,
): string | undefined {
	if (refs.length === 0) return undefined;
	const lines = refs
		.slice(0, MAX_LISTED_ITEMS)
		.map((ref) => `- ${label(ref)}${ref.id === undefined ? '' : ` (${ref.id})`}`);
	if (refs.length > MAX_LISTED_ITEMS) {
		lines.push(`- …and ${refs.length - MAX_LISTED_ITEMS} more`);
	}
	return [`${title}:`, ...lines].join('\n');
}

/**
 * Adds the missing dependencies that the caller confirmed to a commit message, so the history of
 * the branch and the description of a merge request show what the Promote left out.
 */
export function appendMissingDependencies(
	commitMessage: string,
	missingDependencies: Array<Pick<PromotionMissingDependency, 'kind' | 'id' | 'name'>>,
): string {
	const section = listSection(
		'Missing dependencies',
		missingDependencies,
		({ kind, name }) => `${kind}: ${name}`,
	);
	return section ? `${commitMessage}\n\n${section}` : commitMessage;
}

/** The commit message of an instance promote that has no message from the caller. */
export function buildInstancePromotionCommitMessage({
	projectCount,
	workflowCount,
}: {
	projectCount: number;
	workflowCount: number;
}): string {
	return `Promote instance: ${plural(projectCount, 'project')}, ${plural(workflowCount, 'workflow')}`;
}

/**
 * The commit message of a selection promote that has no message from the caller.
 * The first line becomes the merge request title. The lists become its description.
 */
export function buildSelectionPromotionCommitMessage({
	projectName,
	added,
	updated,
	removed,
	folders = [],
	credentials = [],
}: {
	projectName: string;
	added: NamedRef[];
	updated: NamedRef[];
	removed: NamedRef[];
	folders?: NamedRef[];
	credentials?: NamedRef[];
}): string {
	const workflowCount = added.length + updated.length + removed.length;
	const counts = [
		...(workflowCount > 0 ? [plural(workflowCount, 'workflow')] : []),
		...(folders.length > 0 ? [plural(folders.length, 'folder')] : []),
		...(credentials.length > 0 ? [plural(credentials.length, 'credential')] : []),
	];
	const title =
		counts.length > 0
			? `Promote ${counts.join(' and ')} from "${projectName}"`
			: `Promote project "${projectName}"`;
	const sections = [
		listSection('Added', added),
		listSection('Updated', updated),
		listSection('Removed', removed),
		listSection('Folders', folders),
		listSection('Credentials', credentials),
	];
	return [title, ...sections].filter(Boolean).join('\n\n');
}
