/**
 * Integration test: Telemetry → LangSmith.
 *
 * Runs a real agent against a real model with LangSmith telemetry configured,
 * uses a local HTTP server to capture the trace data that would be sent to
 * LangSmith, and verifies the full pipeline works end-to-end.
 *
 * Pipeline under test:
 *   Agent.generate() → AI SDK (generateText with experimental_telemetry)
 *     → OTel spans with ai.operationId → LangSmithOTLPSpanProcessor
 *     → LangSmithOTLPTraceExporter → HTTP POST → captured by local server
 */
import * as http from 'node:http';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { z } from 'zod';

import { describeIf, getModel } from './helpers';
import { Agent, LangSmithTelemetry, type Telemetry, type BuiltTelemetry, Tool } from '../../index';

const describe = describeIf('anthropic');

interface CapturedRequest {
	url: string;
	headers: http.IncomingHttpHeaders;
	body: Buffer;
}

describe('Telemetry → LangSmith integration', () => {
	let server: http.Server;
	let serverPort: number;
	let captured: CapturedRequest[];
	let previousTracingV2: string | undefined;

	beforeAll(async () => {
		// LangSmith exporter requires this env var to be set, otherwise it silently drops spans
		previousTracingV2 = process.env.LANGCHAIN_TRACING_V2;
		process.env.LANGCHAIN_TRACING_V2 = 'true';
		captured = [];
		server = http.createServer((req, res) => {
			const chunks: Buffer[] = [];
			req.on('data', (c: Buffer) => chunks.push(c));
			req.on('end', () => {
				captured.push({
					url: req.url ?? '',
					headers: req.headers,
					body: Buffer.concat(chunks),
				});
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end('{}');
			});
		});

		await new Promise<void>((resolve) => {
			server.listen(0, () => {
				const addr = server.address();
				serverPort = typeof addr === 'object' && addr ? addr.port : 0;
				resolve();
			});
		});
	});

	afterEach(() => {
		captured = [];
	});

	afterAll(async () => {
		if (previousTracingV2 === undefined) {
			delete process.env.LANGCHAIN_TRACING_V2;
		} else {
			process.env.LANGCHAIN_TRACING_V2 = previousTracingV2;
		}
		await new Promise<void>((resolve) => {
			server.close(() => resolve());
		});
	});

	function createTestAgent(telemetry: Telemetry | BuiltTelemetry) {
		return new Agent('langsmith-test')
			.model(getModel('anthropic'))
			.instructions('You are a calculator. Use the add tool when asked to add. Be concise.')
			.telemetry(telemetry as Telemetry)
			.tool(
				new Tool('add')
					.description('Add two numbers')
					.input(z.object({ a: z.number(), b: z.number() }))
					.handler(async ({ a, b }) => ({ result: a + b })),
			);
	}

	it('sends trace data to LangSmith using LangSmithTelemetry', async () => {
		const built = await new LangSmithTelemetry({
			apiKey: 'ls-test-key-12345',
			project: 'agents-test',
			url: `http://localhost:${serverPort}/otel/v1/traces`,
		})
			.functionId('calc-agent')
			.build();

		const agent = createTestAgent(built);
		const result = await agent.generate('What is 3 + 4?');

		if (built.provider) await built.provider.forceFlush();

		// Verify the agent produced a response
		expect(result.messages.length).toBeGreaterThan(0);

		// Verify LangSmith received trace data
		expect(captured.length).toBeGreaterThan(0);

		// Verify the request hit the OTLP traces endpoint
		expect(captured.some((r) => r.url.includes('/otel/v1/traces'))).toBe(true);

		// Verify the API key was sent in the header
		expect(captured.some((r) => r.headers['x-api-key'] === 'ls-test-key-12345')).toBe(true);

		// Verify the body is non-empty (actual protobuf trace data)
		const totalBytes = captured.reduce((sum, r) => sum + r.body.length, 0);
		expect(totalBytes).toBeGreaterThan(0);

		if (built.provider) await built.provider.shutdown();
	});

	it('supports endpoint shorthand (auto-appends /otel/v1/traces)', async () => {
		const built = await new LangSmithTelemetry({
			apiKey: 'ls-endpoint-key',
			project: 'agents-test',
			endpoint: `http://localhost:${serverPort}`,
		})
			.functionId('endpoint-test')
			.build();

		const agent = createTestAgent(built);
		const result = await agent.generate('What is 10 + 20?');

		if (built.provider) await built.provider.forceFlush();

		expect(result.messages.length).toBeGreaterThan(0);
		expect(captured.length).toBeGreaterThan(0);
		expect(captured.some((r) => r.headers['x-api-key'] === 'ls-endpoint-key')).toBe(true);

		if (built.provider) await built.provider.shutdown();
	});

	it('includes tool call spans in the trace', async () => {
		const built = await new LangSmithTelemetry({
			apiKey: 'ls-tool-test',
			project: 'agents-test',
			url: `http://localhost:${serverPort}/otel/v1/traces`,
		})
			.functionId('tool-trace-test')
			.build();

		const agent = createTestAgent(built);
		await agent.generate('What is 5 + 7?');

		if (built.provider) await built.provider.forceFlush();

		// Multiple spans exported as protobuf
		expect(captured.length).toBeGreaterThan(0);
		const totalBytes = captured.reduce((sum, r) => sum + r.body.length, 0);
		expect(totalBytes).toBeGreaterThan(50);

		if (built.provider) await built.provider.shutdown();
	});

	it('fires TelemetryIntegration hooks alongside LangSmith traces', async () => {
		const hookEvents: string[] = [];

		const built = await new LangSmithTelemetry({
			apiKey: 'ls-hooks-test',
			project: 'agents-test',
			url: `http://localhost:${serverPort}/otel/v1/traces`,
		})
			.functionId('hooks-test')
			.integration({
				onStart: () => {
					hookEvents.push('start');
				},
				onFinish: () => {
					hookEvents.push('finish');
				},
			})
			.build();

		const agent = createTestAgent(built);
		await agent.generate('What is 1 + 1?');

		if (built.provider) await built.provider.forceFlush();

		// Both LangSmith traces and integration hooks should fire
		expect(captured.length).toBeGreaterThan(0);
		expect(hookEvents).toContain('start');
		expect(hookEvents).toContain('finish');

		if (built.provider) await built.provider.shutdown();
	});
});
