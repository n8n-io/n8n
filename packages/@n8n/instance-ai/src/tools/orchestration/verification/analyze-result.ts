import { isRecord } from '@n8n/utils/is-record';
import { isPlaceholderValue } from '@n8n/utils/placeholder';

import type { ExecutionRunResult, VerificationNodePreview } from './types';
import {
	createRemediation,
	terminalRemediationFromState,
} from '../../../workflow-loop/remediation';
import type {
	RemediationMetadata,
	WorkflowBuildOutcome,
	WorkflowLoopState,
} from '../../../workflow-loop/workflow-loop-state';

type ExecutionNodeError = NonNullable<ExecutionRunResult['nodeErrors']>[number];

const CREDENTIAL_FAILURE_KEYWORDS = [
	'credential',
	'unauthorized',
	'forbidden',
	'401',
	'403',
	'free tier',
	'quota',
];
const TRANSIENT_FAILURE_KEYWORDS = ['429', 'rate limit', '502', 'bad gateway', 'timed out'];

function stringifyForToolOutput(value: unknown): string {
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value) ?? String(value);
	} catch {
		return String(value);
	}
}

function unwrapUntrustedData(value: string): unknown {
	const match = /^<untrusted_data\b[^>]*>\n([\s\S]*)\n<\/untrusted_data>$/i.exec(value);
	if (!match) return value;
	const content = match[1];
	if (content === undefined) return value;

	try {
		const parsed: unknown = JSON.parse(content);
		return parsed;
	} catch {
		return value;
	}
}

function outputForInspection(nodeOutput: unknown): unknown {
	return typeof nodeOutput === 'string' ? unwrapUntrustedData(nodeOutput) : nodeOutput;
}

function getCountFromMetadata(value: unknown): number | undefined {
	if (!isRecord(value)) return undefined;

	for (const key of ['totalItems', '_itemCount']) {
		const count = value[key];
		if (typeof count === 'number' && Number.isFinite(count) && count >= 0) {
			return count;
		}
	}

	return undefined;
}

function countOutputItems(nodeOutput: unknown): number | undefined {
	const output = outputForInspection(nodeOutput);
	if (Array.isArray(output)) return output.length;
	const metadataCount = getCountFromMetadata(output);
	if (metadataCount !== undefined) return metadataCount;
	if (output === undefined || output === null) return 0;
	return 1;
}

function previewValue(value: unknown, maxChars: number): { preview: string; truncated: boolean } {
	const serialized = stringifyForToolOutput(value);
	if (maxChars <= 0) {
		return { preview: '', truncated: serialized.length > 0 };
	}
	if (serialized.length <= maxChars) {
		return { preview: serialized, truncated: false };
	}
	return { preview: `${serialized.slice(0, maxChars)}...`, truncated: true };
}

export function buildNodePreviews(
	resultData: Record<string, unknown> | undefined,
	maxChars: number,
	simulatedNodeNames?: ReadonlySet<string>,
): VerificationNodePreview[] {
	if (!resultData) return [];

	return Object.entries(resultData).map(([nodeName, nodeOutput]) => {
		const serialized = stringifyForToolOutput(nodeOutput);
		const preview = previewValue(nodeOutput, maxChars);
		return {
			nodeName,
			itemCount: countOutputItems(nodeOutput),
			preview: preview.preview,
			truncated: preview.truncated,
			chars: serialized.length,
			...(simulatedNodeNames?.has(nodeName) ? { simulated: true } : {}),
		};
	});
}

export function countProducedOutputRows(
	resultData: Record<string, unknown> | undefined,
): number | undefined {
	if (!resultData) return undefined;
	let count = 0;
	for (const nodeOutput of Object.values(resultData)) {
		const itemCount = countOutputItems(nodeOutput);
		if (itemCount !== undefined) count += itemCount;
	}
	return count;
}

function maxEmittedItemCount(resultData: Record<string, unknown> | undefined): number {
	if (!resultData) return 0;

	let max = 0;
	for (const nodeOutput of Object.values(resultData)) {
		const count = countOutputItems(nodeOutput) ?? 0;
		if (count > max) max = count;
	}
	return max;
}

