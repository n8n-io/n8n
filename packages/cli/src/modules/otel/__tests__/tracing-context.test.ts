import type { Logger } from '@n8n/backend-common';
import type { ExecutionRepository } from '@n8n/db';
import { propagation } from '@opentelemetry/api';
import { mock } from 'vitest-mock-extended';

import { DEFAULT_OUTBOUND_PROPAGATOR } from '@/observability/outbound-propagator';
import { TRACING_OFF } from '@/observability/swappable-pipeline';

import { extractTracingContext, TraceContextService } from '../tracing-context';

describe('extractTracingContext', () => {
	const traceparent = '00-abcdef1234567890abcdef1234567890-1234567890abcdef-01';

	beforeEach(() => propagation.setGlobalPropagator(DEFAULT_OUTBOUND_PROPAGATOR));

	afterEach(() => propagation.disable());

	it('should read the headers through the global propagator', () => {
		expect(extractTracingContext({ traceparent, baggage: 'tenant=acme' })).toEqual({
			traceparent,
			baggage: 'tenant=acme',
		});
	});

	it('should drop a malformed traceparent', () => {
		expect(extractTracingContext({ traceparent: 'not-a-traceparent' })).toBeUndefined();
	});

	it('should read nothing when outbound headers are off', () => {
		propagation.disable();
		propagation.setGlobalPropagator(TRACING_OFF.propagator);

		expect(extractTracingContext({ traceparent, baggage: 'tenant=acme' })).toBeUndefined();
	});
});

describe('TraceContextService', () => {
	describe('persist', () => {
		const executionRepository = mock<ExecutionRepository>();
		const logger = mock<Logger>();
		let service: TraceContextService;

		beforeEach(() => {
			vi.clearAllMocks();
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
			vi.clearAllMocks();
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

		it('should read the row of a soft-deleted execution', async () => {
			executionRepository.findOne.mockResolvedValueOnce(null);

			await service.get('exec-deleted');

			expect(executionRepository.findOne).toHaveBeenCalledWith(
				expect.objectContaining({ withDeleted: true }),
			);
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
