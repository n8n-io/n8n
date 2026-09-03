import { TestOtelTraceDto } from '../test-otel-trace.dto';
import { UpdateOtelSettingsDto } from '../update-otel-settings.dto';

const validSettings = {
	enabled: true,
	exporterEndpoint: 'http://localhost:4318',
	exporterTracingPath: '/v1/traces',
	exporterServiceName: 'n8n',
	exporterHeaders: '',
	tracesSampleRate: 1,
	startupConnectivityTimeoutMs: 2_000,
	includeNodeSpans: true,
	injectOutbound: true,
	productionExecutionsOnly: true,
};

describe('UpdateOtelSettingsDto', () => {
	it('requires every field (stays strict, so a partial body is rejected)', () => {
		const result = UpdateOtelSettingsDto.safeParse({});

		assert(!result.success, 'Expected validation to fail for an empty body');

		// An empty body must report every field as missing. A field that carries a
		// default would parse successfully instead of erroring — this guards the
		// public API PUT against silently resetting omitted fields.
		const missing = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))].sort();
		expect(missing).toEqual(Object.keys(validSettings).sort());
	});

	it('accepts a full body', () => {
		const result = UpdateOtelSettingsDto.safeParse(validSettings);
		expect(result.success).toBe(true);
	});

	it('rejects an invalid exporter endpoint', () => {
		const result = UpdateOtelSettingsDto.safeParse({
			...validSettings,
			exporterEndpoint: 'not-a-url',
		});

		assert(!result.success, 'Expected validation to fail for an invalid exporter endpoint');
		expect(result.error.issues).toContainEqual(
			expect.objectContaining({
				code: 'invalid_string',
				validation: 'url',
				path: ['exporterEndpoint'],
			}),
		);
	});

	it('rejects a sample rate outside the 0..1 range', () => {
		const result = UpdateOtelSettingsDto.safeParse({ ...validSettings, tracesSampleRate: 2 });

		assert(!result.success, 'Expected validation to fail for an out-of-range sample rate');
		expect(result.error.issues).toContainEqual(
			expect.objectContaining({
				code: 'too_big',
				maximum: 1,
				path: ['tracesSampleRate'],
			}),
		);
	});
});

describe('TestOtelTraceDto', () => {
	const validConnection = {
		exporterEndpoint: 'http://localhost:4318',
		exporterTracingPath: '/v1/traces',
		exporterServiceName: 'n8n',
		exporterHeaders: '',
		startupConnectivityTimeoutMs: 2_000,
	};

	it('requires every connection field (stays strict)', () => {
		const result = TestOtelTraceDto.safeParse({});

		assert(!result.success, 'Expected validation to fail for an empty body');

		const missing = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))].sort();
		expect(missing).toEqual(Object.keys(validConnection).sort());
	});

	it('accepts a full connection body', () => {
		const result = TestOtelTraceDto.safeParse(validConnection);
		expect(result.success).toBe(true);
	});

	it('rejects an invalid exporter endpoint', () => {
		const result = TestOtelTraceDto.safeParse({
			...validConnection,
			exporterEndpoint: 'not-a-url',
		});

		assert(!result.success, 'Expected validation to fail for an invalid exporter endpoint');
		expect(result.error.issues).toContainEqual(
			expect.objectContaining({
				code: 'invalid_string',
				validation: 'url',
				path: ['exporterEndpoint'],
			}),
		);
	});
});
