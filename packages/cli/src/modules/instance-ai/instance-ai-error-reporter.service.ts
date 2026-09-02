import type { AgentEventData } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { isQuotaExhaustedError } from '@n8n/instance-ai';
import { ErrorReporter } from 'n8n-core';

import {
	buildInstanceAiObservabilityContext,
	type InstanceAiObservabilityContext,
} from './observability';
import { isStreamTransportError } from './stream-transport-error';

export type InstanceAiErrorReportContext = {
	component: string;
	/** Report non-terminal, best-effort failures at warning level. */
	severity?: 'warning';
	/**
	 * Set when the error terminated the model provider stream.
	 */
	providerStream?: boolean;
} & InstanceAiObservabilityContext;

type AgentErrorSource = NonNullable<Extract<AgentEventData, { error: unknown }>['source']>;

export function getAgentErrorSeverity(source: AgentErrorSource): 'warning' | undefined {
	if (source === 'observer' || source === 'reflector' || source === 'episodic-memory') {
		return 'warning';
	}
	return undefined;
}

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

	private readonly reportedErrorsByRun = new Map<
		string,
		{ executionToken: symbol; reportedErrors: WeakSet<object> }
	>();

	constructor(
		logger: Logger,
		private readonly errorReporter: ErrorReporter,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	beginRun(runId: string): symbol {
		const executionToken = Symbol('instance-ai-error-reporting-execution');
		this.reportedErrorsByRun.set(runId, { executionToken, reportedErrors: new WeakSet() });
		return executionToken;
	}

	endRun(runId: string, executionToken: symbol): void {
		if (this.reportedErrorsByRun.get(runId)?.executionToken !== executionToken) return;
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

		if (context.providerStream && isStreamTransportError(error)) {
			this.logger.warn(`Instance AI stream transport failure in ${context.component}`, {
				error,
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

		const logDetails = { error, component: context.component, ...observability };
		if (context.severity === 'warning') {
			this.logger.warn(`Instance AI error in ${context.component}`, logDetails);
		} else {
			this.logger.error(`Instance AI error in ${context.component}`, logDetails);
		}

		this.errorReporter.error(error, {
			tags: { component: context.component, ...observability },
			extra: observability,
			...(context.severity ? { level: context.severity } : {}),
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

		const runState = this.reportedErrorsByRun.get(runId);
		if (!runState) {
			return false;
		}

		if (runState.reportedErrors.has(error)) {
			return true;
		}

		runState.reportedErrors.add(error);
		return false;
	}
}
