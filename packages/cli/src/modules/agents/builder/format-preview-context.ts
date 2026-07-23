import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { TimelineEvent } from '../execution-recorder';

/** Delimits the LLM-facing preview transcript block. */
export const PREVIEW_CONTEXT_OPEN_TAG = '<preview_session_context>';
export const PREVIEW_CONTEXT_CLOSE_TAG = '</preview_session_context>';

const MAX_TEXT_CHARS = 4_000;
const MAX_TOOL_VALUE_CHARS = 2_000;
const MAX_BLOCK_CHARS = 100_000;
const TRUNCATION_FOOTER = '… [truncated]';

function truncate(value: string, max: number): string {
	if (value.length <= max) return value;
	return value.slice(0, max) + TRUNCATION_FOOTER;
}

function truncateBlockToFit(value: string, max: number): string | null {
	if (max <= TRUNCATION_FOOTER.length) return null;
	if (value.length <= max) return value;
	return value.slice(0, max - TRUNCATION_FOOTER.length) + TRUNCATION_FOOTER;
}

function stringifyToolValue(value: unknown): string {
	if (value === undefined) return '(none)';
	let serialized: string;
	try {
		serialized = JSON.stringify(value) ?? 'undefined';
	} catch {
		serialized = String(value);
	}
	return truncate(serialized, MAX_TOOL_VALUE_CHARS);
}

function formatTimelineEvent(event: TimelineEvent): string {
	if (event.type === 'text') {
		return `Assistant: ${truncate(event.content, MAX_TEXT_CHARS)}`;
	}
	if (event.type === 'suspension') {
		return `[suspended waiting on ${event.toolName}]`;
	}
	const durationMs = event.endTime > 0 ? event.endTime - event.startTime : null;
	const headerParts = [
		`Tool call: ${event.name}`,
		`kind=${event.kind}`,
		event.success ? 'succeeded' : 'failed',
	];
	if (durationMs !== null) headerParts.push(`${durationMs}ms`);
	if (event.workflowName) headerParts.push(`workflow=${event.workflowName}`);
	if (event.nodeDisplayName) headerParts.push(`node=${event.nodeDisplayName}`);
	return [
		headerParts.join(' | '),
		`  Input: ${stringifyToolValue(event.input)}`,
		`  Output: ${stringifyToolValue(event.output)}`,
	].join('\n');
}

function formatExecution(execution: AgentExecution): string {
	const headerParts = [`status=${execution.status}`];
	if (execution.model) headerParts.push(`model=${execution.model}`);
	headerParts.push(`duration=${execution.duration}ms`);
	if (execution.totalTokens !== null) headerParts.push(`tokens=${execution.totalTokens}`);
	if (execution.error) headerParts.push(`error=${execution.error}`);

	const lines = [`## Turn (${headerParts.join(', ')})`];
	if (execution.userMessage !== null) {
		lines.push(`User: ${truncate(execution.userMessage, MAX_TEXT_CHARS)}`);
	}
	for (const event of execution.timeline ?? []) {
		lines.push(formatTimelineEvent(event));
	}
	return lines.join('\n');
}

function selectTurnExecutions(
	executions: AgentExecution[],
	executionId: string,
): AgentExecution[] | null {
	let anchorIndex = executions.findIndex((execution) => execution.id === executionId);
	if (anchorIndex === -1) return null;

	while (anchorIndex > 0 && executions[anchorIndex].userMessage === null) {
		anchorIndex--;
	}

	const selected = [executions[anchorIndex]];
	for (let i = anchorIndex + 1; i < executions.length; i++) {
		if (executions[i].userMessage !== null) break;
		selected.push(executions[i]);
	}
	return selected;
}

/**
 * Format a preview chat session (or single turn) into a markdown
 * block for injection into a builder chat message. Returns `null` when
 * `executionId` doesn't belong to the thread. Values in the timeline are
 * already removed of secrets at record time.
 */
export function formatPreviewSessionContext(
	thread: AgentExecutionThread,
	executions: AgentExecution[],
	executionId?: string,
): string | null {
	const scoped =
		executionId === undefined ? executions : selectTurnExecutions(executions, executionId);
	if (scoped === null) return null;

	const scopeLabel = executionId === undefined ? 'whole session' : 'single turn';
	const header =
		`Preview session transcript — title: ${thread.title ?? '(untitled)'}, ` +
		`session #${thread.sessionNumber}, scope: ${scopeLabel}, turns: ${scoped.length}`;

	const prefix = [
		PREVIEW_CONTEXT_OPEN_TAG,
		header,
		'',
		'The user shared this transcript of a real conversation with the target agent',
		'so you can assess its behavior and improve its configuration.',
	].join('\n');
	const closing = `\n${PREVIEW_CONTEXT_CLOSE_TAG}`;
	const includedNewestFirst: string[] = [];
	let includedLength = 0;
	let boundaryTurn: string | null = null;
	let omittedEarlierTurns = 0;

	for (let i = scoped.length - 1; i >= 0; i--) {
		const formatted = `\n${formatExecution(scoped[i])}`;
		const projectedLength = prefix.length + includedLength + formatted.length + closing.length;
		if (projectedLength > MAX_BLOCK_CHARS) {
			boundaryTurn = formatted;
			omittedEarlierTurns = i;
			break;
		}
		includedNewestFirst.push(formatted);
		includedLength += formatted.length;
	}

	const includedTurns = includedNewestFirst.reverse();
	if (boundaryTurn !== null) {
		for (;;) {
			const footerCandidate =
				omittedEarlierTurns > 0
					? `\n[transcript truncated: ${omittedEarlierTurns} earlier turns omitted]`
					: '';
			const remainingBudget =
				MAX_BLOCK_CHARS - prefix.length - includedLength - footerCandidate.length - closing.length;
			const truncatedBoundary = truncateBlockToFit(boundaryTurn, remainingBudget);
			if (truncatedBoundary !== null) {
				includedTurns.unshift(truncatedBoundary);
				includedLength += truncatedBoundary.length;
				break;
			}

			omittedEarlierTurns++;
			if (includedTurns.length === 0) break;
			const removedTurn = includedTurns.shift();
			if (!removedTurn) break;
			includedLength -= removedTurn.length;
		}
	}

	let footer = '';
	while (omittedEarlierTurns > 0) {
		const footerCandidate = `\n[transcript truncated: ${omittedEarlierTurns} earlier turns omitted]`;
		const projectedLength =
			prefix.length + includedLength + footerCandidate.length + closing.length;
		if (projectedLength <= MAX_BLOCK_CHARS) {
			footer = footerCandidate;
			break;
		}

		const removedTurn = includedTurns.shift();
		if (!removedTurn) break;
		includedLength -= removedTurn.length;
		omittedEarlierTurns++;
	}

	return prefix + includedTurns.join('') + footer + closing;
}
