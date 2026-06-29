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

	private readonly reportedErrors = new WeakSet<object>();

	constructor(
		logger: Logger,
		private readonly errorReporter: ErrorReporter,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	report(error: unknown, context: InstanceAiErrorReportContext): void {
		if (typeof error === 'object' && error !== null) {
			if (this.reportedErrors.has(error)) return;
			this.reportedErrors.add(error);
		}

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
}
