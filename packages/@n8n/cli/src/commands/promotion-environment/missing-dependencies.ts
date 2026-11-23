import type { PromotionDependencyWarning, PromotionMissingDependency } from '../../client';

type Operation = 'Promote' | 'Apply';

interface Section {
	title: string;
	description: string;
	entries: Array<PromotionMissingDependency | PromotionDependencyWarning>;
}

/** A line cuts a long list, so it names a few workflows and counts the rest. */
const MAX_LISTED_WORKFLOWS = 5;

const KINDS = { credential: 'Credential', variable: 'Variable', workflow: 'Workflow' };

/** Only Apply gives a reason. On Promote, the group is the reason. */
const APPLY_REASONS: Partial<Record<PromotionMissingDependency['reason'], string>> = {
	'not-on-instance': 'not on this instance',
	'not-shared': 'this project cannot use it',
	'type-mismatch': 'has another type on this instance',
	'unknown-type': 'its type is not installed on this instance',
	'incompatible-usage-scope': 'this project cannot use an instance credential',
	archived: 'archived on this instance',
	'caller-policy': 'its caller policy refuses the workflow',
};

/**
 * The lists of a Promote, with the groups and the titles of the UI. Empty when nothing is missing.
 * A server that does not know the lists does not send them, so each list defaults to empty.
 */
export function promoteDependencyLines(
	missingDependencies: PromotionMissingDependency[] = [],
	warnings: PromotionDependencyWarning[] = [],
): string[] {
	return sectionLines('Promote', [
		{
			title: 'In another project',
			description:
				'These dependencies are in other projects that you can access. This Promote does not include them.',
			entries: inGroup(missingDependencies, 'other-project'),
		},
		outsideAccessSection(missingDependencies),
		{
			title: 'Cannot be promoted',
			description:
				'These dependencies are in a personal project. Move them to a team project to promote them.',
			entries: inGroup(missingDependencies, 'personal'),
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
	return sectionLines('Apply', [
		{
			title: 'Needs your action',
			description: 'Create these dependencies before you apply.',
			entries: inGroup(missingDependencies, 'needs-action'),
		},
		outsideAccessSection(missingDependencies),
	]);
}

/** How many entries only someone with more access can resolve. */
export function countOutsideAccess(missingDependencies: PromotionMissingDependency[] = []): number {
	return inGroup(missingDependencies, 'outside-access').length;
}

function inGroup(
	missingDependencies: PromotionMissingDependency[],
	group: PromotionMissingDependency['group'],
): PromotionMissingDependency[] {
	return missingDependencies.filter((dependency) => dependency.group === group);
}

function outsideAccessSection(missingDependencies: PromotionMissingDependency[]): Section {
	return {
		title: 'Outside your access',
		description: 'You do not have access to these dependencies.',
		entries: inGroup(missingDependencies, 'outside-access'),
	};
}

/** One block for each section that has entries, with an empty line between two blocks. */
function sectionLines(operation: Operation, sections: Section[]): string[] {
	return sections
		.filter(({ entries }) => entries.length > 0)
		.flatMap(({ title, description, entries }, index) => [
			...(index > 0 ? [''] : []),
			`${title} (${entries.length})`,
			description,
			...entries.map((entry) => entryLine(entry, operation)),
		]);
}

/**
 * The output must not show where a dependency is, so a line names no project. That includes the
 * project of each consumer.
 */
function entryLine(
	entry: PromotionMissingDependency | PromotionDependencyWarning,
	operation: Operation,
): string {
	const credentialType =
		'credentialType' in entry && entry.credentialType ? ` (${entry.credentialType})` : '';
	const workflowNames = entry.consumers.flatMap(({ workflows }) =>
		workflows.map(({ name }) => name),
	);
	const facts = [
		'reason' in entry ? APPLY_REASONS[entry.reason] : undefined,
		entry.blocking ? `stops the ${operation}` : undefined,
		`used by ${listNames(workflowNames)}`,
	].filter((fact) => fact !== undefined);

	return `  ${KINDS[entry.kind]} "${entry.name}"${credentialType}: ${facts.join('; ')}`;
}

function listNames(names: string[]): string {
	const listed = names.slice(0, MAX_LISTED_WORKFLOWS).join(', ');
	const more = names.length - MAX_LISTED_WORKFLOWS;
	return more > 0 ? `${listed} (+${more} more)` : listed;
}
