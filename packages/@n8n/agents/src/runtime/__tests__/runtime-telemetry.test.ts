import type { BuiltTool } from '../../types/sdk/tool';
import type { BuiltTelemetry } from '../../types/telemetry';
import type { AgentRuntimeConfig } from '../loop/agent-runtime';
import { RuntimeTelemetry } from '../telemetry/runtime-telemetry';

function builtTelemetry(overrides: Partial<BuiltTelemetry> = {}): BuiltTelemetry {
	return {
		enabled: true,
		recordInputs: true,
		recordOutputs: true,
		integrations: [],
		...overrides,
	};
}

describe('RuntimeTelemetry.resolve()', () => {
	it('stamps own telemetry with the runtime name only when it lacks a functionId, without mutating the config', () => {
		const telemetry = builtTelemetry();
		const config = { name: 'my-agent', telemetry } as AgentRuntimeConfig;
		const runtimeTelemetry = new RuntimeTelemetry(config);

		expect(runtimeTelemetry.resolve(undefined)?.functionId).toBe('my-agent');
		expect(telemetry.functionId).toBeUndefined();

		const explicit = builtTelemetry({ functionId: 'explicit-id' });
		const explicitRuntime = new RuntimeTelemetry({
			name: 'my-agent',
			telemetry: explicit,
		} as AgentRuntimeConfig);
		expect(explicitRuntime.resolve(undefined)?.functionId).toBe('explicit-id');
	});

	it('re-labels inherited telemetry with the runtime name', () => {
		const inherited = builtTelemetry({ functionId: 'parent-agent' });
		const config = { name: 'child-agent' } as AgentRuntimeConfig;
		const runtimeTelemetry = new RuntimeTelemetry(config);

		expect(runtimeTelemetry.resolve({ telemetry: inherited })?.functionId).toBe('child-agent');
		expect(runtimeTelemetry.resolve(undefined)).toBeUndefined();
	});
});

function fakeSpan() {
	return {
		end: vi.fn(),
		recordException: vi.fn(),
		setStatus: vi.fn(),
		setAttributes: vi.fn(),
	};
}

function fakeTracer(span: ReturnType<typeof fakeSpan>) {
	return {
		startActiveSpan: vi.fn(async (_name: string, _options: unknown, fn: unknown) => {
			const spanFn = fn as (spanValue: ReturnType<typeof fakeSpan>) => Promise<unknown>;
			return await spanFn(span);
		}),
	};
}

