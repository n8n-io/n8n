import { shellQuote, type ReportFlags } from './apply-command';
import { promoteDependencyLines } from './missing-dependencies';
import { BaseCommand, EXIT_BLOCKED, EXIT_SOURCE_CHANGED, EXIT_SUCCESS } from '../../base-command';
import type { PromotePackageResult } from '../../client';

/** The Promote result that waits for the confirmation of its missing dependencies. */
type RefusedResult = Extract<PromotePackageResult, { status: 'missing-dependencies' }>;

/** The texts that differ between a Promote of the instance and a Promote of a selection. */
interface PromoteReport {
	/** The start of the success line, before the branch and the commit. */
	promoted: string;
	/** What to do after the preview changed. */
	previewChanged: string;
	/** The same command, with the confirmation of the missing dependencies. */
	confirmCommand: string;
}

/** Shared result handling for the two Promote commands, which return the same statuses. */
export abstract class PromotionPromoteCommand extends BaseCommand {
	protected reportPromoteResult(
		result: PromotePackageResult,
		flags: ReportFlags,
		report: PromoteReport,
	): void {
		// `succeed()` ignores --jq, so JSON output for every status goes through `output()`.
		if (this.isJsonMode(flags)) {
			this.output(result, flags);
			this.exit(exitCodeFor(result));
			return;
		}

		if (result.status === 'preview-changed' || result.status === 'missing-dependencies') {
			if (!flags.quiet) {
				this.logToStderr(
					result.status === 'preview-changed'
						? report.previewChanged
						: refusedMessage(result, report.confirmCommand),
				);
			}
			this.exit(exitCodeFor(result));
			return;
		}

		const leftOut = promoteDependencyLines(result.missingDependencies, [], {
			descriptions: false,
		});
		// On stderr, so stdout holds only the success line.
		if (leftOut.length > 0 && !flags.quiet) {
			this.logToStderr(
				['The branch does not hold these dependencies:', '', ...leftOut, ''].join('\n'),
			);
		}
		this.succeed(
			`${report.promoted} to ${result.git.branchName} as commit ${result.git.commitSha}.`,
			flags,
			result,
		);
	}
}

function exitCodeFor(result: PromotePackageResult): number {
	if (result.status === 'preview-changed') return EXIT_SOURCE_CHANGED;
	return result.status === 'missing-dependencies' ? EXIT_BLOCKED : EXIT_SUCCESS;
}

function refusedMessage(result: RefusedResult, confirmCommand: string): string {
	return [
		'Promote needs a confirmation. Nothing was pushed.',
		'',
		...promoteDependencyLines(result.missingDependencies, result.warnings),
		'',
		'To promote without the missing dependencies, run:',
		`  ${confirmCommand}`,
	].join('\n');
}

/**
 * The Promote command that confirms the missing dependencies. `command` is the command name
 * with the arguments and the flags that only this command has.
 */
export function promoteConfirmCommand(
	command: string,
	flags: { message?: string; expectedPreviewRevision?: string },
): string {
	return (
		`n8n-cli promotion-environment ${command}` +
		(flags.message === undefined ? '' : ` -m ${shellQuote(flags.message)}`) +
		(flags.expectedPreviewRevision === undefined
			? ''
			: ` --expected-preview-revision=${shellQuote(flags.expectedPreviewRevision)}`) +
		' --confirm-missing-dependencies'
	);
}
