type NamedRef = { id: string; name: string };

/** Keeps the body readable when a selection holds many items. */
const MAX_LISTED_ITEMS = 50;

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

function listSection(title: string, refs: NamedRef[]): string | undefined {
	if (refs.length === 0) return undefined;
	const lines = refs.slice(0, MAX_LISTED_ITEMS).map(({ id, name }) => `- ${name} (${id})`);
	if (refs.length > MAX_LISTED_ITEMS) {
		lines.push(`- …and ${refs.length - MAX_LISTED_ITEMS} more`);
	}
	return [`${title}:`, ...lines].join('\n');
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
}: {
	projectName: string;
	added: NamedRef[];
	updated: NamedRef[];
	removed: NamedRef[];
	folders?: NamedRef[];
}): string {
	const workflowCount = added.length + updated.length + removed.length;
	const counts = [
		...(workflowCount > 0 ? [plural(workflowCount, 'workflow')] : []),
		...(folders.length > 0 ? [plural(folders.length, 'folder')] : []),
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
	];
	return [title, ...sections].filter(Boolean).join('\n\n');
}
