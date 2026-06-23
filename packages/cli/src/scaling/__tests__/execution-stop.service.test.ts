import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import { ManualExecutionCancelledError } from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';
import { ExecutionStopService } from '@/scaling/execution-stop.service';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

describe('ExecutionStopService', () => {
	const publisher = mock<Publisher>();
	const activeExecutions = mock<ActiveExecutions>();

	const createService = (instanceType: InstanceSettings['instanceType']) => {
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		return new ExecutionStopService(
			logger,
			mock<InstanceSettings>({ instanceType }),
			publisher,
			activeExecutions,
		);
	};

	afterEach(() => jest.clearAllMocks());

	describe('requestStop', () => {
		it('should broadcast a stop-execution command from a main process', async () => {
			const service = createService('main');

			await service.requestStop('exec-1');

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'stop-execution',
				payload: { executionId: 'exec-1' },
			});
		});

		it('should not broadcast from a worker process', async () => {
			const service = createService('worker');

			await service.requestStop('exec-1');

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});
	});

	describe('handleStopExecution', () => {
		it('should cancel the execution when this worker is running it', () => {
			const service = createService('worker');
			activeExecutions.has.mockReturnValue(true);

			service.handleStopExecution({ executionId: 'exec-1' });

			expect(activeExecutions.stopExecution).toHaveBeenCalledWith(
				'exec-1',
				expect.any(ManualExecutionCancelledError),
			);
		});

		it('should do nothing when this worker is not running the execution', () => {
			const service = createService('worker');
			activeExecutions.has.mockReturnValue(false);

			service.handleStopExecution({ executionId: 'exec-1' });

			expect(activeExecutions.stopExecution).not.toHaveBeenCalled();
		});
	});
});