describe('RuntimeTelemetry.withRootSpan()', () => {
	it('falls through to fn() without starting a span when telemetry is disabled, root span is off, or the tracer is not active-span-capable', async () => {
		const config = { name: 'my-agent' } as AgentRuntimeConfig;
		const runtimeTelemetry = new RuntimeTelemetry(config);

		const disabled = builtTelemetry({ enabled: false, tracer: fakeTracer(fakeSpan()) });
		await expect(
			runtimeTelemetry.withRootSpan(
				'generate',
				{ telemetry: disabled },
				'run-1',
				async () => await Promise.resolve('ok'),
			),
		).resolves.toBe('ok');

		const rootSpanOff = builtTelemetry({
			runtimeRootSpanEnabled: false,
			tracer: fakeTracer(fakeSpan()),
		});
		await expect(
			runtimeTelemetry.withRootSpan(
				'generate',
				{ telemetry: rootSpanOff },
				'run-1',
				async () => await Promise.resolve('ok'),
			),
		).resolves.toBe('ok');

		const noTracer = builtTelemetry();
		await expect(
			runtimeTelemetry.withRootSpan(
				'generate',
				{ telemetry: noTracer },
				'run-1',
				async () => await Promise.resolve('ok'),
			),
		).resolves.toBe('ok');
	});

	it('starts a root span with root: true and generic gen_ai.* attributes, without langsmith.* noise', async () => {
		const span = fakeSpan();
		const tracer = fakeTracer(span);
		const telemetry = builtTelemetry({ tracer, metadata: { model_id: 'openai/gpt-4o-mini' } });
		const config = { name: 'my-agent' } as AgentRuntimeConfig;
		const runtimeTelemetry = new RuntimeTelemetry(config);

		await runtimeTelemetry.withRootSpan(
			'generate',
			{ telemetry },
			'run-1',
			async () => await Promise.resolve('ok'),
		);

		expect(tracer.startActiveSpan).toHaveBeenCalledTimes(1);
		const [name, options] = tracer.startActiveSpan.mock.calls[0];
		expect(name).toBe('my-agent.generate');
		expect(options).toMatchObject({ root: true });
		expect(options).not.toHaveProperty('links');

		const attributes = (options as { attributes: Record<string, unknown> }).attributes;
		expect(attributes).toMatchObject({
			'gen_ai.operation.name': 'invoke_agent',
			'gen_ai.agent.name': 'my-agent',
			'gen_ai.request.model': 'openai/gpt-4o-mini',
		});
		expect(Object.keys(attributes).some((key) => key.startsWith('langsmith.'))).toBe(false);
		expect(span.end).toHaveBeenCalledTimes(1);
	});

	it('passes links through to the tracer only when provided', async () => {
		const tracer = fakeTracer(fakeSpan());
		const telemetry = builtTelemetry({ tracer });
		const config = { name: 'my-agent' } as AgentRuntimeConfig;
		const runtimeTelemetry = new RuntimeTelemetry(config);
		const links = [{ context: 'fake-span-context' }];

		await runtimeTelemetry.withRootSpan(
			'stream',
			{ telemetry },
			'run-1',
			async () => await Promise.resolve('ok'),
			links,
		);

		const [, options] = tracer.startActiveSpan.mock.calls[0];
		expect((options as { links?: unknown }).links).toBe(links);
	});

	it('adds langsmith.* attributes only when telemetry.isLangSmith is set', async () => {
		const span = fakeSpan();
		const tracer = fakeTracer(span);
		const telemetry = builtTelemetry({ tracer, isLangSmith: true });
		const config = { name: 'my-agent' } as AgentRuntimeConfig;
		const runtimeTelemetry = new RuntimeTelemetry(config);

		await runtimeTelemetry.withRootSpan(
			'generate',
			{ telemetry },
			'run-1',
			async () => await Promise.resolve('ok'),
		);

		const [, options] = tracer.startActiveSpan.mock.calls[0];
		const attributes = (options as { attributes: Record<string, unknown> }).attributes;
		expect(attributes).toMatchObject({
			'langsmith.traceable': 'true',
			'langsmith.trace.name': 'my-agent.generate',
			'langsmith.span.kind': 'chain',
			'langsmith.metadata.agent_name': 'my-agent',
			'langsmith.metadata.agent_run_id': 'run-1',
		});
	});

	it('adds gen_ai.conversation.id when metadata carries a string thread_id', async () => {
		const tracer = fakeTracer(fakeSpan());
		const telemetry = builtTelemetry({ tracer, metadata: { thread_id: 'thread-abc' } });
		const config = { name: 'my-agent' } as AgentRuntimeConfig;
		const runtimeTelemetry = new RuntimeTelemetry(config);

		await runtimeTelemetry.withRootSpan(
			'generate',
			{ telemetry },
			'run-1',
			async () => await Promise.resolve('ok'),
		);

		const [, options] = tracer.startActiveSpan.mock.calls[0];
		const attributes = (options as { attributes: Record<string, unknown> }).attributes;
		expect(attributes).toMatchObject({ 'gen_ai.conversation.id': 'thread-abc' });
	});

	it('omits gen_ai.prompt when the tool summary cannot be JSON-stringified', async () => {
		const tracer = fakeTracer(fakeSpan());
		const telemetry = builtTelemetry({ tracer });
		const circularSchema: Record<string, unknown> = {};
		circularSchema.self = circularSchema;
		const config = {
			name: 'my-agent',
			tools: [{ name: 'circular-tool', inputSchema: circularSchema } as unknown as BuiltTool],
		} as AgentRuntimeConfig;
		const runtimeTelemetry = new RuntimeTelemetry(config);

		await runtimeTelemetry.withRootSpan(
			'generate',
			{ telemetry },
			'run-1',
			async () => await Promise.resolve('ok'),
		);

		const [, options] = tracer.startActiveSpan.mock.calls[0];
		const attributes = (options as { attributes: Record<string, unknown> }).attributes;
		expect(attributes).not.toHaveProperty('gen_ai.prompt');
	});

	it('filters out non-string tool names when building the LangSmith tool catalog', async () => {
		const tracer = fakeTracer(fakeSpan());
		const telemetry = builtTelemetry({ tracer, isLangSmith: true });
		const config = {
			name: 'my-agent',
			tools: [
				{ name: 'valid-tool', description: 'ok' } as unknown as BuiltTool,
				// A tool name that isn't a string shouldn't normally occur (BuiltTool.name
				// is typed as string), but the catalog builder guards against it defensively.
				{ name: 123 as unknown as string, description: 'bad' } as unknown as BuiltTool,
			],
		} as AgentRuntimeConfig;
		const runtimeTelemetry = new RuntimeTelemetry(config);

		await runtimeTelemetry.withRootSpan(
			'generate',
			{ telemetry },
			'run-1',
			async () => await Promise.resolve('ok'),
		);

		const [, options] = tracer.startActiveSpan.mock.calls[0];
		const attributes = (options as { attributes: Record<string, unknown> }).attributes;
		expect(attributes).toMatchObject({
			'langsmith.metadata.available_tools': ['valid-tool'],
		});
	});

	it('falls back to the runtime name for the span name when resolved telemetry has no functionId', async () => {
		const tracer = fakeTracer(fakeSpan());
		const telemetry = builtTelemetry({ tracer, functionId: undefined });
		const config = { name: 'fallback-agent' } as AgentRuntimeConfig;
		const runtimeTelemetry = new RuntimeTelemetry(config);
		// resolve() always stamps a functionId when it returns telemetry, so the
		// `?? this.config.name` fallback in withRootSpan is unreachable through
		// the real resolve() path — spy on it to inject telemetry that skips
		// that stamping, exercising the fallback directly.
		vi.spyOn(runtimeTelemetry, 'resolve').mockReturnValue(telemetry);

		await runtimeTelemetry.withRootSpan(
			'generate',
			undefined,
			'run-1',
			async () => await Promise.resolve('ok'),
		);

		const [name] = tracer.startActiveSpan.mock.calls[0];
		expect(name).toBe('fallback-agent.generate');
	});

	it('records the exception, sets error status, and rethrows when fn() throws', async () => {
		const span = fakeSpan();
		const tracer = fakeTracer(span);
		const telemetry = builtTelemetry({ tracer });
		const config = { name: 'my-agent' } as AgentRuntimeConfig;
		const runtimeTelemetry = new RuntimeTelemetry(config);
		const error = new Error('boom');

		await expect(
			runtimeTelemetry.withRootSpan('generate', { telemetry }, 'run-1', () => {
				throw error;
			}),
		).rejects.toThrow('boom');

		expect(span.recordException).toHaveBeenCalledWith(error);
		expect(span.setStatus).toHaveBeenCalledWith({ code: 2, message: String(error) });
		expect(span.end).toHaveBeenCalledTimes(1);
	});
});

