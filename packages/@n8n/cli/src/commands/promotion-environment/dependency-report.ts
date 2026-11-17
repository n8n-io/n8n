import { Flags } from '@oclif/core';

import type { PromotionApplyConfirmations, PromotionDependencyReport } from '../../client';

type Gap = PromotionDependencyReport['gaps'][number];

/** The flag that accepts the gaps of an incomplete Promote or Apply. */
export function confirmGapFlag(operation: 'promotions' | 'applies') {
	return {
		confirmGap: Flags.string({
			description: `ID of a dependency gap that you accept, from the dependency report (repeat for more than one). Needs an environment that allows incomplete ${operation}.`,
			aliases: ['confirm-gap'],
			multiple: true,
		}),
	};
}

/** The flags that carry the confirmations of an Apply. */
export const applyConfirmationFlags = {
	...confirmGapFlag('applies'),
	confirmGrant: Flags.string({
		description:
			'ID of a credential grant that you accept, from the dependency report (repeat for more than one). The Apply then shares the credential with the project that uses it.',
		aliases: ['confirm-grant'],
		multiple: true,
	}),
	confirmDeletionCallers: Flags.boolean({
		description:
			'Accept that the Apply deletes workflows that other workflows on this instance call. The report lists the callers.',
		aliases: ['confirm-deletion-callers'],
	}),
	credentialHome: Flags.string({
		description:
			'Project that gets a credential that the branch holds without an owner, as <credentialId>:<projectId> (repeat for more than one)',
		aliases: ['credential-home'],
		multiple: true,
	}),
};

type ConfirmationFlags = {
	confirmGap?: string[];
	confirmGrant?: string[];
	confirmDeletionCallers?: boolean;
	credentialHome?: string[];
};

/** The confirmations of an Apply request. A field that is not set is dropped from the request. */
export function toApplyConfirmations(flags: ConfirmationFlags): PromotionApplyConfirmations {
	const homes: Record<string, string> = {};
	for (const value of flags.credentialHome ?? []) {
		const separator = value.indexOf(':');
		const credentialId = value.slice(0, separator);
		const projectId = value.slice(separator + 1);
		if (separator < 1 || projectId === '') {
			throw new Error(`Expected --credential-home as <credentialId>:<projectId>, got "${value}"`);
		}
		homes[credentialId] = projectId;
	}
	return {
		confirmedGapIds: flags.confirmGap,
		confirmedGrantIds: flags.confirmGrant,
		confirmDeletionCallers: flags.confirmDeletionCallers || undefined,
		credentialHomes: Object.keys(homes).length > 0 ? homes : undefined,
	};
}

/** The same confirmations as flags, for the command that the user runs next. */
export function confirmationArgs(confirmations: PromotionApplyConfirmations): string {
	return [
		...(confirmations.confirmedGapIds ?? []).map((id) => ` --confirm-gap=${quote(id)}`),
		...(confirmations.confirmedGrantIds ?? []).map((id) => ` --confirm-grant=${quote(id)}`),
		...(confirmations.confirmDeletionCallers ? [' --confirm-deletion-callers'] : []),
		...Object.entries(confirmations.credentialHomes ?? {}).map(
			([credentialId, projectId]) => ` --credential-home=${quote(`${credentialId}:${projectId}`)}`,
		),
	].join('');
}

/** A gap id holds `|`, which a shell reads as a pipe. */
function quote(value: string): string {
	return `'${value.replace(/'/g, "'\\''")}'`;
}

const GROUPS: Record<string, string> = {
	'same-project': 'in the same project, not selected',
	'other-project': 'in another project that you can promote or apply',
	'read-only-project': 'in a project that you cannot promote or apply',
	'no-access': 'in a project that you cannot access',
	personal: 'a personal resource. Move it to a team project',
	'outside-environment': 'in a project that this environment does not cover',
	'archived-on-destination': 'archived on the destination. Restore it',
	'access-not-grantable': 'the project cannot use it, and you cannot grant the access',
	'deleted-by-apply': 'this Apply deletes it. Remove the deletion from the selection',
	'caller-policy': 'its caller policy refuses the caller',
	'not-on-branch': 'not on the branch. The owner team must promote it',
};

const EXITS: Record<string, string> = {
	include: 'include it',
	'open-review': 'open the review',
	'ask-owner': 'ask the owner',
	'continue-incomplete': 'continue incomplete',
	restore: 'restore it',
	'remove-deletion': 'remove the deletion',
	'change-policy': 'change the caller policy',
	'add-project': 'an admin adds the project to the environment',
	'move-to-team-project': 'move it to a team project',
};

const HARD_BLOCKS: Record<string, string> = {
	'credential-type-mismatch': 'the destination holds a credential with this ID and another type',
	'ambiguous-credential-owner': 'the branch holds this credential under more than one project',
	'instance-credential-missing': 'create the instance credential on the destination',
	'incompatible-usage-scope': 'the usage scope on the destination is not compatible',
	'placeholder-create-forbidden':
		'you cannot create a credential in the project that needs the placeholder',
	'credential-move-forbidden': 'you cannot create a credential in the project that owns it',
};

