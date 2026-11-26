import {
	applyDependencyLines,
	countBlockingOutsideAccess,
	countByBlocking,
	escapeControlCharacters,
} from './missing-dependencies';
import { BaseCommand, EXIT_BLOCKED, EXIT_SOURCE_CHANGED, EXIT_SUCCESS } from '../../base-command';
import type {
	ApplyPackageResult,
	PromotionApplyCheck,
	PromotionProjectDeletion,
	PromotionSelection,
} from '../../client';

export type ReportFlags = { quiet?: boolean; format?: string; json?: boolean; jq?: string };

/**
 * The pin and the confirmation that the user passed. A Continue command that only adds a
 * confirmation keeps them. `apply` and `apply-selection` have no confirmation flag.
 */
type ApplyReportFlags = ReportFlags & {
	expectedPreviewRevision?: string;
	confirmDestructiveChanges?: boolean;
};

type AppliedResult = Extract<ApplyPackageResult, { status: 'applied' }>;

/** The Apply result that stopped for binding setup, or for a confirmation. */
type BlockedResult = Extract<ApplyPackageResult, { status: 'blocked' }>;

/** Builds the command that resumes a blocked Apply. Shapes differ per entry point. */
type ContinueCommand = (result: BlockedResult) => string;

/** Shared result handling for Apply and Continue, which return the same statuses. */
export abstract class PromotionApplyCommand extends BaseCommand {
	protected reportApplyResult(
		result: ApplyPackageResult,
		flags: ApplyReportFlags,
		continueCommand: ContinueCommand,
		previewCommand: string,
	): void {
		// `succeed()` ignores --jq, so JSON output for every status goes through `output()`.
		if (this.isJsonMode(flags)) {
			this.output(result, flags);
			this.exit(exitCodeFor(result));
			return;
		}

		if (result.status === 'applied') {
			const stillMissing = stillMissingLines(result);
			// On stderr, so stdout holds only the success line.
			if (stillMissing.length > 0 && !flags.quiet) {
				this.logToStderr([...stillMissing, ''].join('\n'));
			}
			const warnings =
				result.warnings.length > 0 ? ` with ${result.warnings.length} warning(s)` : '';
			this.succeed(
				`Applied ${result.git.branchName} at commit ${result.git.commitSha} to the instance${warnings}.`,
				flags,
				result,
			);
			return;
		}

		if (!flags.quiet) {
			this.logToStderr(stopMessage(result, flags, continueCommand, previewCommand));
		}
		this.exit(exitCodeFor(result));
	}
}

function exitCodeFor(result: ApplyPackageResult): number {
	if (result.status === 'applied') return EXIT_SUCCESS;
	return result.status === 'blocked' ? EXIT_BLOCKED : EXIT_SOURCE_CHANGED;
}

/**
 * What a successful Apply left unresolved. A warning is not a missing dependency, so warnings
 * alone get no heading.
 */
function stillMissingLines({ missingDependencies = [], warnings }: AppliedResult): string[] {
	const lines = applyDependencyLines(missingDependencies, warnings, { descriptions: false });
	return missingDependencies.length > 0
		? ['These dependencies are still missing on this instance:', '', ...lines]
		: lines;
}

function stopMessage(
	result: ApplyPackageResult,
	flags: ApplyReportFlags,
	continueCommand: ContinueCommand,
	previewCommand: string,
): string {
	if (result.status === 'blocked') {
		return blockedMessage(result, result.check, flags, continueCommand);
	}
	if (result.status === 'preview-changed') {
		return [
			'The Apply preview changed since you reviewed it. Nothing was imported.',
			`Run ${previewCommand}. Review the changes. Then apply with the new revision.`,
		].join('\n');
	}
	return sourceChangedMessage(result);
}

function sourceChangedMessage(result: ApplyPackageResult): string {
	return [
		'The source changed since the review. Nothing was imported.',
		`Current source: environment ${result.environmentId}, branch ${result.git.branchName}, commit ${result.git.commitSha}.`,
		'Review the changes again, then apply the new commit.',
	].join('\n');
}

/** What `--confirm-destructive-changes` does, for each kind of conflict that it confirms. */
const DESTRUCTIVE_CHANGES = {
	dataTables: {
		toAdd:
			'To also apply data table changes that remove or retype columns, add --confirm-destructive-changes. The values in those columns are removed.',
		inCommand:
			'With --confirm-destructive-changes, this command applies data table changes that remove or retype columns. The values in those columns are removed.',
	},
	projects: {
		toAdd:
			"To also delete the projects listed above, add --confirm-destructive-changes. You can't undo this.",
		inCommand:
			"With --confirm-destructive-changes, this command deletes the projects listed above. You can't undo this.",
	},
};

