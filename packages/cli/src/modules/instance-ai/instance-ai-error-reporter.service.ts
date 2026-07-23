import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { isQuotaExhaustedError } from '@n8n/instance-ai';
import { ErrorReporter } from 'n8n-core';

import {
	buildInstanceAiObservabilityContext,
	type InstanceAiObservabilityContext,
} from './observability';

export type InstanceAiErrorReportContext = { component: string } & InstanceAiObservabilityContext;

/**
 * The ai-assistant-sdk vendors its own ApplicationError, so its client-level
 * errors (4xx, `level: 'warning'`, e.g. throttling) fail the core reporter's
 * instanceof check and would reach Sentry despite declaring themselves benign.
 */
function isSelfDeclaredWarning(error: unknown): boolean {
	if (typeof error !== 'object' || error === null || !('level' in error)) return false;
	return error.level === 'warning' || error.level === 'info';
}

@Service()
export class InstanceAiErrorReporterService {
	private readonly logger: Logger;

	private readonly reportedErrorsByRun = new Map<string, WeakSet<object>>();

	constructor(
		logger: Logger,
		private readonly errorReporter: ErrorReporter,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	beginRun(runId: string): void {
		this.reportedErrorsByRun.set(runId, new WeakSet());
	}

	endRun(runId: string): void {
		this.reportedErrorsByRun.delete(runId);
	}

	endAllRuns(): void {
		this.reportedErrorsByRun.clear();
	}

	report(error: unknown, context: InstanceAiErrorReportContext): void {
		if (this.shouldSkipDuplicateReport(error, context.runId)) return;

		const observability = buildInstanceAiObservabilityContext(context);

		if (isQuotaExhaustedError(error)) {
			// Expected condition: the user ran out of AI credits and the run already
			// surfaces it as `quota_exhausted`. Not worth a Sentry event.
			this.logger.info(`Instance AI quota exhausted in ${context.component}`, {
				component: context.component,
				...observability,
			});
			return;
		}

		if (isSelfDeclaredWarning(error)) {
			this.logger.warn(`Instance AI warning-level error in ${context.component}`, {
				error,
				component: context.component,
				...observability,
			});
			return;
		}

		this.logger.error(`Instance AI error in ${context.component}`, {
			error,
			component: context.component,
			...observability,
		});

		this.errorReporter.error(error, {
			tags: { component: context.component, ...observability },
			extra: observability,
			// Reports fire from the background run loop, where the ambient Sentry
			// scope can hold an unrelated HTTP request (e.g. a health check).
			shouldIsolate: true,
		});
	}

	async withBoundary<T>(
		component: string,
		context: InstanceAiObservabilityContext,
		fn: () => Promise<T>,
	): Promise<T> {
		try {
			return await fn();
		} catch (error) {
			this.report(error, { component, ...context });

			throw error;
		}
	}

	private shouldSkipDuplicateReport(error: unknown, runId?: string): boolean {
		if (typeof error !== 'object' || error === null || !runId) {
			return false;
		}

		const reportedErrors = this.reportedErrorsByRun.get(runId);
		if (!reportedErrors) {
			return false;
		}

		if (reportedErrors.has(error)) {
			return true;
		}

		reportedErrors.add(error);
		return false;
	}
}
