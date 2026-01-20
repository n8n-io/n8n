/**
 * Maps n8n ExecutionStatus to A2A Task State
 */

import type { ExecutionStatus } from 'n8n-workflow';

import type { A2ATaskState } from './a2a.types';

/**
 * Mapping from n8n ExecutionStatus to A2A TaskState
 *
 * n8n ExecutionStatus values:
 * - new: execution just created
 * - running: execution in progress
 * - waiting: execution waiting (e.g., for webhook response)
 * - success: execution completed successfully
 * - error: execution failed with error
 * - canceled: execution was canceled
 * - crashed: execution crashed unexpectedly
 * - unknown: unknown state
 *
 * A2A TaskState values:
 * - submitted: Task received, not yet started
 * - working: Task in progress
 * - input-required: Agent needs more input from client
 * - auth-required: Agent needs authentication
 * - completed: Task finished successfully
 * - failed: Task failed
 * - rejected: Task was rejected
 * - canceled: Task was canceled
 * - unknown: Unknown state
 */
const executionStatusToA2AMapping: Record<ExecutionStatus, A2ATaskState> = {
	new: 'submitted',
	running: 'working',
	waiting: 'input-required',
	success: 'completed',
	error: 'failed',
	canceled: 'canceled',
	crashed: 'failed',
	unknown: 'unknown',
};

/**
 * Maps n8n ExecutionStatus to A2A TaskState
 */
export function mapExecutionStatusToA2A(status: ExecutionStatus): A2ATaskState {
	return executionStatusToA2AMapping[status] ?? 'unknown';
}

/**
 * Checks if a task state represents a terminal state (completed, failed, canceled, rejected)
 */
export function isTerminalState(state: A2ATaskState): boolean {
	return ['completed', 'failed', 'canceled', 'rejected'].includes(state);
}

/**
 * Checks if an execution status represents a terminal state
 */
export function isExecutionTerminal(status: ExecutionStatus): boolean {
	return ['success', 'error', 'canceled', 'crashed'].includes(status);
}