function targetLabel({ target, usage }: Pick<Gap, 'target' | 'usage'>): string {
	const name = target.name ? `"${target.name}"` : target.id;
	const type = target.credentialType ? ` (${target.credentialType})` : '';
	const project = target.project ? ` in project "${target.project.name}"` : '';
	return `${usage} ${name}${type}${project}`;
}

/** True when this version of the CLI does not know a gap. Such a gap is a blocker. */
export function hasUnknownGap(report: PromotionDependencyReport): boolean {
	return report.gaps.some(({ group }) => !(group in GROUPS));
}

/**
 * The dependency report as lines of text. A gap of a group that this version does not know
 * is shown as a blocker: do not confirm what the CLI cannot explain.
 */
export function formatDependencyReport(report: PromotionDependencyReport): string[] {
	const lines: string[] = [];
	if (report.hardBlocks.length > 0) {
		lines.push('Blocks (a confirmation does not lift them):');
		for (const block of report.hardBlocks) {
			const detail = Object.entries(block.detail ?? {})
				.map(([key, value]) => `${key}: ${value}`)
				.join(', ');
			lines.push(
				`  ${block.target.name ?? block.target.id}: ${HARD_BLOCKS[block.code] ?? block.code}${detail ? ` (${detail})` : ''}`,
			);
		}
	}
	if (report.gaps.length > 0) {
		lines.push(
			report.allowIncomplete
				? `Gaps (${report.gaps.length}). This environment allows incomplete operations: pass each ID to --confirm-gap to continue.`
				: `Gaps (${report.gaps.length}). This environment is strict: close each gap first.`,
		);
		for (const gap of report.gaps) {
			const known = gap.group in GROUPS;
			const exits = gap.exits.map((exit) => EXITS[exit] ?? exit).join(', ');
			lines.push(
				`  ${gap.id}`,
				`    "${gap.consumer.name}" needs the ${targetLabel(gap)}: ${known ? GROUPS[gap.group] : `unknown gap "${gap.group}". Treat it as a blocker and update the CLI`}.`,
				...(exits ? [`    You can: ${exits}.`] : []),
				...(gap.placeholder
					? ['    An incomplete Apply creates an empty placeholder credential for it.']
					: []),
				...(gap.ownerRequestSent ? ['    Request sent to the owner.'] : []),
			);
		}
	}
	if (report.grants.length > 0) {
		lines.push('Access to grant. Pass each ID to --confirm-grant:');
		for (const grant of report.grants) {
			lines.push(`  ${grant.id}  "${grant.credential.name}" for project "${grant.project.name}"`);
		}
	}
	if (report.credentialHomeChoices.length > 0) {
		lines.push(
			'Credentials without an owner on the branch. Select a home with --credential-home=<credentialId>:<projectId>:',
		);
		for (const { credential, candidateProjects } of report.credentialHomeChoices) {
			const projects = candidateProjects.map(({ id, name }) => `${name} (${id})`).join(', ');
			lines.push(`  "${credential.name}" (${credential.id}). Projects: ${projects || 'none'}`);
		}
	}
	if (report.deletionCallers.length > 0) {
		lines.push('Workflows that call a workflow that this operation deletes:');
		for (const { target, callers, hiddenCallerCount } of report.deletionCallers) {
			const names = callers.map(({ name }) => `"${name}"`);
			if (hiddenCallerCount > 0) {
				names.push(
					`${hiddenCallerCount} workflow${hiddenCallerCount === 1 ? '' : 's'} that you cannot access`,
				);
			}
			lines.push(`  "${target.name}" is called by ${names.join(', ')}`);
		}
	}
	for (const move of report.credentialMoves) {
		lines.push(
			move.allowed
				? `"${move.credential.name}" moves into ${move.toProject.name}. The projects that use it keep access.`
				: move.blockedReason === 'managed' || move.blockedReason === 'end-user'
					? `"${move.credential.name}" stays where it is: a ${move.blockedReason} credential never moves.`
					: `"${move.credential.name}" has another owner on the destination. A user who may move it must apply.`,
		);
	}
	for (const { name, referencedBy } of report.keptWorkflows) {
		lines.push(
			`Workflow "${name}" is kept: ${referencedBy.map((caller) => `"${caller.name}"`).join(', ')} still references it.`,
		);
	}
	for (const { project, credentials } of report.keptProjects ?? []) {
		lines.push(
			`Project "${project.name}" is kept: the package uses ${credentials.map(({ name }) => `"${name}"`).join(', ')}.`,
		);
	}
	if (report.warnings.length > 0) {
		lines.push('Warnings (the operation continues):');
		for (const warning of report.warnings) {
			lines.push(
				`  "${warning.consumer.name}" references the ${targetLabel(warning)}: ${warning.code === 'broken-on-source' ? 'the reference is broken on the source and stays broken' : 'the branch does not hold it'}.`,
			);
		}
	}
	const instanceCredentials = report.notes.filter(({ code }) => code === 'instance-credential');
	for (const note of instanceCredentials) {
		lines.push(
			`Note: "${note.target?.name ?? note.target?.id}" is an instance credential. It is not promoted and must exist on the destination.`,
		);
	}
	if (report.notes.some(({ code }) => code === 'expression-not-checked')) {
		lines.push('Note: references that an expression computes are not checked.');
	}
	return lines;
}
