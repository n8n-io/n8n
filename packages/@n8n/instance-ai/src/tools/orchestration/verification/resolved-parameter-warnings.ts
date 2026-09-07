/**
 * Parameter check for simulated nodes after a verification run.
 *
 * A simulated node's preview is fixture data, so an expression that resolved to
 * empty (or threw) leaves no trace in the run result. Replaying the node's
 * parameter resolution against the saved execution exposes it.
 */

import type { InstanceAiExecutionService, ResolvedNodeParametersResult } from '../../../types';

export interface ResolvedParameterWarning {
	nodeName: string;
	/** Dot-path into the node's parameters tree. */
	path: string;
	/** The expression as authored (incl. leading `=`). */
	raw: string;
	issue: 'empty' | 'failed';
	/** Expression engine error for `failed`. */
	detail?: string;
}

/** Keep the tool output compact when a node has many empty leaves. */
const MAX_WARNINGS = 20;

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
	executionId: string;
	nodeNames: readonly string[];
	logger?: WarningLogger;
}): Promise<ResolvedParameterWarning[]> {
	const { executionService, executionId, nodeNames, logger } = args;
	if (nodeNames.length === 0) return [];

	const settled = await Promise.allSettled(
		nodeNames.map(
			async (nodeName) => await executionService.getResolvedNodeParameters(executionId, nodeName),
		),
	);

	const warnings: ResolvedParameterWarning[] = [];
	settled.forEach((outcome, index) => {
		if (outcome.status === 'fulfilled') {
			warnings.push(...warningsFromResolution(outcome.value));
			return;
		}
		// Advisory only: a replay failure must never fail the verification.
		logger?.debug('Resolved-parameter check skipped for simulated node', {
			executionId,
			nodeName: nodeNames[index],
			error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
		});
	});
	return warnings.slice(0, MAX_WARNINGS);
}

export function buildResolvedParameterNote(
	warnings: readonly ResolvedParameterWarning[],
): string | undefined {
	if (warnings.length === 0) return undefined;

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

	return (
		`Simulated-node parameter check — ${summary}. ` +
		'A simulated node’s preview is fixture data and does not prove these fields: fix the ' +
		'trigger input shape (for a Webhook, pass the {body, query, headers} envelope) or the ' +
		'expression, re-run verification, and do not report these fields as working until they resolve.'
	);
}
