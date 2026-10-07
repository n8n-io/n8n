import type { InstanceAiMessage, InstanceAiToolCallState } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import { collectToolCalls } from './agentTreeToolCalls';

/** A workflow the thread produced, oldest first in the input list. */
export interface AutomationOfferWorkflow {
	id: string;
	name: string;
	archived?: boolean;
}

export interface AutomationOfferCandidate {
	workflowId: string;
	name: string;
}

export interface AutomationOfferInput {
	messages: readonly InstanceAiMessage[];
	producedWorkflows: readonly AutomationOfferWorkflow[];
	dismissedKeys: Iterable<string>;
	/**
	 * Runs that failed outside the tool calls, for example in the preview
	 * canvas. Maps the workflow id to its number of successful run calls at the
	 * time of the failure. Such a workflow waits for a newer successful run.
	 */
	previewFailures?: ReadonlyMap<string, number>;
}

/**
 * Dismissal key for the "Make it automatic" offer, stored with the other keys
 * in the thread metadata `dismissedContextKeys`. One key for each workflow, so
 * a dismissal does not hide the offer for a different workflow.
 */
export function automationOfferKey(workflowId: string): string {
	return `automation-offer:${workflowId}`;
}

/** A yes or no state of a workflow, from the most recent call that set it. */
interface LatestState {
	value: boolean;
	completedAt?: string;
}

type LatestStates = Map<string, LatestState>;

/**
 * Keeps the state of the more recent call. A call later in the walk is more
 * recent, but when both calls have a completion time, the later time wins:
 * a parent agent can call a tool after its sub-agent, which the walk visits
 * after the parent.
 */
function recordLatest(
	states: LatestStates,
	workflowId: string,
	value: boolean,
	completedAt: string | undefined,
): void {
	const current = states.get(workflowId)?.completedAt;
	if (current && completedAt && completedAt < current) return;
	states.set(workflowId, { value, completedAt });
}

interface RunOutcome {
	workflowId: string;
	succeeded: boolean;
}

/** The outcome of a finished call that ran a workflow, or undefined for any other call. */
function readRunOutcome(call: InstanceAiToolCallState): RunOutcome | undefined {
	const { workflowId } = call.args;
	if (call.isLoading || typeof workflowId !== 'string') return undefined;
	const result = isRecord(call.result) ? call.result : {};
	if (call.toolName === 'executions' && call.args.action === 'run') {
		return { workflowId, succeeded: result.status === 'success' };
	}
	if (call.toolName === 'verify-built-workflow') {
		return { workflowId, succeeded: result.success === true };
	}
	return undefined;
}

type LifecycleFact = 'published' | 'archived';

/** The `workflows` tool actions that publish, unpublish, archive or restore a workflow. */
const LIFECYCLE_ACTIONS = new Map<unknown, { fact: LifecycleFact; value: boolean }>([
	['publish', { fact: 'published', value: true }],
	['unpublish', { fact: 'published', value: false }],
	['delete', { fact: 'archived', value: true }],
	['unarchive', { fact: 'archived', value: false }],
]);

interface LifecycleChange {
	fact: LifecycleFact;
	value: boolean;
	workflowIds: string[];
}

/** The workflows a lifecycle call changed. A publish also publishes the sub-workflows it calls. */
function readChangedWorkflowIds(
	args: Record<string, unknown>,
	result: Record<string, unknown>,
): string[] {
	const { publishedWorkflowIds } = result;
	const ids = Array.isArray(publishedWorkflowIds)
		? publishedWorkflowIds.filter((id): id is string => typeof id === 'string')
		: [];
	if (typeof args.workflowId === 'string') ids.push(args.workflowId);
	return ids;
}

/**
 * The change of a successful lifecycle call of the `workflows` tool, or
 * undefined for any other call. The workflows list cache does not see these
 * changes, so the thread is the source of truth for them.
 */
function readLifecycleChange(call: InstanceAiToolCallState): LifecycleChange | undefined {
	const action = LIFECYCLE_ACTIONS.get(call.args.action);
	if (call.toolName !== 'workflows' || !action || call.isLoading) return undefined;
	if (!isRecord(call.result) || call.result.success !== true) return undefined;
	return { ...action, workflowIds: readChangedWorkflowIds(call.args, call.result) };
}

