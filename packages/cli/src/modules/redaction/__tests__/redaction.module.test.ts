import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { ExecutionRedactionService } from '../executions/execution-redaction.service';
import { RedactionModule } from '../redaction.module';

describe('RedactionModule', () => {
	let module: RedactionModule;
	let executionRedactionService: jest.Mocked<ExecutionRedactionService>;
	const originalEnv = process.env.N8N_ENABLE_EXECUTION_REDACTION;

	beforeEach(() => {
		jest.clearAllMocks();
		Container.reset();

		const logger = mockInstance(Logger);
		executionRedactionService = mock<ExecutionRedactionService>();
		executionRedactionService.init.mockResolvedValue(undefined);
		Container.set(ExecutionRedactionService, executionRedactionService);
		Container.set(Logger, logger);

		module = new RedactionModule();
	});

	afterEach(() => {
		// Restore original environment variable
		if (originalEnv !== undefined) {
			process.env.N8N_ENABLE_EXECUTION_REDACTION = originalEnv;
		} else {
			delete process.env.N8N_ENABLE_EXECUTION_REDACTION;
		}
	});

	describe('init', () => {
		it.each([
			['not set', undefined],
			['"false"', 'false'],
			['empty string', ''],
			['"1"', '1'],
		])('should not initialize when N8N_ENABLE_EXECUTION_REDACTION is %s', async (_, value) => {
			if (value === undefined) {
				delete process.env.N8N_ENABLE_EXECUTION_REDACTION;
			} else {
				process.env.N8N_ENABLE_EXECUTION_REDACTION = value;
			}

			await module.init();

			expect(executionRedactionService.init).not.toHaveBeenCalled();
		});

		it('should initialize and call ExecutionRedactionService.init() when N8N_ENABLE_EXECUTION_REDACTION is "true"', async () => {
			process.env.N8N_ENABLE_EXECUTION_REDACTION = 'true';

			await module.init();

			expect(executionRedactionService.init).toHaveBeenCalledTimes(1);
		});
	});
});
