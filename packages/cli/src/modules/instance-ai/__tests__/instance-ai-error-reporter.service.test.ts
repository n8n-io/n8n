import type { Mock } from 'vitest';

import { InstanceAiErrorReporterService } from '../instance-ai-error-reporter.service';

describe('InstanceAiErrorReporterService', () => {
	function createService(): {
		service: InstanceAiErrorReporterService;
		errorReporter: { error: Mock };
		logger: { error: Mock };
	} {
		const errorReporter = { error: vi.fn() };
		const logger: { error: Mock; scoped: Mock } = {
			error: vi.fn(),
			scoped: vi.fn(),
		};
		logger.scoped.mockReturnValue(logger);
		const service = new InstanceAiErrorReporterService(logger as never, errorReporter as never);
		return { service, errorReporter, logger };
	}

	it('reports an error once even if reported again under a different component', () => {
		const { service, errorReporter } = createService();
		const error = new Error('boom');

		service.beginRun('r');
		service.report(error, {
			component: 'instance-ai-mcp-setup',
			threadId: 't',
			runId: 'r',
		});
		service.report(error, {
			component: 'instance-ai-run',
			threadId: 't',
			runId: 'r',
		});

		expect(errorReporter.error).toHaveBeenCalledTimes(1);
		expect(errorReporter.error.mock.calls[0][1].tags.component).toBe('instance-ai-mcp-setup');
	});

	it('withBoundary reports with its component then rethrows', async () => {
		const { service, errorReporter } = createService();
		const error = new Error('setup failed');

		service.beginRun('r');
		await expect(
			service.withBoundary('instance-ai-sandbox-setup', { threadId: 't', runId: 'r' }, async () => {
				throw error;
			}),
		).rejects.toBe(error);

		expect(errorReporter.error).toHaveBeenCalledTimes(1);
		expect(errorReporter.error.mock.calls[0][1].tags.component).toBe('instance-ai-sandbox-setup');
	});

	it('includes thread-scoped context without a run id', () => {
		const { service, errorReporter } = createService();
		const error = new Error('persist failed');

		service.report(error, {
			component: 'instance-ai-ensure-thread',
			threadId: 'thread-1',
			userId: 'user-1',
			projectId: 'project-1',
		});

		expect(errorReporter.error).toHaveBeenCalledWith(error, {
			tags: {
				component: 'instance-ai-ensure-thread',
				source: 'instance-ai',
				threadId: 'thread-1',
				userId: 'user-1',
				projectId: 'project-1',
			},
			extra: {
				source: 'instance-ai',
				threadId: 'thread-1',
				userId: 'user-1',
				projectId: 'project-1',
			},
		});
	});

	it('drops per-run dedup state after endRun', () => {
		const { service, errorReporter } = createService();
		const error = new Error('boom');

		service.beginRun('r');
		service.report(error, {
			component: 'instance-ai-run',
			threadId: 't',
			runId: 'r',
		});
		service.endRun('r');
		service.beginRun('r');
		service.report(error, {
			component: 'instance-ai-run',
			threadId: 't',
			runId: 'r',
		});

		expect(errorReporter.error).toHaveBeenCalledTimes(2);
	});

	it('does not dedup run-scoped errors when beginRun was not called', () => {
		const { service, errorReporter } = createService();
		const error = new Error('boom');

		service.report(error, {
			component: 'instance-ai-background-task',
			threadId: 't',
			runId: 'r',
		});
		service.report(error, {
			component: 'instance-ai-background-task',
			threadId: 't',
			runId: 'r',
		});

		expect(errorReporter.error).toHaveBeenCalledTimes(2);
	});

	it('endAllRuns clears every active run scope', () => {
		const { service, errorReporter } = createService();
		const error = new Error('boom');

		service.beginRun('r1');
		service.beginRun('r2');
		service.endAllRuns();

		service.report(error, { component: 'instance-ai-run', threadId: 't', runId: 'r1' });
		service.report(error, { component: 'instance-ai-run', threadId: 't', runId: 'r1' });

		expect(errorReporter.error).toHaveBeenCalledTimes(2);
	});
});
