import { formatDependencyReport, hasUnknownGap } from './dependency-report';
import { BaseCommand, EXIT_BLOCKED, EXIT_SOURCE_CHANGED, EXIT_SUCCESS } from '../../base-command';
import type {
	ApplyPackageResult,
	PromotionApplyCheck,
	PromotionEnvironmentSelectionProject,
	PromotionMoveProject,
	PromotionProjectDeletion,
	PromotionSelection,
} from '../../client';

type ReportFlags = { quiet?: boolean; format?: string; json?: boolean; jq?: string };

/** The Apply result that stopped for binding setup. */
type BlockedResult = Extract<ApplyPackageResult, { status: 'blocked' }>;

/** Builds the command that resumes a blocked Apply. Shapes differ per entry point. */
type ContinueCommand = (result: BlockedResult) => string;

/** Shared result handling for Apply and Continue, which return the same statuses. */
export abstract class PromotionApplyCommand extends BaseCommand {
	protected reportApplyResult(
		result: ApplyPackageResult,
		flags: ReportFlags,
		continueCommand: ContinueCommand,
	): void {
		// `succeed()` ignores --jq, so JSON output for every status goes through `output()`.
		if (this.isJsonMode(flags)) {
			this.output(result, flags);
			this.exit(exitCodeFor(result));
			return;
		}

		if (result.status === 'applied') {
			const moves = result.moves ?? [];
			const unpublished = moves.filter((move) => move.unpublished);
			const warningCount = result.warnings.length + unpublished.length;
			const warnings = warningCount > 0 ? ` with ${warningCount} warning(s)` : '';
			const moved = moves.length > 0 ? ` Moved ${moves.length} item(s) between projects.` : '';
			// What the Apply did for its dependencies: placeholders, moves, kept items, open gaps.
			if (!flags.quiet) {
				const notes = [
					...(result.dependencyMessages ?? []),
					...(result.dependencyReport?.gaps.length
						? [
								`Applied incomplete, with ${result.dependencyReport.gaps.length} gap(s). Run with --json for the report.`,
							]
						: []),
				];
				if (notes.length > 0) this.logToStderr(notes.join('\n'));
			}
			this.succeed(
				`Applied ${result.git.branchName} at commit ${result.git.commitSha} to the instance${warnings}.${moved}`,
				flags,
				result,
			);
			// The only case where an Apply unpublishes: the new project refused the published version.
			if (!flags.quiet) {
				for (const { name, id, unpublished: reason } of unpublished) {
					this.logToStderr(
						`Warning: the move unpublished workflow ${name} (${id}): ${reason?.reason ?? ''}`,
					);
				}
			}
			return;
		}

		if (!flags.quiet) {
			this.logToStderr(stopMessage(result, continueCommand));
		}
		this.exit(exitCodeFor(result));
	}
}

function exitCodeFor(result: ApplyPackageResult): number {
	if (result.status === 'applied') return EXIT_SUCCESS;
	// Changed gaps need an action of the user before a retry, like a block.
	if (result.status === 'blocked' || result.status === 'gaps-changed') return EXIT_BLOCKED;
	return EXIT_SOURCE_CHANGED;
}