function messageMatchesAny(normalized: string, keywords: readonly string[]): boolean {
	return keywords.some((keyword) => normalized.includes(keyword));
}

function classifyVerificationFailure(
	error: string | undefined,
	status: string | undefined,
	buildOutcome: WorkflowBuildOutcome,
): RemediationMetadata {
	if (status === 'waiting') {
		const hasSimulationPlan = (buildOutcome.nodeSimulationPlan?.length ?? 0) > 0;
		return createRemediation({
			category: 'needs_setup',
			shouldEdit: false,
			reason: hasSimulationPlan ? 'unsimulated_user_action_node' : 'execution_waiting',
			guidance: hasSimulationPlan
				? 'Verification paused on a node that waits for user action and was not simulated — ' +
					'nodes downstream of it were not verified. This is not a workflow bug: do not edit ' +
					'the code. Report to the user which node paused and that the rest of the workflow ' +
					'needs a manual test.'
				: 'Workflow verification is waiting for user action or setup. Stop code edits and ask the user to complete setup.',
		});
	}

	const normalized = (error ?? '').toLowerCase();
	const mockedCredentialTypeCount = buildOutcome.mockedCredentialTypes?.length ?? 0;
	const mockedNodeCount = buildOutcome.mockedNodeNames?.length ?? 0;
	const hasMockedCredentialContext = Boolean(mockedCredentialTypeCount > 0 || mockedNodeCount > 0);
	if (isPlaceholderValue(error)) {
		return createRemediation({
			category: 'needs_setup',
			shouldEdit: false,
			reason: 'mocked_credentials_or_placeholders',
			guidance:
				'Workflow verification reached an unresolved setup value. Stop code edits and route to workflows(action="setup").',
		});
	}

	if (messageMatchesAny(normalized, CREDENTIAL_FAILURE_KEYWORDS)) {
		return createRemediation({
			category: 'needs_setup',
			shouldEdit: false,
			reason: hasMockedCredentialContext
				? 'mocked_credentials_or_placeholders'
				: 'credential_or_setup_failure',
			guidance: hasMockedCredentialContext
				? 'Workflow submitted successfully, but verification is blocked by mocked credentials. Stop code edits and route to workflows(action="setup").'
				: 'Workflow submitted successfully, but verification requires credential or account setup. Stop code edits and route to workflows(action="setup").',
		});
	}

	if (messageMatchesAny(normalized, TRANSIENT_FAILURE_KEYWORDS)) {
		return createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'external_service_or_timeout',
			guidance:
				'Workflow submitted successfully, but verification is blocked by an external service or timeout. Stop code edits and explain the blocker to the user.',
		});
	}

	return createRemediation({
		category: 'code_fixable',
		shouldEdit: true,
		reason: 'runtime_failure',
		guidance:
			'Verification found a workflow runtime failure. Diagnose it and apply one batched workflow-code repair if the guard allows it.',
	});
}

function buildSimulationNote(
	reachedSimulatedNodes: Array<{ nodeName: string; reason: string }>,
	planMissing: boolean,
): string | undefined {
	if (reachedSimulatedNodes.length > 0) {
		return (
			`Simulated ${reachedSimulatedNodes.length} node(s) during verification — no real external writes happened: ` +
			reachedSimulatedNodes.map((n) => `${n.nodeName} (${n.reason})`).join('; ') +
			'. Relay this to the user when presenting the result.'
		);
	}
	if (planMissing) {
		return (
			'No simulation plan was available for this verification run — nodes were NOT ' +
			'simulated and may have performed real external writes (sent messages, created or ' +
			'modified records). Relay this to the user when presenting the result.'
		);
	}
	return undefined;
}

