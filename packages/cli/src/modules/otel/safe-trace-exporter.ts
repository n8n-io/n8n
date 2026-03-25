import type { Logger } from '@n8n/backend-common';
import { ExportResultCode } from '@opentelemetry/core';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';

export class SafeTraceExporter implements SpanExporter {
	private hasLoggedExportFailure = false;

	constructor(
		private readonly wrappedExporter: SpanExporter,
		private readonly logger: Logger,
	) {}

	export(spans: ReadableSpan[], resultCallback: Parameters<SpanExporter['export']>[1]): void {
		try {
			this.wrappedExporter.export(spans, (result) => {
				if (result.code !== ExportResultCode.SUCCESS) {
					this.logExportFailure(result.error);
				}

				resultCallback(result);
			});
		} catch (error) {
			this.logExportFailure(error);
			resultCallback({ code: ExportResultCode.FAILED, error: toError(error) });
		}
	}

	async shutdown(): Promise<void> {
		try {
			await this.wrappedExporter.shutdown();
		} catch (error) {
			this.logExportFailure(error);
		}
	}

	async forceFlush(): Promise<void> {
		try {
			if (this.wrappedExporter.forceFlush) {
				await this.wrappedExporter.forceFlush();
			}
		} catch (error) {
			this.logExportFailure(error);
		}
	}

	private logExportFailure(error: unknown) {
		if (this.hasLoggedExportFailure) return;

		this.hasLoggedExportFailure = true;
		this.logger.error('Failed to export OpenTelemetry spans to OTLP endpoint', {
			error: toError(error).message,
		});
	}
}

function toError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}
