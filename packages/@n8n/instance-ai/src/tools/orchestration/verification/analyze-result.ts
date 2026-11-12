import { isRecord } from '@n8n/utils/is-record';
import { isPlaceholderValue } from '@n8n/utils/placeholder';
import { toEngineConnections, type WorkflowJSON } from '@n8n/workflow-sdk';
import { getParentNodes, mapConnectionsByDestination, NodeConnectionTypes } from 'n8n-workflow';

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
import {
	buildChatModelFailureGuidance,
	classifyChatModelFailure,
	type ChatModelRecoveryContext,
} from '../../workflows/chat-model-validation';

export type ChatModelRecoveryOptions = Pick<
	ChatModelRecoveryContext,
	'suggestionsByNodeName' | 'creditsCoveredNodeNames'
>;

type ExecutionNodeError = NonNullable<ExecutionRunResult['nodeErrors']>[number];

/** Disclosure for a node whose output came from pin data saved on the workflow. */
export const WORKFLOW_PIN_SIMULATION_REASON =
	'Output came from pinned data saved on the workflow — unpin it for a live test';

/** Disclosure for a trigger whose output the assistant injected instead of a real event. */
export const INJECTED_TRIGGER_SIMULATION_REASON =
	'Trigger output was injected test input, not a real event — run a live test to prove the trigger';

/** Injected trigger output, deduplicated against the other simulation sources. */
export function injectedTriggerSimulations(
	injectedTriggerNodeName: string | undefined,
	reachedNames: ReadonlySet<string>,
	alreadySimulatedNames: ReadonlySet<string>,
): Array<{ nodeName: string; reason: string }> {
	if (
		injectedTriggerNodeName === undefined ||
		!reachedNames.has(injectedTriggerNodeName) ||
		alreadySimulatedNames.has(injectedTriggerNodeName)
	) {
		return [];
	}
	return [{ nodeName: injectedTriggerNodeName, reason: INJECTED_TRIGGER_SIMULATION_REASON }];
}

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

/** Per-output counts when the adapter grouped a multi-output node's items per output. */
function countOutputBranchItems(nodeOutput: unknown): VerificationNodePreview['outputs'] {
	const output = outputForInspection(nodeOutput);
	if (!isRecord(output) || !Array.isArray(output.outputs)) return undefined;
	return output.outputs.filter(isRecord).map((branch, position) => ({
		index: typeof branch.index === 'number' ? branch.index : position,
		...(typeof branch.name === 'string' ? { name: branch.name } : {}),
		itemCount: countOutputItems(branch.items),
	}));
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
	simulatedMaxChars = maxChars,
): VerificationNodePreview[] {
	if (!resultData) return [];

	return Object.entries(resultData).map(([nodeName, nodeOutput]) => {
		const serialized = stringifyForToolOutput(nodeOutput);
		const limit = simulatedNodeNames?.has(nodeName) ? simulatedMaxChars : maxChars;
		const preview = previewValue(nodeOutput, limit);
		const outputs = countOutputBranchItems(nodeOutput);
		return {
			nodeName,
			itemCount: countOutputItems(nodeOutput),
			...(outputs ? { outputs } : {}),
			preview: preview.preview,
			truncated: preview.truncated,
			chars: serialized.length,
			...(simulatedNodeNames?.has(nodeName) ? { simulated: true } : {}),
		};
	});
}

/**
 * Item JSON of a node, or `undefined` when the preview omits items (a size cap,
 * or a collapsed result that keeps only its first item): the hidden items can hold data.
 */
function completeItems(nodeOutput: unknown): unknown[] | undefined {
	const output = outputForInspection(nodeOutput);
	if (Array.isArray(output)) return output;
	if (!isRecord(output)) return undefined;
	let items: unknown[] | undefined;
	if (Array.isArray(output.outputs)) {
		const branches = output.outputs.filter(isRecord).map((branch) => completeItems(branch.items));
		items = branches.includes(undefined) ? undefined : branches.flat();
	} else if (Array.isArray(output.items)) {
		items = output.items;
	} else if ('_firstItemPreview' in output) {
		items = [output._firstItemPreview];
	}
	return items?.length === getCountFromMetadata(output) ? items : undefined;
}

