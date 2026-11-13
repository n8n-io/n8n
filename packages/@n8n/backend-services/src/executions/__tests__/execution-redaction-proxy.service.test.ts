import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type {
	ExecutionRedaction,
	ExecutionRedactionOptions,
	RedactableExecution,
} from '../execution-redaction';
import { ExecutionRedactionServiceProxy } from '../execution-redaction-proxy.service';

describe('ExecutionRedactionServiceProxy', () => {
	let proxy: ExecutionRedactionServiceProxy;

	const mockUser = { id: 'user-123' } as User;

	const createMockExecution = (): RedactableExecution => mock<RedactableExecution>();

	const createOptions = (
		overrides: Partial<ExecutionRedactionOptions> = {},
	): ExecutionRedactionOptions => ({
		user: mockUser,
		...overrides,
	});

	beforeEach(() => {
		proxy = new ExecutionRedactionServiceProxy();
	});

	describe('processExecution', () => {
		it('should return execution unmodified when no real service is set', async () => {
			const execution = createMockExecution();
			const options = createOptions();

			const result = await proxy.processExecution(execution, options);

			expect(result).toBe(execution);
		});

		it('accepts an execution that has no run data yet', async () => {
			const execution = {
				mode: 'manual',
				workflowId: 'workflow-1',
				data: undefined,
				workflowData: { nodes: [] },
			} as unknown as RedactableExecution;

			const result = await proxy.processExecution(execution, createOptions());

			expect(result).toBe(execution);
		});

		it('should delegate to real service when set via setExecutionRedaction', async () => {
			const execution = createMockExecution();
			const processedExecution = createMockExecution();
			const options = createOptions({ redactExecutionData: true });

			const realService = mock<ExecutionRedaction>();
			realService.processExecution.mockResolvedValue(processedExecution);

			proxy.setExecutionRedaction(realService);

			const result = await proxy.processExecution(execution, options);

			expect(result).toBe(processedExecution);
			expect(realService.processExecution).toHaveBeenCalledWith(execution, options);
		});

		it('should pass through options to real service', async () => {
			const execution = createMockExecution();
			const options = createOptions({ redactExecutionData: false });

			const realService = mock<ExecutionRedaction>();
			realService.processExecution.mockResolvedValue(execution);

			proxy.setExecutionRedaction(realService);

			await proxy.processExecution(execution, options);

			expect(realService.processExecution).toHaveBeenCalledWith(execution, options);
		});
	});

	describe.each([
		{ setup: 'without a redaction service', install: () => {} },
		{
			setup: 'with a redaction service',
			install: (target: ExecutionRedactionServiceProxy) => {
				const realService = mock<ExecutionRedaction>();
				realService.processExecution.mockImplementation(async (execution) => execution);
				target.setExecutionRedaction(realService);
			},
		},
	])('$setup', ({ install }) => {
		const RUN_DATA_WITHOUT_PUSH_SESSION = { resultData: { runData: {} } };

		const createExecutionWithPushSession = (): RedactableExecution => ({
			mode: 'manual',
			workflowId: 'workflow-1',
			data: {
				pushRef: 'push-ref-a',
				pushRefUserId: 'user-a',
				resultData: { runData: {} },
			},
			workflowData: { nodes: [] },
		});

		beforeEach(() => install(proxy));

		it('processExecution hides the push session fields', async () => {
			const execution = createExecutionWithPushSession();

			await proxy.processExecution(execution, createOptions());

			expect(execution.data).toStrictEqual(RUN_DATA_WITHOUT_PUSH_SESSION);
		});

		it('processExecutions hides the push session fields on every execution', async () => {
			const executions = [createExecutionWithPushSession(), createExecutionWithPushSession()];

			await proxy.processExecutions(executions, createOptions());

			for (const execution of executions) {
				expect(execution.data).toStrictEqual(RUN_DATA_WITHOUT_PUSH_SESSION);
			}
		});
	});
});