function blockedMessage(
	result: BlockedResult,
	check: PromotionApplyCheck,
	flags: ApplyReportFlags,
	continueCommand: ContinueCommand,
): string {
	const bindings = (kind: 'credential' | 'variable') =>
		check.missingBindings.filter((binding) => binding.kind === kind).length;
	const projectDeletions = check.conflicts.filter(isProjectDeletion);
	const dataTableChanges = check.conflicts.some(({ code }) => code === 'destructive-change');
	const dependencies = applyDependencyLines(check.missingDependencies);
	const { blocking, confirmable } = countByBlocking(check.missingDependencies);
	const confirmableConflicts = check.conflicts.filter(isConfirmableConflict).length;
	// The server rule: a missing project never stops the Apply, and a confirmation covers the
	// destructive conflicts and the entries that do not stop the Apply. The user must resolve
	// the other causes.
	const toResolve =
		blocking +
		check.missingBindings.length +
		check.accessRequirements.length +
		(check.conflicts.length - confirmableConflicts);
	const confirmsOnly = confirmable > 0 && toResolve === 0;
	const destructiveConfirmed =
		confirmableConflicts === 0 || flags.confirmDestructiveChanges === true;
	const needsOnlyConfirmation = confirmsOnly && destructiveConfirmed;
	const destructiveHint = needsOnlyConfirmation ? 'inCommand' : 'toAdd';

	return [
		needsOnlyConfirmation
			? 'Apply needs a confirmation. Nothing was imported.'
			: 'Apply is blocked. Nothing was imported.',
		// The counts name the causes to resolve. There is none when only the confirmation is missing.
		...(needsOnlyConfirmation
			? []
			: [
					`  Missing projects:    ${check.missingProjects.length}`,
					`  Missing credentials: ${bindings('credential')}`,
					`  Missing variables:   ${bindings('variable')}`,
					`  Access requirements: ${check.accessRequirements.length}`,
					`  Conflicts:           ${check.conflicts.length}`,
					// These entries are in no other list, so an Apply can stop on them alone. The line
					// counts causes, so it leaves out the entries that only need a confirmation.
					`  Outside your access: ${countBlockingOutsideAccess(check.missingDependencies)}`,
				]),
		...(projectDeletions.length > 0
			? [
					'Apply deletes these projects with everything in them:',
					...projectDeletions.map(
						({ project }) =>
							`  ${escapeControlCharacters(project.name)} (${escapeControlCharacters(project.id)})`,
					),
				]
			: []),
		...(dependencies.length > 0 ? ['', ...dependencies, ''] : []),
		...(confirmsOnly
			? [
					'Run with --json for the details. To apply without these dependencies, run:',
					`  ${continueCommand(result)}${confirmationArgs(flags)}`,
				]
			: [
					'Run with --json for the details. After you resolve them, run:',
					`  ${continueCommand(result)}`,
				]),
		...(confirmsOnly && !destructiveConfirmed
			? ['This command stays blocked until you also add --confirm-destructive-changes.']
			: []),
		...(confirmable > 0 && !confirmsOnly
			? [
					'The dependencies that do not stop the Apply need a confirmation. To apply without them, add --confirm-missing-dependencies after you resolve the others.',
				]
			: []),
		...(dataTableChanges ? [DESTRUCTIVE_CHANGES.dataTables[destructiveHint]] : []),
		...(projectDeletions.length > 0 ? [DESTRUCTIVE_CHANGES.projects[destructiveHint]] : []),
	].join('\n');
}

/**
 * The flags of a Continue command that only adds a confirmation. Nothing is set up before that
 * run, so the preview stays the same: the command keeps the revision that the user passed, and
 * the confirmation covers the list that the user read.
 */
function confirmationArgs({
	expectedPreviewRevision,
	confirmDestructiveChanges,
}: ApplyReportFlags): string {
	return (
		(expectedPreviewRevision === undefined
			? ''
			: ` --expected-preview-revision=${shellQuote(expectedPreviewRevision)}`) +
		(confirmDestructiveChanges ? ' --confirm-destructive-changes' : '') +
		' --confirm-missing-dependencies'
	);
}

/** The conflicts that `--confirm-destructive-changes` confirms. The user resolves the others. */
function isConfirmableConflict({ code }: Record<string, unknown>): boolean {
	return code === 'destructive-change' || code === 'project-deletion';
}

function isProjectDeletion(
	conflict: Record<string, unknown>,
): conflict is PromotionProjectDeletion {
	return conflict.code === 'project-deletion';
}

/** The `--expected-*` flags that pin a Continue run to the source a blocked Apply reported. */
function expectedSourceArgs(result: BlockedResult): string {
	return (
		` --expected-environment-id=${shellQuote(result.environmentId)}` +
		` --expected-branch=${shellQuote(result.git.branchName)}` +
		` --expected-commit-sha=${shellQuote(result.git.commitSha)}`
	);
}

/**
 * The command that resumes a blocked whole-instance Apply. It leaves out the preview revision:
 * resolving a cause, such as setting up a binding, changes the preview, so the old one never
 * matches. When only a confirmation is missing, `confirmationArgs` adds the revision back.
 */
export function environmentContinueCommand(environmentId: string): ContinueCommand {
	return (result) =>
		`n8n-cli promotion-environment apply-continue ${shellQuote(environmentId)}` +
		expectedSourceArgs(result);
}

/**
 * The command that resumes a blocked selection Apply. It resends the same selection. It leaves
 * out the preview revision, for the same reason as `environmentContinueCommand`.
 */
export function selectionContinueCommand(
	projectId: string,
	{ workflowIds = [], folderIds = [] }: PromotionSelection,
): ContinueCommand {
	return (result) =>
		`n8n-cli promotion-environment apply-selection-continue ${shellQuote(projectId)}` +
		workflowIds.map((id) => ` -w ${shellQuote(id)}`).join('') +
		folderIds.map((id) => ` --folder ${shellQuote(id)}`).join('') +
		expectedSourceArgs(result);
}

/** The command that shows the whole-instance Apply preview, with its new revision. */
export function environmentPreviewCommand(environmentId: string): string {
	return `n8n-cli promotion-environment list-apply-changes ${shellQuote(environmentId)} --json`;
}

/** The command that shows the Apply preview of a project, with its new revision. */
export function selectionPreviewCommand(projectId: string): string {
	return `n8n-cli promotion-environment list-changes ${shellQuote(projectId)} apply --json`;
}

/** Branch names can contain shell metacharacters such as `;` and `$(`, so the shell must not interpret them. */
export function shellQuote(value: string): string {
	if (/^[\w./@-]+$/.test(value)) return value;
	return `'${value.replace(/'/g, "'\\''")}'`;
}