/** The workflow of a `propose_automation` call in any state, or undefined for any other call. */
function readProposedWorkflowId(call: InstanceAiToolCallState): string | undefined {
	const { workflowId } = call.args;
	if (call.toolName !== 'propose_automation' || typeof workflowId !== 'string') return undefined;
	return workflowId;
}

interface ThreadFacts {
	/** Whether the latest finished run of each workflow succeeded. */
	runSucceeded: LatestStates;
	/** The number of successful runs of each workflow. */
	successfulRuns: Map<string, number>;
	/** Whether the latest successful publish or unpublish call published each workflow. */
	published: LatestStates;
	/** Whether the latest successful delete or unarchive call archived each workflow. */
	archived: LatestStates;
	/** Workflows that already have a `propose_automation` call, in any state. */
	proposed: Set<string>;
}

function recordRun(facts: ThreadFacts, call: InstanceAiToolCallState): void {
	const outcome = readRunOutcome(call);
	if (!outcome) return;
	recordLatest(facts.runSucceeded, outcome.workflowId, outcome.succeeded, call.completedAt);
	if (!outcome.succeeded) return;
	const count = facts.successfulRuns.get(outcome.workflowId) ?? 0;
	facts.successfulRuns.set(outcome.workflowId, count + 1);
}

function recordLifecycle(facts: ThreadFacts, call: InstanceAiToolCallState): void {
	const change = readLifecycleChange(call);
	if (!change) return;
	for (const workflowId of change.workflowIds) {
		recordLatest(facts[change.fact], workflowId, change.value, call.completedAt);
	}
}

function collectThreadFacts(messages: readonly InstanceAiMessage[]): ThreadFacts {
	const facts: ThreadFacts = {
		runSucceeded: new Map(),
		successfulRuns: new Map(),
		published: new Map(),
		archived: new Map(),
		proposed: new Set(),
	};
	for (const call of collectToolCalls(messages)) {
		recordRun(facts, call);
		recordLifecycle(facts, call);
		const proposedWorkflowId = readProposedWorkflowId(call);
		if (proposedWorkflowId !== undefined) facts.proposed.add(proposedWorkflowId);
	}
	return facts;
}

/** The number of finished calls in the messages that ran the workflow successfully. */
export function countSuccessfulRuns(
	messages: readonly InstanceAiMessage[],
	workflowId: string,
): number {
	return collectThreadFacts(messages).successfulRuns.get(workflowId) ?? 0;
}

/** True when the thread did not archive, publish or propose the workflow. */
function isStillOpen(workflow: AutomationOfferWorkflow, facts: ThreadFacts): boolean {
	if (workflow.archived === true || facts.archived.get(workflow.id)?.value === true) return false;
	if (facts.published.get(workflow.id)?.value === true) return false;
	return !facts.proposed.has(workflow.id);
}

/** True when the latest run succeeded and no preview run failed after it. */
function lastRunWorked(
	workflowId: string,
	facts: ThreadFacts,
	previewFailures: ReadonlyMap<string, number> | undefined,
): boolean {
	if (facts.runSucceeded.get(workflowId)?.value !== true) return false;
	const successfulRunsAtFailure = previewFailures?.get(workflowId);
	if (successfulRunsAtFailure === undefined) return true;
	return (facts.successfulRuns.get(workflowId) ?? 0) > successfulRunsAtFailure;
}

/**
 * The workflow to offer to make automatic, or undefined when no workflow
 * qualifies. A workflow qualifies when it is not archived, its latest run
 * succeeded, the thread did not publish it or propose an automation for it,
 * and the user did not dismiss the offer for it. The latest run must succeed,
 * so the offer does not say that a workflow worked after its last run failed.
 * When more than one workflow qualifies, the most recently produced one wins.
 *
 * The caller checks the stored publish state and that the chat is idle.
 */
export function findAutomationOfferCandidate(
	input: AutomationOfferInput,
): AutomationOfferCandidate | undefined {
	const facts = collectThreadFacts(input.messages);
	const dismissed = new Set(input.dismissedKeys);
	for (let index = input.producedWorkflows.length - 1; index >= 0; index--) {
		const workflow = input.producedWorkflows[index];
		if (!isStillOpen(workflow, facts)) continue;
		if (!lastRunWorked(workflow.id, facts, input.previewFailures)) continue;
		if (dismissed.has(automationOfferKey(workflow.id))) continue;
		return { workflowId: workflow.id, name: workflow.name };
	}
	return undefined;
}
