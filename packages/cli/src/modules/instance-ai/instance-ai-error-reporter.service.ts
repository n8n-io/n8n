import type { AgentEventData } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { isAxiosError } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { BaseError } from '@n8n/errors';
import { isQuotaExhaustedError } from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { sanitizeErrorDetail } from '@n8n/utils/redaction/sanitize-error-detail';
import { ErrorReporter } from 'n8n-core';
import { ExecutionCancelledError } from 'n8n-workflow';

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
	/** Remove sensitive details from the payload after classification and deduplication. */
	sanitizeError?: boolean;
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

		let reportedError = error;
		if (context.sanitizeError) {
			const sanitized = new Error(sanitizeErrorDetail(getErrorMessage(error), 1000));
			if (error instanceof Error) {
				sanitized.name = sanitizeErrorDetail(error.name, 100);
				sanitized.stack = error.stack && sanitizeErrorDetail(error.stack, 10000);
			}
			// Do not copy causes or custom properties into logs or Sentry.
			reportedError = sanitized;
		}

		if (context.providerStream && isStreamTransportError(error)) {
			this.logger.warn(`Instance AI stream transport failure in ${context.component}`, {
				error: reportedError,
				component: context.component,
				...observability,
			});
			return;
		}

		if (isSelfDeclaredWarning(error)) {
			this.logger.warn(`Instance AI warning-level error in ${context.component}`, {
				error: reportedError,
				component: context.component,
				...observability,
			});
			return;
		}

		const logDetails = { error: reportedError, component: context.component, ...observability };
		if (context.severity === 'warning') {
			this.logger.warn(`Instance AI error in ${context.component}`, logDetails);
		} else {
			this.logger.error(`Instance AI error in ${context.component}`, logDetails);
		}

		// Keep the core reporter's exclusions after replacing the original error payload.
		if (
			context.sanitizeError &&
			(error instanceof ExecutionCancelledError ||
				(error instanceof BaseError && !error.shouldReport) ||
				// oxlint-disable-next-line typescript/no-deprecated
				isAxiosError(error) ||
				(error instanceof Error && isSelfDeclaredWarning(error.cause)))
		) {
			return;
		}

		this.errorReporter.error(reportedError, {
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
