import { BaseCommand, EXIT_BLOCKED, EXIT_SOURCE_CHANGED, EXIT_SUCCESS } from '../../base-command';
import type { ApplyPackageResult, PromotionBindingPreflight } from '../../client';

type ReportFlags = { quiet?: boolean; format?: string; json?: boolean; jq?: string };

/** Shared result handling for Apply and Continue, which return the same statuses. */
export abstract class PromotionApplyCommand extends BaseCommand {
	protected reportApplyResult(
		result: ApplyPackageResult,
		flags: ReportFlags,
		connectionId: string,
	): void {
		// `succeed()` ignores --jq, so JSON output for every status goes through `output()`.
		if (this.isJsonMode(flags)) {
			this.output(result, flags);
			this.exit(exitCodeFor(result));
			return;
		}

		if (result.status === 'applied') {
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
			this.logToStderr(
				result.status === 'blocked'
					? blockedMessage(result, result.preflight, connectionId)
					: sourceChangedMessage(result),
			);
		}
		this.exit(exitCodeFor(result));
	}
}

function exitCodeFor(result: ApplyPackageResult): number {
	if (result.status === 'applied') return EXIT_SUCCESS;
	return result.status === 'blocked' ? EXIT_BLOCKED : EXIT_SOURCE_CHANGED;
}

function sourceChangedMessage(result: ApplyPackageResult): string {
	return [
		'The source changed since the review. Nothing was imported.',
		`Current source: config ${result.configId}, branch ${result.git.branchName}, commit ${result.git.commitSha}.`,
		'Review the changes again, then apply the new commit.',
	].join('\n');
}

function blockedMessage(
	result: ApplyPackageResult,
	preflight: PromotionBindingPreflight,
	connectionId: string,
): string {
	const bindings = (kind: 'credential' | 'variable') =>
		preflight.missingBindings.filter((binding) => binding.kind === kind).length;

	return [
		'Apply is blocked. Nothing was imported.',
		`  Missing projects:    ${preflight.missingProjects.length}`,
		`  Missing credentials: ${bindings('credential')}`,
		`  Missing variables:   ${bindings('variable')}`,
		`  Access requirements: ${preflight.accessRequirements.length}`,
		`  Conflicts:           ${preflight.conflicts.length}`,
		'Run with --json for the details. After you resolve them, run:',
		`  n8n-cli promotion-connection apply-continue ${shellQuote(connectionId)}` +
			` --expected-config-id=${shellQuote(result.configId)}` +
			` --expected-branch=${shellQuote(result.git.branchName)}` +
			` --expected-commit-sha=${shellQuote(result.git.commitSha)}`,
	].join('\n');
}

/** Branch names can contain shell metacharacters such as `;` and `$(`, so the shell must not interpret them. */
export function shellQuote(value: string): string {
	if (/^[\w./@-]+$/.test(value)) return value;
	return `'${value.replace(/'/g, "'\\''")}'`;
}