function buildCoverageNote(
	nodesNotReached: string[],
	result: ExecutionRunResult,
	success: boolean,
): string | undefined {
	if (nodesNotReached.length === 0) return undefined;
	const ending = result.lastNodeExecuted
		? `. Execution ended at "${result.lastNodeExecuted}"${success ? ' because it produced no output items (empty item lists stop downstream nodes)' : ''}.`
		: '.';
	const collapsedFromCollection = success && maxEmittedItemCount(result.data) >= 2;
	const guidance = success
		? collapsedFromCollection
			? ' An upstream node emitted multiple items but the chain collapsed to zero before reaching them. The usual cause is a Code node reading `$input.first().json` (a single split item) instead of `$input.all().map(i => i.json)` — an HTTP Request node splits a top-level array (including a bare array of IDs) into one item per element. Fix the node that dropped the items to read every item, then re-run verification. Do NOT report the workflow as fully verified.'
			: ' This usually means a lookup or query returned nothing. Seed matching test data and re-run verification, or tell the user the unreached part needs a manual test. Do NOT report the workflow as fully verified.'
		: '';
	return (
		`Partial coverage: ${nodesNotReached.length} node(s) were never reached and remain UNVERIFIED: ` +
		nodesNotReached.join(', ') +
		ending +
		guidance
	);
}

function buildNodeErrorMessage(nodeErrors: ExecutionNodeError[]): string | undefined {
	if (nodeErrors.length === 0) return undefined;

	return nodeErrors
		.map((nodeError) =>
			nodeError.message
				? `${nodeError.nodeName}: ${nodeError.message}`
				: `${nodeError.nodeName}: node execution failed`,
		)
		.join('; ');
}

export function namesOrDataKeys(
	reachedNames: Set<string>,
	data: Record<string, unknown> | undefined,
): string[] | undefined {
	if (reachedNames.size > 0) return [...reachedNames];
	return data ? Object.keys(data) : undefined;
}

export interface VerificationAnalysis {
	success: boolean;
	reachedNames: Set<string>;
	reachedSimulatedNodes: Array<{ nodeName: string; reason: string }>;
	nodesNotReached: string[];
	remediation?: RemediationMetadata;
	nodesExecuted?: string[];
	simulationNote?: string;
	coverageNote?: string;
	errorMessage?: string;
	nodeErrors: ExecutionNodeError[];
}

export function analyzeVerificationResult(args: {
	result: ExecutionRunResult;
	buildOutcome: WorkflowBuildOutcome;
	simulatedNodes: Array<{ nodeName: string; reason: string }>;
	stateBefore: WorkflowLoopState | undefined;
	runId: string;
}): VerificationAnalysis {
	const { result, buildOutcome, simulatedNodes, stateBefore, runId } = args;
	const nodeErrors = result.nodeErrors ?? [];
	const reachedNames = new Set(
		result.executedNodeNames ?? (result.data ? Object.keys(result.data) : []),
	);
	const reachedSimulatedNodes = simulatedNodes.filter((n) => reachedNames.has(n.nodeName));
	const nodesNotReached = (buildOutcome.nodeSimulationPlan ?? [])
		.map((verdict) => verdict.nodeName)
		.filter((name) => !reachedNames.has(name));
	const hasSimulationPlan = (buildOutcome.nodeSimulationPlan?.length ?? 0) > 0;
	const hasOutput = result.data ? Object.keys(result.data).length > 0 : false;
	const errorMessage = result.error ?? buildNodeErrorMessage(nodeErrors);
	const success =
		nodeErrors.length === 0 &&
		(result.status === 'success' ||
			(!hasSimulationPlan && result.status === 'waiting' && !errorMessage && hasOutput));
	const failureRemediation = success
		? undefined
		: classifyVerificationFailure(
				errorMessage,
				// Only escalate a clean status; 'waiting' must keep its needs_setup routing.
				nodeErrors.length > 0 && result.status === 'success' ? 'error' : result.status,
				buildOutcome,
			);
	const budgetRemediation =
		failureRemediation?.shouldEdit === true
			? terminalRemediationFromState(stateBefore, runId)
			: undefined;
	const remediation = budgetRemediation ?? failureRemediation;

	return {
		success,
		reachedNames,
		reachedSimulatedNodes,
		nodesNotReached,
		remediation,
		nodesExecuted: namesOrDataKeys(reachedNames, result.data),
		simulationNote: buildSimulationNote(reachedSimulatedNodes, false),
		coverageNote: buildCoverageNote(nodesNotReached, result, success),
		errorMessage,
		nodeErrors,
	};
}
