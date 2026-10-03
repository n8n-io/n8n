import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import {
	createInstanceAiTraceContext,
	redactOtlpTelemetrySpan,
	releaseTraceClient,
	setOtlpSpanProcessorFactory,
} from '@n8n/instance-ai';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import type { InstanceSettings } from 'n8n-core';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mock } from 'vitest-mock-extended';

import type { OtelSettingsService } from '../otel-settings.service';
import type { OtelConfig } from '../otel.config';
import { OtelService } from '../otel.service';

const { exportedSpans } = vi.hoisted(() => ({ exportedSpans: [] as ReadableSpan[] }));

vi.mock('@opentelemetry/exporter-trace-otlp-proto', () => ({
	OTLPTraceExporter: vi.fn().mockImplementation(function () {
		return {
			export: (spans: ReadableSpan[], resultCallback: (result: { code: number }) => void) => {
				exportedSpans.push(...spans);
				resultCallback({ code: 0 });
			},
			shutdown: async () => {},
			forceFlush: async () => {},
		};
	}),
}));

const SECRET = 'Bearer canaryTokenAbcdefghijklmnopqrstuvwxyz0123';
// No redaction pattern matches it: only the allowlist keeps it out.
const PLAIN_SECRET = 'canary-plain-7f3a';

const settings: OtelConfig = {
	enabled: true,
	exporterProtocol: 'http/protobuf',
	exporterEndpoint: 'http://localhost:4318',
	exporterTracingPath: '/v1/traces',
	exporterHeaders: '',
	exporterServiceName: 'n8n-test',
	tracesSampleRate: 1,
	startupConnectivityTimeoutMs: 2_000,
	includeNodeSpans: true,
	injectOutbound: true,
	productionExecutionsOnly: true,
};

const langsmithEnv = [
	'LANGSMITH_TRACING',
	'LANGSMITH_API_KEY',
	'LANGSMITH_ENDPOINT',
	'LANGCHAIN_TRACING_V2',
] as const;

function exportedText() {
	return JSON.stringify(
		exportedSpans.map(({ name, attributes, status, events }) => ({
			name,
			attributes,
			status,
			events,
		})),
	);
}

async function recordBuildTurn() {
	const tracing = await createInstanceAiTraceContext({
		threadId: 'thread-1',
		messageId: 'message-1',
		runId: 'run-1',
		userId: 'user-1',
		input: { message: `deploy with ${SECRET} ${PLAIN_SECRET}` },
	});
	if (!tracing) throw new Error('expected a build trace');

	const toolRun = await tracing.startChildRun(tracing.rootRun, {
		name: 'tool: build-workflow',
		inputs: { code: `const key = '${SECRET}' // ${PLAIN_SECRET}` },
	});
	await tracing.failRun(toolRun, new Error(`request failed: ${SECRET} ${PLAIN_SECRET}`));
	await tracing.finishRun(tracing.rootRun, { outputs: { text: 'done' } });
	releaseTraceClient(tracing.rootRun.traceId);
}

describe('instance-ai build trace on OTLP', () => {
	const savedEnv = Object.fromEntries(langsmithEnv.map((key) => [key, process.env[key]]));
	let service: OtelService;
	let langsmithServer: Server;
	const langsmithRequests: string[] = [];

	beforeAll(async () => {
		langsmithServer = createServer((request, response) => {
			langsmithRequests.push(request.url ?? '');
			request.resume();
			request.on('end', () =>
				response.writeHead(200, { 'content-type': 'application/json' }).end('{}'),
			);
		});
		await new Promise<void>((resolve) => langsmithServer.listen(0, '127.0.0.1', resolve));
	});

	afterAll(async () => {
		await new Promise((resolve) => langsmithServer.close(resolve));
	});

	beforeEach(async () => {
		exportedSpans.length = 0;
		langsmithRequests.length = 0;
		const otelSettingsService = mock<OtelSettingsService>();
		otelSettingsService.loadSettings.mockResolvedValue(settings);
		service = new OtelService(
			otelSettingsService,
			mock<InstanceSettings>({ instanceId: 'inst-1', instanceType: 'main' }),
			mock<Logger>(),
			{
				transport: () => ({ asCustomFetch: () => vi.fn().mockResolvedValue({ ok: true }) }),
			} as unknown as OutboundHttp,
		);
		await service.init();
	});

	afterEach(async () => {
		setOtlpSpanProcessorFactory(undefined);
		await service.shutdown();
		for (const key of langsmithEnv) {
			if (savedEnv[key] === undefined) delete process.env[key];
			else process.env[key] = savedEnv[key];
		}
	});

	function useSink(includeContent: boolean) {
		setOtlpSpanProcessorFactory(() =>
			service.createSpanProcessor((content) =>
				redactOtlpTelemetrySpan(content, { includeContent }),
			),
		);
	}

	function useLangSmith(enabled: boolean) {
		delete process.env.LANGCHAIN_TRACING_V2;
		if (enabled) {
			const { port } = langsmithServer.address() as AddressInfo;
			process.env.LANGSMITH_API_KEY = 'test-key';
			process.env.LANGSMITH_ENDPOINT = `http://127.0.0.1:${port}`;
			delete process.env.LANGSMITH_TRACING;
		} else {
			process.env.LANGSMITH_TRACING = 'false';
		}
	}

	describe.each([false, true])('with LangSmith %s', (langsmith) => {
		it('never exports the secret by default', async () => {
			useLangSmith(langsmith);
			useSink(false);

			await recordBuildTurn();

			expect(exportedSpans.map((span) => span.name)).toEqual(
				expect.arrayContaining(['turn', 'tool: build-workflow']),
			);
			const turn = exportedSpans.find((span) => span.name === 'turn')!;
			expect(turn.attributes.thread_id).toBe('thread-1');
			expect(turn.attributes['gen_ai.prompt']).toBeUndefined();
			expect(turn.resource.attributes['service.name']).toBe('n8n-test');
			const tool = exportedSpans.find((span) => span.name === 'tool: build-workflow')!;
			expect(tool.status).toEqual({ code: 2 });
			expect(exportedText()).not.toContain('canaryToken');
			expect(exportedText()).not.toContain(PLAIN_SECRET);
			expect(langsmithRequests.length > 0).toBe(langsmith);
		});

		it('exports scrubbed content with the content opt-in', async () => {
			useLangSmith(langsmith);
			useSink(true);

			await recordBuildTurn();

			const turn = exportedSpans.find((span) => span.name === 'turn')!;
			expect(turn.attributes['gen_ai.prompt']).toContain('deploy with');
			const tool = exportedSpans.find((span) => span.name === 'tool: build-workflow')!;
			expect(tool.status.message).toContain('request failed');
			expect(exportedText()).toContain(PLAIN_SECRET);
			expect(exportedText()).not.toContain('canaryToken');
		});
	});

	it('creates no build trace when OTLP tracing and LangSmith are off', async () => {
		useLangSmith(false);
		useSink(false);
		await service.shutdown();

		await expect(
			createInstanceAiTraceContext({
				threadId: 'thread-1',
				messageId: 'message-1',
				runId: 'run-1',
				userId: 'user-1',
				input: {},
			}),
		).resolves.toBeUndefined();
	});
});
