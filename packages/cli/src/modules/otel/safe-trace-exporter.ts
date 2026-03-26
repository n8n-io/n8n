import type { Logger } from '@n8n/backend-common';
import { ExportResultCode } from '@opentelemetry/core';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';

type LogFailureAction = 'export' | 'shutdown' | 'forceFlush';

export class SafeTraceExporter implements SpanExporter {
	private loggedFailures = new Set<LogFailureAction>();

	constructor(
		private readonly wrappedExporter: SpanExporter,
		private readonly logger: Logger,
	) {}

	export(spans: ReadableSpan[], resultCallback: Parameters<SpanExporter['export']>[1]): void {
		try {
			this.wrappedExporter.export(spans, (result) => {
				if (result.code !== ExportResultCode.SUCCESS) {
					this.logFailure('export', result.error);
				}

				resultCallback(result);
			});
		} catch (error) {
			this.logFailure('export', error);
			resultCallback({ code: ExportResultCode.FAILED, error: toError(error) });
		}
	}

	async shutdown(): Promise<void> {
		try {
			await this.wrappedExporter.shutdown();
		} catch (error) {
			this.logFailure('shutdown', error);
		}
	}

	async forceFlush(): Promise<void> {
		try {
			if (this.wrappedExporter.forceFlush) {
				await this.wrappedExporter.forceFlush();
			}
		} catch (error) {
			this.logFailure('forceFlush', error);
		}
	}

	private logFailure(action: LogFailureAction, error: unknown) {
		if (this.loggedFailures.has(action)) {
			return;
		}

		this.loggedFailures.add(action);

		const messages: Record<LogFailureAction, string> = {
			export: 'Failed to export OpenTelemetry spans to OTLP endpoint',
			shutdown: 'Failed to shut down OpenTelemetry trace exporter',
			forceFlush: 'Failed to flush OpenTelemetry trace exporter',
		};

		this.logger.error(messages[action], { error: toError(error).message });
	}
}

function toError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}
