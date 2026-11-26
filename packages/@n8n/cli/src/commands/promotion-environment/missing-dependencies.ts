import type { PromotionDependencyWarning, PromotionMissingDependency } from '../../client';

type Operation = 'Promote' | 'Apply';

interface Section {
	title: string;
	description?: string;
	entries: Array<PromotionMissingDependency | PromotionDependencyWarning>;
}

/** A line cuts a long list, so it names a few workflows and counts the rest. */
const MAX_LISTED_WORKFLOWS = 5;

/** A kind that this version does not know has no title, so the line prints the kind as it is. */
const KINDS: Partial<Record<string, string>> = {
	credential: 'Credential',
	variable: 'Variable',
	workflow: 'Workflow',
};

/**
 * Only Apply gives a reason. On Promote, the group is the reason.
 * A reason that this version does not know has no text, so the line leaves it out.
 */
const APPLY_REASONS: Partial<Record<PromotionMissingDependency['reason'], string>> = {
	'not-on-branch': 'not on this instance and not on the branch',
	'not-on-instance': 'not on this instance',
	'not-shared': 'this project cannot use it',
	'type-mismatch': 'has another type on this instance',
	'unknown-type': 'its type is not installed on this instance',
	'incompatible-usage-scope': 'this project cannot use an instance credential',
	archived: 'archived on this instance',
	'caller-policy': 'its caller policy refuses the workflow',
};

/**
 * With `target-selected`, the Apply itself can archive or delete the workflow. These reasons then
 * tell what the Apply does, because the workflow is not in that state yet. Each other reason keeps
 * its text.
 */
const APPLY_REASONS_OF_SELECTED_TARGET: Partial<
	Record<PromotionMissingDependency['reason'], string>
> = {
	archived: 'archived by this Apply',
	'not-on-instance': 'deleted by this Apply',
};

/**
 * An entry of a project Apply preview can depend on the selection. The preview has no selection,
 * so the line states the condition. The id of the workflow of the entry follows the text.
 */
const APPLY_CONDITIONS: Record<NonNullable<PromotionMissingDependency['condition']>, string> = {
	'target-selected': 'only when the Apply includes',
	'target-not-selected': 'only when the Apply does not include',
};

/**
 * The lists of a Promote, with the groups and the titles of the UI. Empty when nothing is missing.
 * A server that does not know the lists does not send them, so each list defaults to empty.
 */
export function promoteDependencyLines(
	missingDependencies: PromotionMissingDependency[] = [],
	warnings: PromotionDependencyWarning[] = [],
): string[] {
	const personal = inGroup(missingDependencies, 'personal');
	return sectionLines('Promote', missingDependencies, [
		{
			title: 'In another project',
			description:
				'These dependencies are in other projects that you can access. This Promote does not include them.',
			entries: inGroup(missingDependencies, 'other-project'),
		},
		outsideAccessSection(missingDependencies, 'You do not have access to these dependencies.'),
		{
			title: 'Cannot be promoted',
			// The user cannot move a dependency that is in the personal project of another user.
			description: personal.some(({ accessible }) => !accessible)
				? 'These dependencies are in a personal project. Someone with access must move them to a team project to promote them.'
				: 'These dependencies are in a personal project. Move them to a team project to promote them.',
			entries: personal,
		},
		{
			title: 'Warnings',
			description:
				'These references point to something that does not exist on the source instance.',
			entries: warnings,
		},
	]);
}

/** The list of an Apply, with the groups and the titles of the UI. Empty when nothing is missing. */
export function applyDependencyLines(
	missingDependencies: PromotionMissingDependency[] = [],
): string[] {
	return sectionLines('Apply', missingDependencies, [
		{
			title: 'Needs your action',
			description:
				'Resolve these dependencies on this instance. An entry that stops the Apply must be resolved before you apply.',
			entries: inGroup(missingDependencies, 'needs-action'),
		},
		outsideAccessSection(
			missingDependencies,
			'You cannot add these dependencies from here: they are in a project that you cannot access, or the branch does not hold them.',
		),
	]);
}

/** How many entries stop the Apply, of those that only someone with more access can resolve. */
export function countBlockingOutsideAccess(
	missingDependencies: PromotionMissingDependency[] = [],
): number {
	return inGroup(missingDependencies, 'outside-access').filter(({ blocking }) => blocking).length;
}

function inGroup(
	missingDependencies: PromotionMissingDependency[],
	group: PromotionMissingDependency['group'],
): PromotionMissingDependency[] {
	return missingDependencies.filter((dependency) => dependency.group === group);
}

function outsideAccessSection(
	missingDependencies: PromotionMissingDependency[],
	description: string,
): Section {
	return {
		title: 'Outside your access',
		description,
		entries: inGroup(missingDependencies, 'outside-access'),
	};
}

/**
 * One block for each section that has entries, with an empty line between two blocks.
 * A newer server can send a group that this version does not know. The output must show every
 * entry, so the entries that are in no section go in a last block.
 */
function sectionLines(
	operation: Operation,
	missingDependencies: PromotionMissingDependency[],
	sections: Section[],
): string[] {
	const listed = new Set(sections.flatMap(({ entries }) => entries));
	const other = missingDependencies.filter((dependency) => !listed.has(dependency));
	return [...sections, { title: 'Other', entries: other }]
		.filter(({ entries }) => entries.length > 0)
		.flatMap(({ title, description, entries }, index) => [
			...(index > 0 ? [''] : []),
			`${title} (${entries.length})`,
			...(description ? [description] : []),
			...entries.map((entry) => entryLine(entry, operation)),
		]);
}

/**
 * A line names the project of a dependency only when the entry has one. The server sends it only
 * for the group "In another project", where the user can access that project. A line never names
 * the project of a consumer.
 */
function entryLine(
	entry: PromotionMissingDependency | PromotionDependencyWarning,
	operation: Operation,
): string {
	const credentialType =
		'credentialType' in entry && entry.credentialType ? ` (${entry.credentialType})` : '';
	const dependency = operation === 'Apply' && 'reason' in entry ? entry : undefined;
	const condition = dependency?.condition ? APPLY_CONDITIONS[dependency.condition] : undefined;
	// The condition names the workflow by its id, so the line shows that id next to the name.
	const id = condition && entry.id ? ` (id ${entry.id})` : '';
	const workflowNames = entry.consumers.flatMap(({ workflows }) =>
		workflows.map(({ name }) => name),
	);
	const facts = [
		'project' in entry && entry.project ? `in project "${entry.project.name}"` : undefined,
		dependency ? applyReason(dependency) : undefined,
		entry.blocking ? `stops the ${operation}` : undefined,
		`used by ${listNames(workflowNames)}`,
		condition ? `${condition} ${entry.id ?? 'this workflow'}` : undefined,
	].filter((fact) => fact !== undefined);
	const kind = KINDS[entry.kind] ?? entry.kind;

	return `  ${kind} "${entry.name}"${id}${credentialType}: ${facts.join('; ')}`;
}

function applyReason({ reason, condition }: PromotionMissingDependency): string | undefined {
	const ofSelectedTarget =
		condition === 'target-selected' ? APPLY_REASONS_OF_SELECTED_TARGET[reason] : undefined;
	return ofSelectedTarget ?? APPLY_REASONS[reason];
}

function listNames(names: string[]): string {
	const listed = names.slice(0, MAX_LISTED_WORKFLOWS).join(', ');
	const more = names.length - MAX_LISTED_WORKFLOWS;
	return more > 0 ? `${listed} (+${more} more)` : listed;
}