function stopMessage(result: ApplyPackageResult, continueCommand: ContinueCommand): string {
	if (result.status === 'blocked') {
		return [
			blockedMessage(result, result.check, continueCommand),
			...(result.grants?.length
				? [`The Apply gave ${result.grants.length} grant(s) before it stopped. They stay.`]
				: []),
			...(result.dependencyReport ? formatDependencyReport(result.dependencyReport) : []),
		].join('\n');
	}
	if (result.status === 'gaps-changed') {
		const report = result.dependencyReport;
		return [
			'The Apply needs your decision on its dependencies. Nothing was imported.',
			...formatDependencyReport(report),
			hasUnknownGap(report)
				? 'This version of the CLI does not know every gap. Update the CLI before you confirm a gap.'
				: report.allowIncomplete
					? 'Close the gaps, or pass each gap ID to --confirm-gap. Pass the ID of each listed deletion to --confirm-deletion to accept its callers. Then apply again.'
					: 'Close the gaps, then apply again. Pass the ID of each listed deletion to --confirm-deletion to accept its callers.',
		].join('\n');
	}
	if (result.status === 'preview-changed') {
		return [
			'The Apply preview changed since you reviewed it. Nothing was imported.',
			'Run list-changes again. Review the changes. Then apply with the new revision.',
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

function blockedMessage(
	result: BlockedResult,
	check: PromotionApplyCheck,
	continueCommand: ContinueCommand,
): string {
	const bindings = (kind: 'credential' | 'variable') =>
		check.missingBindings.filter((binding) => binding.kind === kind).length;
	const projectDeletions = check.conflicts.filter(isProjectDeletion);
	const plannedMoves = check.plannedMoves ?? [];
	const unconfirmedMoves = plannedMoves.filter(({ needsConfirmation }) => needsConfirmation);
	const project = ({ id, name }: PromotionMoveProject) => (name ? `${name} (${id})` : id);

	return [
		'Apply is blocked. Nothing was imported.',
		`  Missing projects:    ${check.missingProjects.length}`,
		`  Missing credentials: ${bindings('credential')}`,
		`  Missing variables:   ${bindings('variable')}`,
		`  Access requirements: ${check.accessRequirements.length}`,
		`  Conflicts:           ${check.conflicts.length}`,
		...(projectDeletions.length > 0
			? [
					'Apply deletes these projects with everything in them:',
					...projectDeletions.map(({ project }) => `  ${project.name} (${project.id})`),
				]
			: []),
		...(plannedMoves.length > 0
			? [
					'Apply moves these items between projects. A moved workflow loses its shares:',
					...plannedMoves.map(
						({ kind, name, id, fromProject, toProject }) =>
							`  ${kind} ${name} (${id}): ${project(fromProject)} -> ${project(toProject)}`,
					),
				]
			: []),
		'Run with --json for the details. After you resolve them, run:',
		`  ${continueCommand(result)}`,
		...(check.conflicts.some(({ code }) => code === 'destructive-change')
			? [
					'To also apply data table changes that remove or retype columns, add --confirm-destructive-changes. The values in those columns are removed.',
				]
			: []),
		...(projectDeletions.length > 0
			? [
					"To also delete the projects listed above, add --confirm-destructive-changes. You can't undo this.",
				]
			: []),
		...(unconfirmedMoves.length > 0
			? [
					`To also move ${unconfirmedMoves.length} item(s) out of a project that the branch does not hold, add --confirm-destructive-changes.`,
				]
			: []),
	].join('\n');
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

/** The command that resumes a blocked whole-instance Apply. */
export function environmentContinueCommand(environmentId: string): ContinueCommand {
	return (result) =>
		`n8n-cli promotion-environment apply-continue ${shellQuote(environmentId)}` +
		expectedSourceArgs(result);
}

/**
 * The command that resumes a blocked selection Apply. It resends the same selection. It leaves
 * out the preview revision: setting up a binding changes the preview, so the old one never matches.
 */
export function selectionContinueCommand(
	projectId: string,
	{ workflowIds = [], folderIds = [], credentialIds = [] }: PromotionSelection,
): ContinueCommand {
	return (result) =>
		`n8n-cli promotion-environment apply-selection-continue ${shellQuote(projectId)}` +
		workflowIds.map((id) => ` -w ${shellQuote(id)}`).join('') +
		folderIds.map((id) => ` --folder ${shellQuote(id)}`).join('') +
		credentialIds.map((id) => ` --credential ${shellQuote(id)}`).join('') +
		expectedSourceArgs(result);
}

/**
 * The command that resumes a blocked Apply across projects. It is the same command with the
 * same selection, pinned to the source that the blocked Apply reported.
 */
export function environmentSelectionContinueCommand(
	environmentId: string,
	projects: PromotionEnvironmentSelectionProject[],
): ContinueCommand {
	const selection = projects
		.flatMap(({ projectId, workflowIds = [], folderIds = [], credentialIds = [] }) => [
			` -p ${shellQuote(projectId)}`,
			...workflowIds.map((id) => ` -w ${shellQuote(`${projectId}:${id}`)}`),
			...folderIds.map((id) => ` --folder ${shellQuote(`${projectId}:${id}`)}`),
			...credentialIds.map((id) => ` --credential ${shellQuote(`${projectId}:${id}`)}`),
		])
		.join('');
	return (result) =>
		`n8n-cli promotion-environment apply-environment-selection ${shellQuote(environmentId)}` +
		selection +
		expectedSourceArgs(result);
}

/** Branch names can contain shell metacharacters such as `;` and `$(`, so the shell must not interpret them. */
export function shellQuote(value: string): string {
	if (/^[\w./@-]+$/.test(value)) return value;
	return `'${value.replace(/'/g, "'\\''")}'`;
}
