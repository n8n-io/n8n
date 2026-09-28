import type { BuiltTelemetry } from '../../../types/telemetry';

/** Fake OTel span recording end/exception/status/attribute calls for assertions. */
export function fakeSpan() {
	return {
		end: vi.fn(),
		recordException: vi.fn(),
		setStatus: vi.fn(),
		setAttributes: vi.fn(),
	};
}

/** Fake OTel tracer whose `startActiveSpan` immediately runs `fn(span)` against the given span. */
export function fakeTracer(span: ReturnType<typeof fakeSpan>) {
	return {
		startActiveSpan: vi.fn(async (_name: string, _options: unknown, fn: unknown) => {
			const spanFn = fn as (spanValue: ReturnType<typeof fakeSpan>) => Promise<unknown>;
			return await spanFn(span);
		}),
	};
}

/** `BuiltTelemetry` with sane defaults (enabled, recording); override any field per test. */
export function builtTelemetry(overrides: Partial<BuiltTelemetry> = {}): BuiltTelemetry {
	return {
		enabled: true,
		recordInputs: true,
		recordOutputs: true,
		integrations: [],
		...overrides,
	};
}
