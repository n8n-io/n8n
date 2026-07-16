import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import type { McpService } from '@/modules/mcp/mcp.service';

import { McpExecutionTimeoutError } from '../mcp.errors';
import {
	createExecutionProgressReporter,
	PROGRESS_HEARTBEAT_INTERVAL_MS,
	waitForExecutionResult,
	WORKFLOW_EXECUTION_TIMEOUT_MS,
} from '../tools/execution-utils';

describe('createExecutionProgressReporter', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const createExtra = (progressToken?: string) =>
		({
			_meta: progressToken === undefined ? undefined : { progressToken },
			sendNotification: vi.fn().mockResolvedValue(undefined),
		}) as unknown as Parameters<typeof createExecutionProgressReporter>[0] & {
			sendNotification: ReturnType<typeof vi.fn>;
		};

	test('sends a start message and periodic heartbeats until stopped', () => {
		const extra = createExtra('token-1');
		const reporter = createExecutionProgressReporter(extra, 'Execution 1');

		reporter.start();
		expect(extra.sendNotification).toHaveBeenCalledTimes(1);
		expect(extra.sendNotification).toHaveBeenCalledWith({
			method: 'notifications/progress',
			params: {
				progressToken: 'token-1',
				progress: 0,
				message: 'Execution 1 started',
			},
		});

		vi.advanceTimersByTime(PROGRESS_HEARTBEAT_INTERVAL_MS * 2);
		expect(extra.sendNotification).toHaveBeenCalledTimes(3);
		expect(extra.sendNotification).toHaveBeenLastCalledWith(
			expect.objectContaining({
				params: expect.objectContaining({
					progress: (PROGRESS_HEARTBEAT_INTERVAL_MS / 1000) * 2,
					message: expect.stringContaining('elapsed'),
				}),
			}),
		);

		reporter.stop();
		vi.advanceTimersByTime(PROGRESS_HEARTBEAT_INTERVAL_MS * 2);
		expect(extra.sendNotification).toHaveBeenCalledTimes(3);
	});

	test('is a no-op when the client sent no progress token', () => {
		const extra = createExtra();
		const reporter = createExecutionProgressReporter(extra, 'Execution 1');

		reporter.start();
		reporter.update('some update');
		vi.advanceTimersByTime(PROGRESS_HEARTBEAT_INTERVAL_MS * 2);
		reporter.stop();

		expect(extra.sendNotification).not.toHaveBeenCalled();
	});
});

describe('waitForExecutionResult timeout behavior', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const createMocks = () => {
		const activeExecutions = mock<ActiveExecutions>();
		activeExecutions.getPostExecutePromise.mockReturnValue(new Promise(() => {}));
		const mcpService = mock<McpService>();
		Object.defineProperty(mcpService, 'isQueueMode', { get: () => false });
		return { activeExecutions, mcpService };
	};

	test('cancels the execution on timeout by default', async () => {
		const { activeExecutions, mcpService } = createMocks();

		const waitPromise = waitForExecutionResult('exec-1', activeExecutions, mcpService);
		const assertion = expect(waitPromise).rejects.toThrow(McpExecutionTimeoutError);
		await vi.advanceTimersByTimeAsync(WORKFLOW_EXECUTION_TIMEOUT_MS);
		await assertion;

		expect(activeExecutions.stopExecution).toHaveBeenCalledWith('exec-1', expect.any(Error));
	});

	test('leaves the execution running on timeout when cancelOnTimeout is false', async () => {
		const { activeExecutions, mcpService } = createMocks();

		const waitPromise = waitForExecutionResult('exec-1', activeExecutions, mcpService, {
			cancelOnTimeout: false,
		});
		const assertion = expect(waitPromise).rejects.toThrow(McpExecutionTimeoutError);
		await vi.advanceTimersByTimeAsync(WORKFLOW_EXECUTION_TIMEOUT_MS);
		await assertion;

		expect(activeExecutions.stopExecution).not.toHaveBeenCalled();
	});
});
