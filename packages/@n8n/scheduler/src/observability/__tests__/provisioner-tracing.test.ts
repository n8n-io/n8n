import { ensureError } from '@n8n/utils/errors/ensure-error';
import { mock } from 'vitest-mock-extended';

import type { ProvisionSummary } from '../../core/provisioning/types';
import { SCHEDULER_ATTRIBUTES, SCHEDULER_PROVISION_ACTION } from '../attributes';
import { createProvisionerTracing } from '../provisioner-tracing';
import { SpanStatus, type Span, type Tracer } from '../tracer';

const summary = (overrides: Partial<ProvisionSummary> = {}): ProvisionSummary => ({
	inserted: [],
	redefined: [],
	unchanged: [],
	removed: [],
	...overrides,
});

/**
 * A test tracer that behaves like the real (Sentry-backed) one: it hands a fresh
 * span to `run`, and when `run` throws it marks that span as errored and rethrows.
 * Every opened span is recorded so per-job child spans can be asserted.
 */
const makeTracer = () => {
	const spans: Span[] = [];
	const tracer = mock<Tracer>();
	tracer.startSpan.mockImplementation(async (_options, run) => {
		const span: Span = { setAttribute: vi.fn(), setStatus: vi.fn() };
		spans.push(span);
		try {
			return await run(span);
		} catch (error) {
			span.setStatus({ code: SpanStatus.error, message: ensureError(error).message });
			throw error;
		}
	});
	return { spans, tracer };
};

describe('createProvisionerTracing', () => {
	describe('provision', () => {
		it('opens a scheduler.provision span carrying the summary counts', async () => {
			const { spans, tracer } = makeTracer();
			const tracing = createProvisionerTracing(tracer);

			const result = await tracing.provision(
				async () =>
					await Promise.resolve(
						summary({
							inserted: [{ id: 1, name: 'a' }],
							redefined: [
								{ id: 2, name: 'b' },
								{ id: 3, name: 'c' },
							],
							unchanged: [{ id: 4, name: 'd' }],
							removed: [{ id: 5, name: 'e' }],
						}),
					),
			);

			const options = tracer.startSpan.mock.calls[0][0];
			expect(options.name).toBe('Scheduler provision');
			expect(options.op).toBe('scheduler.provision');

			const [span] = spans;
			expect(span.setAttribute).toHaveBeenCalledWith(SCHEDULER_ATTRIBUTES.provisionInserted, 1);
			expect(span.setAttribute).toHaveBeenCalledWith(SCHEDULER_ATTRIBUTES.provisionRedefined, 2);
			expect(span.setAttribute).toHaveBeenCalledWith(SCHEDULER_ATTRIBUTES.provisionUnchanged, 1);
			expect(span.setAttribute).toHaveBeenCalledWith(SCHEDULER_ATTRIBUTES.provisionRemoved, 1);
			expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatus.ok });
			expect(result.inserted).toEqual([{ id: 1, name: 'a' }]);
		});

		it('opens a per-job span for each inserted, redefined and removed job', async () => {
			const { tracer } = makeTracer();
			const tracing = createProvisionerTracing(tracer);

			await tracing.provision(
				async () =>
					await Promise.resolve(
						summary({
							inserted: [{ id: 1, name: 'a' }],
							redefined: [{ id: 2, name: 'b' }],
							unchanged: [{ id: 9, name: 'i' }],
							removed: [{ id: 3, name: 'c' }],
						}),
					),
			);

			const jobSpans = tracer.startSpan.mock.calls
				.map(([options]) => options)
				.filter((options) => options.op === 'scheduler.job.provision');

			expect(jobSpans).toEqual([
				expect.objectContaining({
					attributes: {
						[SCHEDULER_ATTRIBUTES.jobId]: 1,
						[SCHEDULER_ATTRIBUTES.jobName]: 'a',
						[SCHEDULER_ATTRIBUTES.jobAction]: SCHEDULER_PROVISION_ACTION.inserted,
					},
				}),
				expect.objectContaining({
					attributes: {
						[SCHEDULER_ATTRIBUTES.jobId]: 2,
						[SCHEDULER_ATTRIBUTES.jobName]: 'b',
						[SCHEDULER_ATTRIBUTES.jobAction]: SCHEDULER_PROVISION_ACTION.redefined,
					},
				}),
				expect.objectContaining({
					attributes: {
						[SCHEDULER_ATTRIBUTES.jobId]: 3,
						[SCHEDULER_ATTRIBUTES.jobName]: 'c',
						[SCHEDULER_ATTRIBUTES.jobAction]: SCHEDULER_PROVISION_ACTION.removed,
					},
				}),
			]);
		});

		it('opens no per-job span for an unchanged job', async () => {
			const { tracer } = makeTracer();
			const tracing = createProvisionerTracing(tracer);

			await tracing.provision(
				async () => await Promise.resolve(summary({ unchanged: [{ id: 9, name: 'i' }] })),
			);

			const jobSpans = tracer.startSpan.mock.calls.filter(
				([options]) => options.op === 'scheduler.job.provision',
			);
			expect(jobSpans).toHaveLength(0);
		});

		it('marks the span errored and rethrows when the transaction fails', async () => {
			const { spans, tracer } = makeTracer();
			const tracing = createProvisionerTracing(tracer);

			await expect(
				tracing.provision(async () => await Promise.reject(new Error('tx failed'))),
			).rejects.toThrow('tx failed');

			expect(spans[0].setStatus).toHaveBeenCalledWith({
				code: SpanStatus.error,
				message: 'tx failed',
			});
		});
	});

	describe('deprovision', () => {
		it('opens a scheduler.deprovision span carrying the removed count', async () => {
			const { spans, tracer } = makeTracer();
			const tracing = createProvisionerTracing(tracer);

			const result = await tracing.deprovision(async () => await Promise.resolve({ removed: 4 }));

			const options = tracer.startSpan.mock.calls[0][0];
			expect(options.name).toBe('Scheduler deprovision');
			expect(options.op).toBe('scheduler.deprovision');
			expect(spans[0].setAttribute).toHaveBeenCalledWith(
				SCHEDULER_ATTRIBUTES.deprovisionRemoved,
				4,
			);
			expect(spans[0].setStatus).toHaveBeenCalledWith({ code: SpanStatus.ok });
			expect(result).toEqual({ removed: 4 });
		});
	});
});