const isEmptyItem = (item: unknown) => isRecord(item) && Object.keys(item).length === 0;

/**
 * A real node that returns only `{}` items still ends the run green, so the
 * agent read a `[{}]` preview as a working step (INS-1583). Only the first
 * empty node of a chain is named: nodes below it just pass the emptiness on.
 * Roots (triggers) are skipped, because a Manual Trigger emits `{}` by design.
 * Simulated nodes are skipped, because their output is a fixture. Nodes that
 * output a file are not empty: their data is in the binary, which `resultData` omits.
 */
export function buildEmptyOutputNote(
	resultData: Record<string, unknown> | undefined,
	connections: WorkflowJSON['connections'] | undefined,
	simulatedNodeNames: ReadonlySet<string>,
	binaryOutputNodeNames: readonly string[] = [],
): string | undefined {
	if (!resultData || !connections) return undefined;
	const byDestination = mapConnectionsByDestination(toEngineConnections(connections));
	const parentsOf = (nodeName: string) =>
		getParentNodes(byDestination, nodeName, NodeConnectionTypes.Main, 1);
	const emptyNonRootNames = new Set(
		Object.entries(resultData)
			.filter(([nodeName, output]) => {
				const items = completeItems(output);
				return (
					items !== undefined &&
					items.length > 0 &&
					items.every(isEmptyItem) &&
					!binaryOutputNodeNames.includes(nodeName) &&
					parentsOf(nodeName).length > 0
				);
			})
			.map(([nodeName]) => nodeName),
	);
	const flagged = [...emptyNonRootNames].filter(
		(nodeName) =>
			!simulatedNodeNames.has(nodeName) &&
			!parentsOf(nodeName).some((parent) => emptyNonRootNames.has(parent)),
	);
	if (flagged.length === 0) return undefined;
	return (
		`Node(s) ${flagged.join(', ')} returned only empty items ({}), so the nodes after them ` +
		'received no fields. This run does not prove that part of the workflow. Before you reply, ' +
		"check each node's parameters against its typeVersion. If they do not match, repair the " +
		'node now, also if you did not change it: fix the source file, rebuild, and verify again. ' +
		'Then tell the user what you repaired. If they match, do not change a node that you did ' +
		'not build. Tell the user that it outputs no fields.'
	);
}

