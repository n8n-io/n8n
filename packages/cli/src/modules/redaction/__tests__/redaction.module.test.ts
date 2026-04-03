import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';

import { ExecutionRedactionService } from '../executions/execution-redaction.service';
import { RedactionModule } from '../redaction.module';

describe('RedactionModule', () => {
	let module: RedactionModule;
	let executionRedactionService: jest.Mocked<ExecutionRedactionService>;
	let executionRedactionServiceProxy: jest.Mocked<ExecutionRedactionServiceProxy>;

	beforeEach(() => {
		jest.clearAllMocks();
		Container.reset();

		const logger = mockInstance(Logger);
		executionRedactionService = mock<ExecutionRedactionService>();
		executionRedactionService.init.mockResolvedValue(undefined);
		executionRedactionServiceProxy = mock<ExecutionRedactionServiceProxy>();
		Container.set(ExecutionRedactionService, executionRedactionService);
		Container.set(ExecutionRedactionServiceProxy, executionRedactionServiceProxy);
		Container.set(Logger, logger);

		module = new RedactionModule();
	});

	describe('init', () => {
		it('should initialize ExecutionRedactionService and wire up proxy', async () => {
			await module.init();

			expect(executionRedactionService.init).toHaveBeenCalledTimes(1);
			expect(executionRedactionServiceProxy.setExecutionRedaction).toHaveBeenCalledWith(
				executionRedactionService,
			);
		});
	});
});
