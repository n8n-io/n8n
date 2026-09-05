import type {
	ExecutionStatus,
	IRun,
	WorkflowExecuteMode,
	WorkflowExecutionSource,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { isBillableExecution } from '../is-billable-execution';

function run(mode: WorkflowExecuteMode, status: ExecutionStatus): IRun {
	return mock<IRun>({ mode, status });
}

describe('isBillableExecution', () => {
	test.each<WorkflowExecuteMode>(['cli', 'retry', 'trigger', 'webhook', 'evaluation'])(
		'returns true for production root mode %s on success',
		(mode) => {
			expect(isBillableExecution(run(mode, 'success'))).toBe(true);
		},
	);

	test.each<ExecutionStatus>(['success', 'error', 'crashed'])(
		'returns true for webhook runs with status %s',
		(status) => {
			expect(isBillableExecution(run('webhook', status))).toBe(true);
		},
	);

	test.each<WorkflowExecuteMode>(['integrated', 'error', 'internal', 'manual', 'chat', 'agent'])(
		'returns false for non-billable mode %s',
		(mode) => {
			expect(isBillableExecution(run(mode, 'success'))).toBe(false);
		},
	);

	test.each<ExecutionStatus>(['canceled', 'new', 'running', 'unknown', 'waiting'])(
		'returns false for non-terminal status %s',
		(status) => {
			expect(isBillableExecution(run('webhook', status))).toBe(false);
		},
	);

	test('returns false for instance_ai verification runs even when the mode is production', () => {
		const source: WorkflowExecutionSource = 'instance_ai';
		expect(isBillableExecution(run('webhook', 'success'), source)).toBe(false);
	});
});
