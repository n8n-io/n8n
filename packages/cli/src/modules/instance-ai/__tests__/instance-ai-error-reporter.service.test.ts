import { InstanceAiErrorReporterService } from '../instance-ai-error-reporter.service';

describe('InstanceAiErrorReporterService', () => {
	function createService(): {
		service: InstanceAiErrorReporterService;
		errorReporter: { error: jest.Mock };
		logger: { error: jest.Mock };
	} {
		const errorReporter = { error: jest.fn() };
		const logger = { error: jest.fn(), scoped: jest.fn(() => logger) };
		const service = new InstanceAiErrorReporterService(logger as never, errorReporter as never);
		return { service, errorReporter, logger };
	}

	it('reports an error once even if reported again under a different component', () => {
		const { service, errorReporter } = createService();
		const error = new Error('boom');

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
});
