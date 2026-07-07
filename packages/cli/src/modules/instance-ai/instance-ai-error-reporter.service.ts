import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';

import {
	buildInstanceAiObservabilityContext,
	type InstanceAiObservabilityContext,
} from './observability';

export type InstanceAiErrorReportContext = { component: string } & InstanceAiObservabilityContext;

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

		this.logger.error(`Instance AI error in ${context.component}`, {
			error,
			component: context.component,
			...observability,
		});

		this.errorReporter.error(error, {
			tags: { component: context.component, ...observability },
			extra: observability,
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
