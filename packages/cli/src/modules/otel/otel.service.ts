import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { latestWins } from '@n8n/utils/promise/latest-wins';
import { raceAbort } from '@n8n/utils/race-abort';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
	BasicTracerProvider,
	BatchSpanProcessor,
	type ReadableSpan,
	type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-node';
import { InstanceSettings } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';

import { ExecutionIdentitySpanProcessor } from './execution-identity';
import {
	OtelExporterFactory,
	type ExportField,
	type ExportSettings,
} from './otel-exporter.factory';
import type { OtelConnectionParams } from './otel-settings.service';
import { OtelSettingsService } from './otel-settings.service';
import type { OtelConfig } from './otel.config';
import { ATTR, OTEL_TEST_SPAN_NAME } from './otel.constants';
import { mergeResourceAttributes } from './otel-span-exporter';

import { N8N_VERSION } from '@/constants';
import { OtelSdk } from '@/observability/otel-sdk';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import {
	TRACING_OFF,
	type ShutdownErrors,
	type TracingPipeline,
} from '@/observability/swappable-pipeline';

export type OtelTestTraceResult = { success: true } | { success: false; error: string };

type ActiveExport = { settings: OtelConfig; spanProcessors: SpanProcessor[] };

const EXPORT_FIELDS = {
	exporterProtocol: true,
	exporterEndpoint: true,
	exporterTracingPath: true,
	exporterHeaders: true,
	exporterServiceName: true,
} satisfies Record<ExportField, true>;

const isExportField = (key: string): key is ExportField => key in EXPORT_FIELDS;

const hasSameExportFields = (a: ExportSettings, b: ExportSettings) =>
	Object.keys(EXPORT_FIELDS)
		.filter(isExportField)
		.every((field) => a[field] === b[field]);

const EXIT_FLUSH_TIMEOUT_MS = 5_000;

const stripEmptyResolutionNote = (message: string) =>
	message.replace(/\s*Resolution note:\s*$/, '');

@Service()
export class OtelService {
	private activeExport?: ActiveExport;

	private isShutDown = false;

	constructor(
		private readonly otelSettingsService: OtelSettingsService,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
		private readonly exporterFactory: OtelExporterFactory,
		private readonly otelSdk: OtelSdk,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly publisher: Publisher,
	) {}

	async init(): Promise<void> {
		await this.applySavedSettings();
	}

	readonly applySavedSettings = latestWins(async () => {
		if (this.isShutDown) return;

		await this.applySettings(await this.otelSettingsService.loadSettings());
	});

	async reloadSettings(): Promise<void> {
		await this.applySavedSettings();
		await this.moduleRegistry.refreshModuleSettings('otel');
	}

	async applyAfterSave(): Promise<void> {
		await this.reloadSettings();

		void this.publisher
			.publishCommand({ command: 'reload-otel-config' })
			.catch((error: unknown) => {
				this.logger.warn('Failed to tell other processes to reload the OpenTelemetry settings', {
					error: getErrorMessage(error),
				});
			});
	}

	/**
	 * Sends a single `n8n.test_trace` span to the given OTLP endpoint and waits
	 * for the exporter's result. Unlike the export pipeline (which batches spans
	 * fire-and-forget), this uses a throwaway provider/exporter so the collector's
	 * response — success, a rejection (HTTP status or gRPC status code), or a
	 * network error — can be reported back to the caller. Runs independently of
	 * the active OTel configuration.
	 */
	async sendTestTrace(connection: OtelConnectionParams): Promise<OtelTestTraceResult> {
		let provider: BasicTracerProvider | undefined;
		try {
			const exporter = await this.exporterFactory.createTraceExporter(
				connection,
				connection.startupConnectivityTimeoutMs,
			);

			try {
				return await new Promise<OtelTestTraceResult>((resolve) => {
					const processor: SpanProcessor = {
						onStart: () => {},
						onEnd: (span: ReadableSpan) =>
							exporter.export([span], (result) =>
								resolve(
									result.error
										? { success: false, error: stripEmptyResolutionNote(result.error.message) }
										: { success: true },
								),
							),
						forceFlush: async () => {},
						shutdown: async () => {},
					};
					provider = new BasicTracerProvider({
						resource: resourceFromAttributes(
							this.resourceAttributes(connection.exporterServiceName),
						),
						sampler: new TraceIdRatioBasedSampler(1),
						spanProcessors: [processor],
					});
					const span = provider
						.getTracer('n8n-otel-test')
						.startSpan(OTEL_TEST_SPAN_NAME, { attributes: { [ATTR.IS_TEST_TRACE]: true } });
					span.end();
				});
			} finally {
				await provider?.shutdown().catch(() => {});
				await exporter.shutdown().catch(() => {});
			}
		} catch (error) {
			return { success: false, error: error instanceof Error ? error.message : String(error) };
		}
	}

