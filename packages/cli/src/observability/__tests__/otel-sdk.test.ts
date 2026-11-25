import type * as MicrosoftOpenTelemetry from '@microsoft/opentelemetry';
import { Logger } from '@n8n/backend-common';
import type { TracingSourcesConfig } from '@n8n/config';
import { LOWEST_SHUTDOWN_PRIORITY, ShutdownMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import {
	context,
	diag,
	type DiagLogger,
	metrics,
	propagation,
	ROOT_CONTEXT,
	trace,
} from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import {
	AlwaysOffSampler,
	AlwaysOnSampler,
	InMemorySpanExporter,
	ParentBasedSampler,
	SimpleSpanProcessor,
	type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import nock from 'nock';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mock } from 'vitest-mock-extended';

import { startObservability } from '../observability-boot';
import { OtelSdk } from '../otel-sdk';

type OptIns = {
	daytona?: boolean;
	microsoftAgent365?: boolean;
	exportToMicrosoft?: boolean;
};

let exporter: InMemorySpanExporter;
let processor: SimpleSpanProcessor;
let logger: ReturnType<typeof mock<Logger>>;

function createSdk({
	daytona = false,
	microsoftAgent365 = false,
	exportToMicrosoft = false,
}: OptIns = {}) {
	logger = mock<Logger>();
	return new OtelSdk(
		logger,
		mock<TracingSourcesConfig>({
			daytonaTracingEnabled: daytona,
			microsoftAgent365TracingEnabled: microsoftAgent365,
			microsoftAgent365ExportEnabled: exportToMicrosoft,
		}),
	);
}

async function startWithExport(optIns: OptIns = {}) {
	const sdk = createSdk(optIns);
	sdk.start();
	await sdk.apply(exportingPipeline());
	return sdk;
}

function exportingPipeline() {
	exporter = new InMemorySpanExporter();
	processor = new SimpleSpanProcessor(exporter);
	return {
		spanProcessors: [processor],
		sampler: new AlwaysOnSampler(),
		propagator: new W3CTraceContextPropagator(),
	};
}

async function exportedSpans() {
	await processor.forceFlush();
	return exporter.getFinishedSpans();
}

describe('OtelSdk', () => {
	const originalDetectors = process.env.OTEL_NODE_RESOURCE_DETECTORS;

	beforeEach(() => {
		process.env.OTEL_NODE_RESOURCE_DETECTORS = 'env';
	});

	afterEach(() => {
		trace.disable();
		context.disable();
		propagation.disable();
		metrics.disable();
		diag.disable();
		delete process.env.OTEL_SDK_DISABLED;
		delete process.env.OTEL_LOG_LEVEL;
		process.env.OTEL_NODE_RESOURCE_DETECTORS = originalDetectors;
	});

	describe('tracer gate', () => {
		it("exports only n8n's own tracers when no opt-in is on", async () => {
			await startWithExport();

			for (const name of [
				'n8n-workflow',
				'@n8n/agents',
				'n8n-expression-runtime',
				'',
				'Agent365Sdk',
				'@microsoft/agents-telemetry',
				'some-library',
			]) {
				trace.getTracer(name).startSpan(`span from "${name}"`).end();
			}

			expect((await exportedSpans()).map((span) => span.instrumentationScope.name)).toEqual([
				'n8n-workflow',
				'@n8n/agents',
				'n8n-expression-runtime',
			]);
		});

		it.each<[keyof OptIns, string[]]>([
			['daytona', ['']],
			['microsoftAgent365', ['Agent365Sdk', '@microsoft/agents-telemetry']],
		])('brings the tracers of the %s opt-in back', async (optIn, tracerNames) => {
			await startWithExport({ [optIn]: true });

			for (const name of [...tracerNames, 'some-library']) {
				trace.getTracer(name).startSpan('library span').end();
			}

			expect((await exportedSpans()).map((span) => span.instrumentationScope.name)).toEqual(
				tracerNames,
			);
		});

		it('gates a tracer that a library took before the SDK started', async () => {
			const earlyLibraryTracer = trace.getTracer('some-library');
			const earlyWorkflowTracer = trace.getTracer('n8n-workflow');

			await startWithExport();

			expect(earlyLibraryTracer.startSpan('library span').isRecording()).toBe(false);
			expect(earlyWorkflowTracer.startSpan('workflow.execute').isRecording()).toBe(true);
		});

		it('keeps the real parent for an enabled span under a gated span', async () => {
			await startWithExport();

			const workflowSpan = trace.getTracer('n8n-workflow').startSpan('workflow.execute');
			const gatedSpan = trace
				.getTracer('some-library')
				.startSpan('library span', {}, trace.setSpan(ROOT_CONTEXT, workflowSpan));
			const agentSpan = trace
				.getTracer('@n8n/agents')
				.startSpan('agent.stream', {}, trace.setSpan(ROOT_CONTEXT, gatedSpan));
			agentSpan.end();
			gatedSpan.end();
			workflowSpan.end();

			const [exportedAgentSpan] = await exportedSpans();
			expect(exportedAgentSpan.parentSpanContext?.spanId).toBe(workflowSpan.spanContext().spanId);
		});
	});

	describe('global setup', () => {
		it('registers no meter provider', async () => {
			const meterProviderBeforeStart = metrics.getMeterProvider();

			await startWithExport();

			expect(metrics.getMeterProvider()).toBe(meterProviderBeforeStart);
		});

		it('registers nothing and logs one warning when OTEL_SDK_DISABLED is true', async () => {
			process.env.OTEL_SDK_DISABLED = 'true';

			await startWithExport();

			expect(trace.getTracer('n8n-workflow').startSpan('workflow.execute').isRecording()).toBe(
				false,
			);
			expect(logger.warn).toHaveBeenCalledTimes(1);
		});

		it('keeps applying when a replaced span processor fails to shut down', async () => {
			const sdk = createSdk();
			sdk.start();
			const failingProcessor = mock<SpanProcessor>();
			failingProcessor.shutdown.mockRejectedValue(new Error('ECONNREFUSED'));
			await sdk.apply({ ...exportingPipeline(), spanProcessors: [failingProcessor] });

			const shutdownErrors = await sdk.apply(exportingPipeline());
			trace.getTracer('n8n-workflow').startSpan('workflow.execute').end();

			expect(shutdownErrors).toEqual([new Error('ECONNREFUSED')]);
			expect(await exportedSpans()).toHaveLength(1);
		});

		it('sends spans to the new processor as soon as apply is called, before the old one shuts down', async () => {
			const sdk = createSdk();
			sdk.start();
			const flushingProcessor = mock<SpanProcessor>();
			flushingProcessor.shutdown.mockReturnValue(new Promise(() => {}));
			await sdk.apply({ ...exportingPipeline(), spanProcessors: [flushingProcessor] });

			void sdk.apply(exportingPipeline());
			trace.getTracer('n8n-workflow').startSpan('workflow.execute').end();

			expect(await exportedSpans()).toHaveLength(1);
			expect(flushingProcessor.onEnd).not.toHaveBeenCalled();
		});

		it('does not replace or gate a tracer provider that another setup registered first', async () => {
			const foreignExporter = new InMemorySpanExporter();
			new NodeTracerProvider({
				spanProcessors: [new SimpleSpanProcessor(foreignExporter)],
			}).register();
			const foreignDiagnosticsLogger = mock<DiagLogger>();
			diag.setLogger(foreignDiagnosticsLogger);

			await startWithExport();
			trace.getTracer('some-library').startSpan('GET /webhook').end();
			trace.getTracer('n8n-workflow').startSpan('workflow.execute').end();
			diag.error('from a library');

			expect(foreignExporter.getFinishedSpans().map((span) => span.name)).toEqual([
				'GET /webhook',
				'workflow.execute',
			]);
			expect(await exportedSpans()).toEqual([]);
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(foreignDiagnosticsLogger.error).toHaveBeenCalledWith('from a library');
			expect(logger.error).not.toHaveBeenCalled();
		});

		it('forwards diagnostics at the OTEL_LOG_LEVEL level to the n8n logger', () => {
			process.env.OTEL_LOG_LEVEL = 'info';
			const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});
			createSdk().start();

			diag.info('exporter ready');

			expect(logger.info).toHaveBeenCalledWith('OpenTelemetry diagnostics info', {
				args: ['exporter ready'],
			});
			expect(consoleInfo).not.toHaveBeenCalled();
		});

		it('flushes and shuts down the span processors through the SDK', async () => {
			const sdk = createSdk();
			sdk.start();
			const exportingProcessor = mock<SpanProcessor>();
			await sdk.apply({ ...exportingPipeline(), spanProcessors: [exportingProcessor] });

			await sdk.shutdown();

			expect(exportingProcessor.shutdown).toHaveBeenCalledTimes(1);
		});

		it('rejects the shutdown with the first failed flush', async () => {
			const sdk = createSdk();
			sdk.start();
			const failingProcessor = mock<SpanProcessor>();
			failingProcessor.shutdown.mockRejectedValue(new Error('ECONNREFUSED'));
			await sdk.apply({ ...exportingPipeline(), spanProcessors: [failingProcessor] });

			await expect(sdk.shutdown()).rejects.toThrow('ECONNREFUSED');
		});
	});

	describe('Microsoft Agent 365 export', () => {
		// The node loads the CommonJS copy of the package, so the test fills that copy's token cache.
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const microsoft = require('@microsoft/opentelemetry') as typeof MicrosoftOpenTelemetry;
		const microsoftEndpoint = 'https://agent365.svc.cloud.microsoft';
		const tracesPath = '/observability/tenants/tenant-1/otlp/agents/agent-1/traces';

		beforeAll(async () => {
			nock.disableNetConnect();
			await microsoft.AgenticTokenCacheInstance.refreshObservabilityToken(
				'agent-1',
				'tenant-1',
				mock(),
				{ exchangeToken: async () => ({ token: 'export-token' }) },
			);
		});

		afterEach(() => {
			nock.cleanAll();
		});

		afterAll(() => {
			nock.enableNetConnect();
		});

		function interceptMicrosoftExport(onBody: (body: unknown) => void = () => {}) {
			return nock(microsoftEndpoint)
				.post(tracesPath, (body: unknown) => {
					onBody(body);
					return true;
				})
				.query({ 'api-version': '1' })
				.matchHeader('authorization', 'Bearer export-token')
				.reply(200);
		}

		async function shutDown(sdk: OtelSdk) {
			await sdk.shutdown();
			await sdk.shutdownAgent365Provider();
		}

		function sendAgentTurn() {
			microsoft.InvokeAgentScope.start(
				{ conversationId: 'conversation-1' },
				{},
				{ agentId: 'agent-1', tenantId: 'tenant-1' },
			).dispose();
		}

		it("sends Agent 365 spans to Microsoft with the agent's token when the customer's OTel is off", async () => {
			const microsoftExport = interceptMicrosoftExport();
			const sdk = createSdk({ exportToMicrosoft: true });
			sdk.start();

			sendAgentTurn();
			await shutDown(sdk);

			expect(microsoftExport.isDone()).toBe(true);
		});

		it("keeps Agent 365 spans out of the customer's endpoint without the opt-in", async () => {
			const microsoftExport = interceptMicrosoftExport();
			const sdk = await startWithExport({ exportToMicrosoft: true });

			sendAgentTurn();
			const customerSpans = await exportedSpans();
			await shutDown(sdk);

			expect(customerSpans).toEqual([]);
			expect(microsoftExport.isDone()).toBe(true);
		});

		it("also sends Agent 365 spans to the customer's endpoint with the opt-in", async () => {
			const microsoftExport = interceptMicrosoftExport();
			const sdk = await startWithExport({ exportToMicrosoft: true, microsoftAgent365: true });

			sendAgentTurn();
			const customerSpans = await exportedSpans();
			await shutDown(sdk);

			expect(customerSpans.map((span) => span.instrumentationScope.name)).toEqual(['Agent365Sdk']);
			expect(microsoftExport.isDone()).toBe(true);
		});

		it("gives the customer n8n's resource and Microsoft only the service name", async () => {
			const originalResourceAttributes = process.env.OTEL_RESOURCE_ATTRIBUTES;
			process.env.OTEL_RESOURCE_ATTRIBUTES = 'deployment.environment=staging';
			try {
				let microsoftResource: unknown;
				interceptMicrosoftExport((body) => {
					microsoftResource = (body as { resourceSpans: Array<{ resource: unknown }> })
						.resourceSpans[0].resource;
				});
				const sdk = await startWithExport({ exportToMicrosoft: true, microsoftAgent365: true });

				trace.getTracer('n8n-workflow').startSpan('workflow.execute').end();
				sendAgentTurn();
				const [workflowSpan, agentSpan] = await exportedSpans();
				await shutDown(sdk);

				expect(workflowSpan.resource.attributes['deployment.environment']).toBe('staging');
				expect(agentSpan.resource.attributes).toEqual(workflowSpan.resource.attributes);
				expect(microsoftResource).toEqual({
					attributes: { 'service.name': 'n8n-microsoft-agent-365' },
				});
			} finally {
				if (originalResourceAttributes === undefined) {
					delete process.env.OTEL_RESOURCE_ATTRIBUTES;
				} else {
					process.env.OTEL_RESOURCE_ATTRIBUTES = originalResourceAttributes;
				}
			}
		});

		it('writes nothing to disk and warns when the last send to Microsoft fails', async () => {
			const originalTmpdir = process.env.TMPDIR;
			const storageRoot = await mkdtemp(join(tmpdir(), 'n8n-agent-365-'));
			try {
				process.env.TMPDIR = storageRoot;
				nock(microsoftEndpoint).post(tracesPath).query(true).times(4).reply(503);
				const sdk = createSdk({ exportToMicrosoft: true });
				sdk.start();

				sendAgentTurn();
				await sdk.shutdownAgent365Provider();

				expect(await readdir(storageRoot, { recursive: true })).toEqual([]);
				expect(logger.warn).toHaveBeenCalledWith(
					'Failed to send the last Microsoft Agent 365 spans to Microsoft',
					{ error: expect.stringContaining('span export failed') },
				);
			} finally {
				process.env.TMPDIR = originalTmpdir;
				await rm(storageRoot, { recursive: true });
			}
		});

		it("drops a whole Agent 365 trace that the customer's sampler drops, and still sends it to Microsoft", async () => {
			const microsoftExport = interceptMicrosoftExport();
			const sdk = createSdk({ exportToMicrosoft: true, microsoftAgent365: true });
			sdk.start();
			await sdk.apply({
				...exportingPipeline(),
				sampler: new ParentBasedSampler({ root: new AlwaysOffSampler() }),
			});

			const tracer = trace.getTracer('Agent365Sdk');
			tracer.startActiveSpan('invoke_agent', (agentSpan) => {
				tracer.startSpan('chat').end();
				trace.getTracer('@microsoft/agents-telemetry').startSpan('sendActivity').end();
				agentSpan.end();
			});
			sendAgentTurn();
			const customerSpans = await exportedSpans();
			await shutDown(sdk);

			expect(customerSpans).toEqual([]);
			expect(microsoftExport.isDone()).toBe(true);
		});

		it('keeps spans that start under an Agent 365 span away from the customer without the opt-in', async () => {
			interceptMicrosoftExport();
			const sdk = await startWithExport({ exportToMicrosoft: true });

			trace.getTracer('Agent365Sdk').startActiveSpan('invoke_agent', (agentSpan) => {
				trace.getTracer('n8n-expression-runtime').startSpan('expression.evaluate').end();
				agentSpan.end();
			});
			const customerSpans = await exportedSpans();
			await shutDown(sdk);

			expect(customerSpans).toEqual([]);
		});

		it("shuts down the customer's span processor once", async () => {
			const sdk = createSdk({ exportToMicrosoft: true, microsoftAgent365: true });
			sdk.start();
			const exportingProcessor = mock<SpanProcessor>();
			await sdk.apply({ ...exportingPipeline(), spanProcessors: [exportingProcessor] });

			await shutDown(sdk);

			expect(exportingProcessor.shutdown).toHaveBeenCalledTimes(1);
		});

		it('flushes the export to Microsoft in its own shutdown step', () => {
			const handlers =
				Container.get(ShutdownMetadata).getHandlersByPriority()[LOWEST_SHUTDOWN_PRIORITY];

			expect(handlers).toContainEqual({
				serviceClass: OtelSdk,
				methodName: 'shutdownAgent365Provider',
			});
		});

		it('warns that nothing goes to Microsoft when another OTel setup came first', () => {
			new NodeTracerProvider().register();
			const sdk = createSdk({ exportToMicrosoft: true });

			sdk.start();

			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('sends no Microsoft Agent 365 spans to Microsoft'),
			);
		});

		it('sends nothing to Microsoft when the export is off', async () => {
			const microsoftExport = interceptMicrosoftExport();
			const sdk = createSdk({ exportToMicrosoft: false });
			sdk.start();

			sendAgentTurn();
			await shutDown(sdk);

			expect(microsoftExport.isDone()).toBe(false);
		});
	});

	describe('startObservability', () => {
		let sdk: OtelSdk;

		beforeEach(() => {
			sdk = createSdk();
			Container.set(OtelSdk, sdk);
			Container.set(Logger, logger);
		});

		it('starts the OTel setup so that n8n spans export', async () => {
			startObservability();
			await sdk.apply(exportingPipeline());
			trace.getTracer('n8n-workflow').startSpan('workflow.execute').end();

			expect(await exportedSpans()).toHaveLength(1);
		});

		it('logs the error and lets n8n start when the OTel setup throws', () => {
			vi.spyOn(sdk, 'start').mockImplementation(() => {
				throw new Error('setup failed');
			});

			expect(() => startObservability()).not.toThrow();
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to set up observability at startup, so tracing stays off',
				{ error: 'setup failed' },
			);
		});
	});
});