describe('RuntimeTelemetry.withToolSpan()', () => {
	it('falls through to fn() without starting a span when telemetry is disabled or the tracer is not active-span-capable', async () => {
		const config = { name: 'my-agent' } as AgentRuntimeConfig;
		const runtimeTelemetry = new RuntimeTelemetry(config);

		const disabled = builtTelemetry({ enabled: false, tracer: fakeTracer(fakeSpan()) });
		await expect(
			runtimeTelemetry.withToolSpan(
				'tc1',
				'my-tool',
				{ x: 1 },
				disabled,
				async () => await Promise.resolve('ok'),
			),
		).resolves.toBe('ok');

		const noTracer = builtTelemetry();
		await expect(
			runtimeTelemetry.withToolSpan(
				'tc1',
				'my-tool',
				{ x: 1 },
				noTracer,
				async () => await Promise.resolve('ok'),
			),
		).resolves.toBe('ok');
	});

	it('names the span execute_tool {toolName} and carries generic gen_ai.tool.* attributes', async () => {
		const span = fakeSpan();
		const tracer = fakeTracer(span);
		const telemetry = builtTelemetry({ tracer });
		const config = { name: 'my-agent' } as AgentRuntimeConfig;
		const runtimeTelemetry = new RuntimeTelemetry(config);

		await runtimeTelemetry.withToolSpan(
			'tc1',
			'my-tool',
			{ x: 1 },
			telemetry,
			async () => await Promise.resolve({ ok: true }),
		);

		expect(tracer.startActiveSpan).toHaveBeenCalledTimes(1);
		const [name, options] = tracer.startActiveSpan.mock.calls[0];
		expect(name).toBe('execute_tool my-tool');

		const attributes = (options as { attributes: Record<string, unknown> }).attributes;
		expect(attributes).toMatchObject({
			'gen_ai.operation.name': 'execute_tool',
			'gen_ai.tool.name': 'my-tool',
			'gen_ai.tool.call.id': 'tc1',
			'gen_ai.agent.name': 'my-agent',
			'gen_ai.tool.call.arguments': '{"x":1}',
		});
		expect(span.setAttributes).toHaveBeenCalledWith(
			expect.objectContaining({ 'gen_ai.tool.call.result': '{"ok":true}' }),
		);
		expect(span.end).toHaveBeenCalledTimes(1);
	});

	it('respects recordInputs/recordOutputs when set to false', async () => {
		const span = fakeSpan();
		const tracer = fakeTracer(span);
		const telemetry = builtTelemetry({
			tracer,
			recordInputs: false,
			recordOutputs: false,
		});
		const config = { name: 'my-agent' } as AgentRuntimeConfig;
		const runtimeTelemetry = new RuntimeTelemetry(config);

		await runtimeTelemetry.withToolSpan(
			'tc1',
			'my-tool',
			{ x: 1 },
			telemetry,
			async () => await Promise.resolve({ ok: true }),
		);

		const [, options] = tracer.startActiveSpan.mock.calls[0];
		const attributes = (options as { attributes: Record<string, unknown> }).attributes;
		expect(attributes).not.toHaveProperty('gen_ai.tool.call.arguments');
		expect(attributes).not.toHaveProperty('ai.toolCall.args');
		expect(span.setAttributes).not.toHaveBeenCalled();
	});

	it('records outputs but not inputs when only recordInputs is false', async () => {
		const span = fakeSpan();
		const tracer = fakeTracer(span);
		const telemetry = builtTelemetry({ tracer, recordInputs: false, recordOutputs: true });
		const config = { name: 'my-agent' } as AgentRuntimeConfig;
		const runtimeTelemetry = new RuntimeTelemetry(config);

		await runtimeTelemetry.withToolSpan(
			'tc1',
			'my-tool',
			{ x: 1 },
			telemetry,
			async () => await Promise.resolve({ ok: true }),
		);

		const [, options] = tracer.startActiveSpan.mock.calls[0];
		const attributes = (options as { attributes: Record<string, unknown> }).attributes;
		expect(attributes).not.toHaveProperty('gen_ai.tool.call.arguments');
		expect(attributes).not.toHaveProperty('ai.toolCall.args');
		expect(span.setAttributes).toHaveBeenCalledWith({
			'ai.toolCall.result': '{"ok":true}',
			'gen_ai.tool.call.result': '{"ok":true}',
		});
	});

	it('records inputs but not outputs when only recordOutputs is false', async () => {
		const span = fakeSpan();
		const tracer = fakeTracer(span);
		const telemetry = builtTelemetry({ tracer, recordInputs: true, recordOutputs: false });
		const config = { name: 'my-agent' } as AgentRuntimeConfig;
		const runtimeTelemetry = new RuntimeTelemetry(config);

		await runtimeTelemetry.withToolSpan(
			'tc1',
			'my-tool',
			{ x: 1 },
			telemetry,
			async () => await Promise.resolve({ ok: true }),
		);

		const [, options] = tracer.startActiveSpan.mock.calls[0];
		const attributes = (options as { attributes: Record<string, unknown> }).attributes;
		expect(attributes).toMatchObject({
			'gen_ai.tool.call.arguments': '{"x":1}',
			'ai.toolCall.args': '{"x":1}',
		});
		expect(span.setAttributes).not.toHaveBeenCalled();
	});

	it('defaults to recording inputs and outputs when recordInputs/recordOutputs are absent from the telemetry object', async () => {
		const span = fakeSpan();
		const tracer = fakeTracer(span);
		// BuiltTelemetry declares these as non-optional booleans, but the
		// `?? true` fallback in withToolSpan guards against a telemetry object
		// that doesn't actually carry them at runtime — construct one directly
		// to exercise that fallback rather than the declared type.
		const {
			recordInputs: _recordInputs,
			recordOutputs: _recordOutputs,
			...rest
		} = builtTelemetry({
			tracer,
		});
		const telemetry = rest as unknown as BuiltTelemetry;
		const config = { name: 'my-agent' } as AgentRuntimeConfig;
		const runtimeTelemetry = new RuntimeTelemetry(config);

		await runtimeTelemetry.withToolSpan(
			'tc1',
			'my-tool',
			{ x: 1 },
			telemetry,
			async () => await Promise.resolve({ ok: true }),
		);

		const [, options] = tracer.startActiveSpan.mock.calls[0];
		const attributes = (options as { attributes: Record<string, unknown> }).attributes;
		expect(attributes).toMatchObject({
			'gen_ai.tool.call.arguments': '{"x":1}',
			'ai.toolCall.args': '{"x":1}',
		});
		expect(span.setAttributes).toHaveBeenCalledWith({
			'ai.toolCall.result': '{"ok":true}',
			'gen_ai.tool.call.result': '{"ok":true}',
		});
	});

	it('records the exception, sets error status, and rethrows when fn() throws', async () => {
		const span = fakeSpan();
		const tracer = fakeTracer(span);
		const telemetry = builtTelemetry({ tracer });
		const config = { name: 'my-agent' } as AgentRuntimeConfig;
		const runtimeTelemetry = new RuntimeTelemetry(config);
		const error = new Error('tool boom');

		await expect(
			runtimeTelemetry.withToolSpan('tc1', 'my-tool', { x: 1 }, telemetry, () => {
				throw error;
			}),
		).rejects.toThrow('tool boom');

		expect(span.recordException).toHaveBeenCalledWith(error);
		expect(span.setStatus).toHaveBeenCalledWith({ code: 2, message: String(error) });
		expect(span.end).toHaveBeenCalledTimes(1);
	});
});