	async shutdown(): Promise<void> {
		this.isShutDown = true;
		await this.waitForPendingApply();
		this.activeExport = undefined;
		try {
			await raceAbort(
				this.otelSdk.shutdown(),
				AbortSignal.timeout(EXIT_FLUSH_TIMEOUT_MS),
				() =>
					new OperationalError(
						`The OpenTelemetry exporter did not finish its flush within ${EXIT_FLUSH_TIMEOUT_MS} ms`,
					),
			);
		} catch (error) {
			this.warnOnFailedShutdown([error]);
		}
	}

	private async waitForPendingApply(): Promise<void> {
		await this.applySavedSettings();
	}

	private async applySettings(settings: OtelConfig): Promise<void> {
		if (!this.otelSdk.isRunning) return;

		const previousExport = this.activeExport;
		const activeExport = await this.exportFor(settings);
		this.applyPipeline(this.pipelineFor(activeExport, settings));
		this.activeExport = activeExport;

		if (activeExport && activeExport !== previousExport) {
			void this.checkEndpointReachability(activeExport);
		}
	}

	private async exportFor(settings: OtelConfig): Promise<ActiveExport | undefined> {
		if (!settings.enabled) return undefined;
		if (this.activeExport && hasSameExportFields(this.activeExport.settings, settings)) {
			return this.activeExport;
		}

		const spanProcessors = await this.buildSpanProcessors(settings);
		return spanProcessors && { settings, spanProcessors };
	}

	private pipelineFor(
		activeExport: ActiveExport | undefined,
		settings: OtelConfig,
	): TracingPipeline {
		if (!activeExport) return TRACING_OFF;

		return {
			spanProcessors: activeExport.spanProcessors,
			sampler: new ParentBasedSampler({
				root: new TraceIdRatioBasedSampler(settings.tracesSampleRate),
			}),
			propagator: settings.injectOutbound
				? new W3CTraceContextPropagator()
				: TRACING_OFF.propagator,
		};
	}

	private applyPipeline(pipeline: TracingPipeline): void {
		void this.otelSdk
			.apply(pipeline)
			.then((shutdownErrors) => this.warnOnFailedShutdown(shutdownErrors));
	}

	private warnOnFailedShutdown(shutdownErrors: ShutdownErrors): void {
		if (shutdownErrors.length === 0) return;

		const [error] = shutdownErrors;
		this.logger.warn(
			'Failed to cleanly shut down an OpenTelemetry exporter (its flush may have failed)',
			{ error: getErrorMessage(error) },
		);
	}

	private async buildSpanProcessors(
		settings: ExportSettings,
	): Promise<SpanProcessor[] | undefined> {
		try {
			const exporter = mergeResourceAttributes(
				await this.exporterFactory.createTraceExporter(settings),
				this.resourceAttributes(settings.exporterServiceName),
			);
			return [new ExecutionIdentitySpanProcessor(), new BatchSpanProcessor(exporter)];
		} catch (error) {
			this.logger.error('Failed to start OpenTelemetry tracing, so tracing stays off', {
				error: getErrorMessage(error),
			});
			return undefined;
		}
	}

	private resourceAttributes(serviceName: string) {
		return {
			[ATTR.OTEL_SERVICE_NAME]: serviceName,
			[ATTR.OTEL_SERVICE_VERSION]: N8N_VERSION,
			[ATTR.INSTANCE_ID]: this.instanceSettings.instanceId,
			[ATTR.INSTANCE_ROLE]: this.instanceSettings.instanceType,
		};
	}

	private async checkEndpointReachability(activeExport: ActiveExport): Promise<void> {
		const { settings } = activeExport;

		try {
			await this.exporterFactory.probeEndpoint(settings);
		} catch (error) {
			if (this.activeExport !== activeExport) return;

			this.logger.error('Failed to connect to OpenTelemetry OTLP endpoint during startup', {
				endpoint: this.exporterFactory.resolveExporterUrl(settings),
				error: getErrorMessage(error),
			});
		}
	}
}
