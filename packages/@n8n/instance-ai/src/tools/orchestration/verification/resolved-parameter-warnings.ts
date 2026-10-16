/**
 * Parameter check for simulated nodes after a verification run.
 *
 * A simulated node's preview is fixture data, so an expression that resolved to
 * empty (or threw) leaves no trace in the run result. Replaying the node's
 * parameter resolution against the saved execution exposes it.
 */

import { z } from 'zod';

import type { InstanceAiExecutionService, ResolvedNodeParametersResult } from '../../../types';

export const resolvedParameterWarningSchema = z.object({
	nodeName: z.string(),
	executionId: z.string().optional(),
	path: z.string(),
	raw: z.string(),
	issue: z.enum(['empty', 'failed']),
	detail: z.string().optional(),
});

export const skippedParameterCheckSchema = z.object({
	nodeName: z.string(),
	executionId: z.string().optional(),
	reason: z.enum(['parameter-values-disabled', 'replay-failed', 'execution-unavailable']),
});

export type ResolvedParameterWarning = z.infer<typeof resolvedParameterWarningSchema>;
type SkippedParameterCheck = z.infer<typeof skippedParameterCheckSchema>;

export interface ParameterCheckRun {
	executionId?: string;
	nodeNames: readonly string[];
}

/** Keep the tool output compact when a node has many empty leaves. */
const MAX_WARNINGS = 20;
const MAX_SKIPPED_CHECKS = 20;

type WarningLogger = { debug(message: string, meta?: Record<string, unknown>): void };

export function warningsFromResolution(
	result: ResolvedNodeParametersResult,
): ResolvedParameterWarning[] {
	if (result.suppressed) return [];
	// Context that only exists in a live run ($secrets, $response, …) is expected
	// to be missing in a replay; it says nothing about the workflow.
	const failed = result.failedExpressions
		.filter((failure) => failure.reason !== 'unreconstructable-context')
		.map<ResolvedParameterWarning>((failure) => ({
			nodeName: result.nodeName,
			path: failure.path,
			raw: failure.raw,
			issue: 'failed',
			detail: failure.error,
		}));
	const empty = result.emptyResolutions
		.filter((resolution) => resolution.reason !== 'unreconstructable-context')
		.map<ResolvedParameterWarning>((resolution) => ({
			nodeName: result.nodeName,
			path: resolution.path,
			raw: resolution.raw,
			issue: 'empty',
		}));
	return [...failed, ...empty];
}

export async function collectResolvedParameterWarnings(args: {
	executionService: Pick<InstanceAiExecutionService, 'getResolvedNodeParameters'>;
	runs: readonly ParameterCheckRun[];
	logger?: WarningLogger;
}): Promise<{
	warnings: ResolvedParameterWarning[];
	skipped: SkippedParameterCheck[];
	skippedCount: number;
}> {
	const { executionService, runs, logger } = args;
	const warnings: ResolvedParameterWarning[] = [];
	const skipped: SkippedParameterCheck[] = [];
	let skippedCount = 0;
	const recordSkippedCheck = (check: SkippedParameterCheck) => {
		skippedCount++;
		if (skipped.length < MAX_SKIPPED_CHECKS) skipped.push(check);
	};
	for (const { executionId, nodeNames } of runs) {
		if (!executionId) {
			for (const nodeName of nodeNames) {
				recordSkippedCheck({ nodeName, reason: 'execution-unavailable' });
			}
			continue;
		}

		const settled = await Promise.allSettled(
			nodeNames.map(
				async (nodeName) => await executionService.getResolvedNodeParameters(executionId, nodeName),
			),
		);
		settled.forEach((outcome, index) => {
			const nodeName = nodeNames[index];
			if (outcome.status === 'fulfilled') {
				if (outcome.value.suppressed) {
					recordSkippedCheck({ nodeName, executionId, reason: outcome.value.suppressed });
				} else {
					warnings.push(
						...warningsFromResolution(outcome.value).map((warning) => ({
							...warning,
							executionId,
						})),
					);
				}
				return;
			}
			// Keep the run result, but disclose that its parameters were not checked.
			recordSkippedCheck({ nodeName, executionId, reason: 'replay-failed' });
			logger?.debug('Resolved-parameter check skipped for simulated node', {
				executionId,
				nodeName,
				error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
			});
		});
	}
	return { warnings: warnings.slice(0, MAX_WARNINGS), skipped, skippedCount };
}

export function buildResolvedParameterNote(
	warnings: readonly ResolvedParameterWarning[],
	skipped: readonly SkippedParameterCheck[] = [],
	skippedCount = skipped.length,
): string | undefined {
	const skipReasons = {
		'parameter-values-disabled': 'parameter values are disabled',
		'replay-failed': 'parameter replay failed',
		'execution-unavailable': 'the execution is unavailable',
	};
	const skippedNote =
		skipped.length > 0
			? 'Parameter check skipped for ' +
				skipped
					.map(
						({ nodeName, executionId, reason }) =>
							`${nodeName}${executionId ? ` (execution ${executionId})` : ''}: ${skipReasons[reason]}`,
					)
					.join('; ') +
				(skippedCount > skipped.length
					? `. Showing ${skipped.length} of ${skippedCount} skipped checks`
					: '') +
				'. All nodes with skipped checks have unchecked dynamic fields. Do not report those fields as verified.'
			: undefined;
	if (warnings.length === 0) return skippedNote;

	const byNode = new Map<string, string[]>();
	for (const warning of warnings) {
		const entry =
			warning.issue === 'failed'
				? `\`${warning.path}\` (${warning.raw}) failed: ${warning.detail ?? 'expression error'}`
				: `\`${warning.path}\` (${warning.raw}) resolved to empty`;
		const list = byNode.get(warning.nodeName) ?? [];
		list.push(entry);
		byNode.set(warning.nodeName, list);
	}
	const summary = [...byNode.entries()]
		.map(([nodeName, entries]) => `${nodeName}: ${entries.join(', ')}`)
		.join('; ');

	return [
		`Simulated-node parameter check: ${summary}. ` +
			'A simulated node’s preview is fixture data and does not prove these fields: fix the ' +
			'trigger input shape (for a Webhook, pass the {body, query, headers, params} envelope) or the ' +
			'expression, re-run verification, and do not report these fields as working until they resolve.',
		skippedNote,
	]
		.filter((note): note is string => note !== undefined)
		.join(' ');
}
