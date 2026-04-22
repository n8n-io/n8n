import type { Logger } from '@n8n/backend-common';
import type { ExecutionRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { TraceContextService } from '../tracing-context';

describe('TraceContextService', () => {
	describe('persist', () => {
		const executionRepository = mock<ExecutionRepository>();
		const logger = mock<Logger>();
		let service: TraceContextService;

		beforeEach(() => {
			jest.clearAllMocks();
			service = new TraceContextService(executionRepository, logger);
		});

		it('should persist context to the execution entity', async () => {
			const tracingContext = {
				traceparent: '00-abc123def456abc123def456abc123de-1234567890abcdef-01',
				tracestate: 'vendor1=value1',
			};

			await service.persist('exec-1', tracingContext);

			expect(executionRepository.update).toHaveBeenCalledWith('exec-1', {
				tracingContext,
			});
		});

		it('should log error when DB persistence fails', async () => {
			executionRepository.update.mockRejectedValueOnce(new Error('DB connection failed'));

			await service.persist('exec-3', {
				traceparent: '00-abc123def456abc123def456abc123de-1234567890abcdef-01',
			});

			expect(logger.error).toHaveBeenCalledWith(
				'Failed to persist tracing context',
				expect.objectContaining({ executionId: 'exec-3' }),
			);
		});

		it('should never throw', async () => {
			executionRepository.update.mockRejectedValueOnce(new Error('DB error'));

			await expect(
				service.persist('exec-4', {
					traceparent: '00-abc123def456abc123def456abc123de-1234567890abcdef-01',
				}),
			).resolves.toBeUndefined();
		});
	});

	describe('get', () => {
		const executionRepository = mock<ExecutionRepository>();
		const logger = mock<Logger>();
		let service: TraceContextService;

		beforeEach(() => {
			jest.clearAllMocks();
			service = new TraceContextService(executionRepository, logger);
		});

		it('should return tracing context from DB', async () => {
			const tracingContext = {
				traceparent: '00-abc123def456abc123def456abc123de-1234567890abcdef-01',
			};
			executionRepository.findOne.mockResolvedValueOnce({ tracingContext } as never);

			const result = await service.get('exec-1');

			expect(result).toEqual(tracingContext);
		});

		it('should return undefined when no execution found', async () => {
			executionRepository.findOne.mockResolvedValueOnce(null);

			const result = await service.get('exec-2');

			expect(result).toBeUndefined();
		});

		it('should return undefined on DB error', async () => {
			executionRepository.findOne.mockRejectedValueOnce(new Error('DB error'));

			const result = await service.get('exec-3');

			expect(result).toBeUndefined();
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to load tracing context',
				expect.objectContaining({ executionId: 'exec-3' }),
			);
		});
	});
});
