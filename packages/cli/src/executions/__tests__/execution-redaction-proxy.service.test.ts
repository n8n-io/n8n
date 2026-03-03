import type { IExecutionDb, User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type {
	ExecutionRedaction,
	ExecutionRedactionOptions,
} from '@/executions/execution-redaction';
import { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';

describe('ExecutionRedactionServiceProxy', () => {
	let proxy: ExecutionRedactionServiceProxy;

	const mockUser = { id: 'user-123' } as User;

	const createMockExecution = (): IExecutionDb => mock<IExecutionDb>({ id: 'execution-123' });

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
});
