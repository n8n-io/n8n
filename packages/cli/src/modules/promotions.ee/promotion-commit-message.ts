type NamedRef = { id: string; name: string };

/** Keeps the body readable when a selection holds many workflows. */
const MAX_LISTED_WORKFLOWS = 50;

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

function listSection(title: string, refs: NamedRef[]): string | undefined {
	if (refs.length === 0) return undefined;
	const lines = refs.slice(0, MAX_LISTED_WORKFLOWS).map(({ id, name }) => `- ${name} (${id})`);
	if (refs.length > MAX_LISTED_WORKFLOWS) {
		lines.push(`- …and ${refs.length - MAX_LISTED_WORKFLOWS} more`);
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
}: {
	projectName: string;
	added: NamedRef[];
	updated: NamedRef[];
	removed: NamedRef[];
}): string {
	const total = added.length + updated.length + removed.length;
	const sections = [
		listSection('Added', added),
		listSection('Updated', updated),
		listSection('Removed', removed),
	];
	return [`Promote ${plural(total, 'workflow')} from "${projectName}"`, ...sections]
		.filter(Boolean)
		.join('\n\n');
}