const CODE_NODE_TYPES = new Set(['n8n-nodes-base.code', 'n8n-nodes-base.function']);
const JSON_PATH_REF = /\$json((?:\s*\.\s*[A-Za-z_$][\w$]*|\s*\[\s*(?:'[^']*'|"[^"]*"|\d+)\s*\])+)/g;
const PATH_SEGMENT = /\.\s*([A-Za-z_$][\w$]*)|\[\s*(?:'([^']*)'|"([^"]*)"|(\d+))\s*\]/g;
const MAX_MISSING_FIELDS = 10;

/** Expression strings (`=...`) anywhere in a node's parameters. */
function expressionStrings(value: unknown, out: string[] = []): string[] {
	if (typeof value === 'string') {
		if (value.startsWith('=')) out.push(value);
	} else if (Array.isArray(value)) {
		for (const child of value) expressionStrings(child, out);
	} else if (isRecord(value)) {
		for (const child of Object.values(value)) expressionStrings(child, out);
	}
	return out;
}

function parsePath(segments: string): string[] {
	const path: string[] = [];
	for (const match of segments.matchAll(PATH_SEGMENT)) {
		path.push(match[1] ?? match[2] ?? match[3] ?? match[4] ?? '');
	}
	return path;
}

/** Items to check a field against: every item when complete, else the first-item preview. */
function sampleItems(nodeOutput: unknown): Array<Record<string, unknown>> | undefined {
	const items = completeItems(nodeOutput);
	if (items) return items.filter(isRecord);
	const output = outputForInspection(nodeOutput);
	if (isRecord(output) && isRecord(output._firstItemPreview)) return [output._firstItemPreview];
	return undefined;
}

/**
 * Walks `path` through `item`. Returns undefined when the path resolves, or the
 * value where the walk stopped and the missing segment.
 */
function findMissingSegment(
	item: unknown,
	path: string[],
): { at: Record<string, unknown>; segment: string; resolved: string[] } | undefined {
	let current: unknown = item;
	for (let index = 0; index < path.length; index++) {
		const segment = path[index];
		if (Array.isArray(current)) {
			current = current[Number(segment)];
			continue;
		}
		if (!isRecord(current)) return undefined; // Primitive or null: not a key mismatch.
		if (!(segment in current)) return { at: current, segment, resolved: path.slice(0, index) };
		current = current[segment];
	}
	return undefined;
}

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

function describeMissingField(
	at: Record<string, unknown>,
	segment: string,
	fromFixture: boolean,
): string {
	const keys = Object.keys(at);
	const wanted = normalizeKey(segment);
	const close = keys.filter((key) => {
		const normalized = normalizeKey(key);
		return (
			normalized === wanted ||
			(normalized.length >= 3 && (normalized.includes(wanted) || wanted.includes(normalized)))
		);
	});
	const arrayHolders = keys.filter((key) => {
		const value = at[key];
		return Array.isArray(value) && value.some((entry) => isRecord(entry) && segment in entry);
	});
	const parts = [`input keys: ${keys.slice(0, 15).join(', ') || '(none)'}`];
	if (close.length > 0) parts.push(`close match: ${close.join(', ')}`);
	// A fixture's shape is a guess, so a restructuring hint would change the
	// workflow to fit the guess instead of the real node.
	if (arrayHolders.length > 0 && !fromFixture) {
		parts.push(
			`\`${segment}\` is on each entry of the array in ${arrayHolders.join(', ')}: ` +
				'split that array into items (Split Out) before this node',
		);
	}
	return parts.join('; ');
}

/**
 * A `$json.x` that names a field the input does not have resolves to empty, and
 * the run still ends green. This is how a guessed input contract (wrong field
 * names, wrong case, an unsplit array) passed verification. Compares each
 * `$json` path in a reached node's expressions with the items its main parent
 * produced, and names the fields that no input item has.
 * Code nodes are skipped: their item access is not an expression.
 * Simulated nodes are skipped: their output is a fixture, and the resolved
 * parameter check covers their inputs.
 * A miss whose input came from a simulated parent is reported apart: the
 * fixture can have the wrong shape while the expression is right.
 */
export function buildMissingFieldNote(
	resultData: Record<string, unknown> | undefined,
	workflow: Pick<WorkflowJSON, 'nodes' | 'connections'> | undefined,
	simulatedNodeNames: ReadonlySet<string>,
): string | undefined {
	if (!resultData || !workflow?.connections) return undefined;
	const byDestination = mapConnectionsByDestination(toEngineConnections(workflow.connections));
	const findings: string[] = [];
	const fixtureFindings: string[] = [];

	for (const node of workflow.nodes ?? []) {
		if (findings.length + fixtureFindings.length >= MAX_MISSING_FIELDS) break;
		const nodeName = node.name;
		if (typeof nodeName !== 'string' || !(nodeName in resultData)) continue;
		if (simulatedNodeNames.has(nodeName) || CODE_NODE_TYPES.has(node.type)) continue;
		const parents = getParentNodes(byDestination, nodeName, NodeConnectionTypes.Main, 1);
		if (parents.length !== 1) continue; // Merge-style inputs: `$json` depends on the input index.
		const inputItems = sampleItems(resultData[parents[0]]);
		if (!inputItems || inputItems.length === 0) continue;
		const fromFixture = simulatedNodeNames.has(parents[0]);

		const reported = new Set<string>();
		for (const expression of expressionStrings(node.parameters)) {
			for (const match of expression.matchAll(JSON_PATH_REF)) {
				const path = parsePath(match[1]);
				const key = path.join('.');
				if (path.length === 0 || reported.has(key)) continue;
				const misses = inputItems.map((item) => findMissingSegment(item, path));
				const firstMiss = misses[0];
				if (!firstMiss || misses.some((miss) => miss === undefined)) continue;
				reported.add(key);
				const where =
					firstMiss.resolved.length > 0 ? ` in \`${firstMiss.resolved.join('.')}\`` : '';
				(fromFixture ? fixtureFindings : findings).push(
					`${nodeName} reads \`$json.${key}\`, but no item from ${parents[0]} has ` +
						`\`${firstMiss.segment}\`${where} (${describeMissingField(firstMiss.at, firstMiss.segment, fromFixture)})`,
				);
			}
		}
	}

	const notes: string[] = [];
	if (findings.length > 0) {
		notes.push(
			`Field check: ${findings.join('; ')}. These expressions resolved to empty, so this run does ` +
				'not prove those steps. Use the field names the input really has. If the input comes from an ' +
				'outside system and its field names or tool names are not in the request, ask the user for ' +
				'them or test with a real payload. Do not guess them.',
		);
	}
	if (fixtureFindings.length > 0) {
		notes.push(
			`Fixture field check: ${fixtureFindings.join('; ')}. The input came from simulated output, ` +
				'which can have the wrong shape. These expressions resolved to empty, so this run does not ' +
				'prove those steps. If the real node outputs the field you read, keep the expression and ' +
				'verify again with a `fixtureOverrides` entry in the real output shape. Change the workflow ' +
				'only when the real node does not output that field.',
		);
	}
	return notes.length > 0 ? notes.join(' ') : undefined;
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

function messageMatchesAny(normalized: string, keywords: readonly string[]): boolean {
	return keywords.some((keyword) => normalized.includes(keyword));
}

function isChatModelScopedFailure(
	nodeErrors: ExecutionNodeError[],
	errorMessage: string | undefined,
	lastNodeExecuted: string | undefined,
	chatModelRelatedNodeNames: ReadonlySet<string> | undefined,
): boolean {
	if (!chatModelRelatedNodeNames || chatModelRelatedNodeNames.size === 0) return false;
	if (nodeErrors.some((nodeError) => chatModelRelatedNodeNames.has(nodeError.nodeName))) {
		return true;
	}
	if (lastNodeExecuted && chatModelRelatedNodeNames.has(lastNodeExecuted)) return true;
	if (!errorMessage) return false;
	for (const nodeName of chatModelRelatedNodeNames) {
		if (errorMessage.includes(nodeName)) return true;
	}
	return false;
}

/** Failing node names in match-priority order: erroring nodes first, then the last executed node. */
function failingNodeCandidates(
	nodeErrors: ExecutionNodeError[],
	lastNodeExecuted: string | undefined,
): string[] {
	const candidates = nodeErrors.map((nodeError) => nodeError.nodeName);
	if (lastNodeExecuted) candidates.push(lastNodeExecuted);
	return candidates;
}

/**
 * Suggestions scoped to the identified failing node only. When the failing
 * node cannot be identified, return none rather than another provider's model
 * IDs — the guidance then falls back to verified-resource discovery.
 */
function replacementSuggestionsForFailure(
	nodeErrors: ExecutionNodeError[],
	lastNodeExecuted: string | undefined,
	suggestionsByNodeName: ChatModelRecoveryOptions['suggestionsByNodeName'] | undefined,
): string[] {
	if (!suggestionsByNodeName) return [];
	for (const name of failingNodeCandidates(nodeErrors, lastNodeExecuted)) {
		const suggestions = suggestionsByNodeName.get(name);
		if (suggestions && suggestions.length > 0) return suggestions;
	}
	return [];
}

/** Whether n8n credits cover the identified failing node's credential type. */
function creditsCoverFailingNode(
	nodeErrors: ExecutionNodeError[],
	lastNodeExecuted: string | undefined,
	creditsCoveredNodeNames: ChatModelRecoveryOptions['creditsCoveredNodeNames'] | undefined,
): boolean {
	if (!creditsCoveredNodeNames || creditsCoveredNodeNames.size === 0) return false;
	return failingNodeCandidates(nodeErrors, lastNodeExecuted).some((name) =>
		creditsCoveredNodeNames.has(name),
	);
}

function classifyVerificationFailure(
	error: string | undefined,
	status: string | undefined,
	buildOutcome: WorkflowBuildOutcome,
	nodeErrors: ExecutionNodeError[],
	lastNodeExecuted: string | undefined,
	chatModelRelatedNodeNames: ReadonlySet<string> | undefined,
	chatModelRecovery: ChatModelRecoveryOptions | undefined,
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
				'Workflow verification reached an unresolved setup value. Stop code edits and run setup_workflow through call_tool.',
		});
	}

	if (messageMatchesAny(normalized, CREDENTIAL_FAILURE_KEYWORDS)) {
		const quotaGuidance =
			normalized.includes('quota') &&
			isChatModelScopedFailure(nodeErrors, error, lastNodeExecuted, chatModelRelatedNodeNames)
				? creditsCoverFailingNode(
						nodeErrors,
						lastNodeExecuted,
						chatModelRecovery?.creditsCoveredNodeNames,
					)
					? " If the user's own key or free tier is exhausted, switch the chat-model node to Gateway credits or another provider they can run."
					: " If the user's own key or free tier is exhausted, switch the chat-model node to another provider or key the user can run."
				: '';
		return createRemediation({
			category: 'needs_setup',
			shouldEdit: false,
			reason: hasMockedCredentialContext
				? 'mocked_credentials_or_placeholders'
				: 'credential_or_setup_failure',
			guidance: hasMockedCredentialContext
				? 'Workflow submitted successfully, but verification is blocked by mocked credentials. Stop code edits and run setup_workflow through call_tool.'
				: `Workflow submitted successfully, but verification requires credential or account setup. Stop code edits and run setup_workflow through call_tool.${quotaGuidance}`,
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

	const modelFailureKind = classifyChatModelFailure(error);
	if (
		modelFailureKind !== undefined &&
		error &&
		isChatModelScopedFailure(nodeErrors, error, lastNodeExecuted, chatModelRelatedNodeNames)
	) {
		return createRemediation({
			category: 'code_fixable',
			shouldEdit: true,
			reason: 'chat_model_failure',
			guidance: buildChatModelFailureGuidance(
				modelFailureKind,
				error,
				replacementSuggestionsForFailure(
					nodeErrors,
					lastNodeExecuted,
					chatModelRecovery?.suggestionsByNodeName,
				),
				creditsCoverFailingNode(
					nodeErrors,
					lastNodeExecuted,
					chatModelRecovery?.creditsCoveredNodeNames,
				),
			),
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

export function buildSimulationNote(
	reachedSimulatedNodes: Array<{ nodeName: string; reason: string }>,
	planMissing: boolean,
): string | undefined {
	if (reachedSimulatedNodes.length > 0) {
		return (
			`Simulated ${reachedSimulatedNodes.length} node(s) with fixture output during verification: ` +
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
	reachedHaltedGates: string[],
	triggerNodeName: string | undefined,
): string | undefined {
	if (nodesNotReached.length === 0) return undefined;
	// A trigger-scoped pass only ever reaches its own trigger's branch, so nodes
	// on the other branches are expected to be unreached. Appended to whichever
	// note applies rather than returned on its own, so it never displaces the
	// wait-gate guidance — nodes behind a gate stay uncoverable either way.
	const triggerScopeNote = triggerNodeName
		? ` This pass started from trigger "${triggerNodeName}", so it covers that trigger's branch ` +
			"only — nodes on another trigger's branch are expected to be unreached here. Run " +
			'verification again with `triggerNodeName` set to each remaining trigger and ' +
			'treat coverage as the union of those passes. Do not edit, disable, reorder, or copy the ' +
			'workflow to reach them.'
		: '';
	const guidance = success
		? ' Check branch selection, input items, Agent tool calls, and simulated parents. ' +
			'A tool can remain uncalled even when its Agent succeeds. ' +
			'For unreached main-flow nodes on this branch that are not behind a wait gate: ' +
			'if a simulated or pinned lookup returned no items, inspect its fixture and use ' +
			'representative test input. If a live lookup or query returned no matching records, ' +
			'seed matching test data only when the user has authorized that write, then re-run verification. ' +
			'If a Code node dropped a collection, inspect `$input.first().json`; use ' +
			'`$input.all().map(i => i.json)` when it needs all items. ' +
			'HTTP Request splits a top-level array into separate items. ' +
			'Do not report unreached nodes as verified.'
		: '';
	if (success && reachedHaltedGates.length > 0) {
		return (
			`Verification pauses at wait gate(s) ${reachedHaltedGates.join(', ')} — in a live run the ` +
			'workflow stops there (for a human response or a wait condition), so execution past the ' +
			`gate is not simulated. ${nodesNotReached.length} planned node(s) were not reached: ` +
			`${nodesNotReached.join(', ')}. Nodes behind the gate are expected to be unreached — do ` +
			'not edit the workflow or re-run verification to force coverage there; recommend a live ' +
			'end-to-end test instead. Other unreached nodes remain unverified.' +
			triggerScopeNote +
			guidance
		);
	}
	if (success && triggerNodeName) {
		return (
			`Partial coverage by design: ${String(nodesNotReached.length)} planned node(s) were not ` +
			`reached: ${nodesNotReached.join(', ')}.` +
			triggerScopeNote +
			guidance
		);
	}
	const ending = result.lastNodeExecuted
		? `. Execution ended at "${result.lastNodeExecuted}".`
		: '.';
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
	workflowPinnedNodeNames: string[];
	nodesNotReached: string[];
	remediation?: RemediationMetadata;
	nodesExecuted?: string[];
	simulationNote?: string;
	coverageNote?: string;
	/** Set when n8n redacted the run's data for the user, so its output was not inspected. */
	redactionNote?: string;
	errorMessage?: string;
	nodeErrors: ExecutionNodeError[];
}

/**
 * A redacted run keeps only each error's type and HTTP status code. The
 * classification still routes what those carry (credentials, rate limits),
 * but a code repair needs the message, which the user cannot see.
 */
function blockRedactedRepair(
	remediation: RemediationMetadata | undefined,
	redaction: ExecutionRunResult['redaction'],
	nodeErrors: ExecutionNodeError[],
): RemediationMetadata | undefined {
	if (!redaction || remediation?.shouldEdit !== true) return remediation;
	const failedNodes = nodeErrors.map((nodeError) => nodeError.nodeName);
	const howToSee = redaction.canReveal
		? 'They can reveal the details in the execution in the editor.'
		: redaction.reason === 'credential_inaccessible'
			? 'Only someone who can use that credential, such as its owner, can see them.'
			: 'They cannot reveal them from their account.';
	return createRemediation({
		category: 'blocked',
		shouldEdit: false,
		reason: 'execution_redacted',
		guidance:
			`n8n redacted this run's data for the user (${redaction.reason}), so the error details are hidden. ` +
			'Do not edit the workflow based on this run. ' +
			(failedNodes.length > 0
				? `Tell the user that ${failedNodes.join(', ')} failed and `
				: 'Tell the user ') +
			`that n8n hides the details. ${howToSee}`,
	});
}

function buildRedactionNote(
	redaction: ExecutionRunResult['redaction'],
	success: boolean,
): string | undefined {
	if (!redaction || !success) return undefined;
	return (
		`n8n redacted this run's output for the user (${redaction.reason}). The run finished without ` +
		'errors, but its output was not inspected. Tell the user that verification could not check what the nodes returned.'
	);
}

export function analyzeVerificationResult(args: {
	result: ExecutionRunResult;
	buildOutcome: WorkflowBuildOutcome;
	simulatedNodes: Array<{ nodeName: string; reason: string }>;
	/** Wait-gate nodes pinned with zero items — the run is expected to stop at these. */
	haltedGateNames?: string[];
	stateBefore: WorkflowLoopState | undefined;
	runId: string;
	/**
	 * Chat-model nodes plus parents they feed via `ai_languageModel`. Model
	 * failure keywords are only applied when the failure is scoped to these
	 * nodes — never globally.
	 */
	chatModelRelatedNodeNames?: ReadonlySet<string>;
	/** Precomputed replacement suggestions and n8n-credits availability for chat-model recovery guidance. */
	chatModelRecovery?: ChatModelRecoveryOptions;
	/** Trigger this pass started from, when the caller named one. */
	triggerNodeName?: string;
	/** Main-flow nodes and attached tools that belong to the selected trigger. */
	verificationScope?: ReadonlySet<string>;
}): VerificationAnalysis {
	const {
		result,
		buildOutcome,
		simulatedNodes,
		haltedGateNames,
		stateBefore,
		runId,
		chatModelRelatedNodeNames,
		chatModelRecovery,
		triggerNodeName,
		verificationScope,
	} = args;
	const nodeErrors = result.nodeErrors ?? [];
	const reachedNames = new Set(
		result.executedNodeNames ?? (result.data ? Object.keys(result.data) : []),
	);
	// Nodes fed by pinned data saved on the workflow did not really execute
	// either — count them as simulated so a pin-fed run never passes as a live
	// test (INS-1216: stale AI fixtures adopted as pins looked fully verified).
	const plannedSimulatedNames = new Set(simulatedNodes.map((n) => n.nodeName));
	const workflowPinnedNodes = (result.workflowPinnedNodeNames ?? [])
		.filter((name) => reachedNames.has(name) && !plannedSimulatedNames.has(name))
		.map((name) => ({ nodeName: name, reason: WORKFLOW_PIN_SIMULATION_REASON }));
	// An injected trigger (inputData or verification pin) never fired for real,
	// so a run that starts from it is not a live test of the trigger either.
	const reachedSimulatedNodes = [
		...simulatedNodes.filter((n) => reachedNames.has(n.nodeName)),
		...workflowPinnedNodes,
		...injectedTriggerSimulations(
			result.injectedTriggerNodeName,
			reachedNames,
			new Set([...plannedSimulatedNames, ...workflowPinnedNodes.map((n) => n.nodeName)]),
		),
	];
	const nodesNotReached = (buildOutcome.nodeSimulationPlan ?? [])
		.map((verdict) => verdict.nodeName)
		.filter((name) => !verificationScope || verificationScope.has(name))
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
				nodeErrors,
				result.lastNodeExecuted,
				chatModelRelatedNodeNames,
				chatModelRecovery,
			);
	const allowedRemediation = blockRedactedRepair(failureRemediation, result.redaction, nodeErrors);
	const budgetRemediation =
		allowedRemediation?.shouldEdit === true
			? terminalRemediationFromState(stateBefore, runId)
			: undefined;
	const remediation = budgetRemediation ?? allowedRemediation;

	return {
		success,
		reachedNames,
		reachedSimulatedNodes,
		workflowPinnedNodeNames: workflowPinnedNodes.map((n) => n.nodeName),
		nodesNotReached,
		remediation,
		nodesExecuted: namesOrDataKeys(reachedNames, result.data),
		simulationNote: buildSimulationNote(reachedSimulatedNodes, false),
		coverageNote: buildCoverageNote(
			nodesNotReached,
			result,
			success,
			(haltedGateNames ?? []).filter((name) => reachedNames.has(name)),
			triggerNodeName,
		),
		redactionNote: buildRedactionNote(result.redaction, success),
		errorMessage,
		nodeErrors,
	};
}
