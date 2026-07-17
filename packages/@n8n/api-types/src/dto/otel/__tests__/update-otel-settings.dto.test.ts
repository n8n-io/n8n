import { TestOtelConnectionDto } from '../test-otel-connection.dto';
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
		expect(result.success).toBe(false);

		// An empty body must report every field as missing. A field that carries a
		// default would parse successfully instead of erroring — this guards the
		// public API PUT against silently resetting omitted fields.
		const missing = result.success
			? []
			: [...new Set(result.error.issues.map((issue) => String(issue.path[0])))].sort();
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
		expect(result.success).toBe(false);
	});

	it('rejects a sample rate outside the 0..1 range', () => {
		const result = UpdateOtelSettingsDto.safeParse({ ...validSettings, tracesSampleRate: 2 });
		expect(result.success).toBe(false);
	});
});

describe('TestOtelConnectionDto', () => {
	const validConnection = {
		exporterEndpoint: 'http://localhost:4318',
		exporterTracingPath: '/v1/traces',
		exporterServiceName: 'n8n',
		exporterHeaders: '',
		startupConnectivityTimeoutMs: 2_000,
	};

	it('requires every connection field (stays strict)', () => {
		const result = TestOtelConnectionDto.safeParse({});
		expect(result.success).toBe(false);

		const missing = result.success
			? []
			: [...new Set(result.error.issues.map((issue) => String(issue.path[0])))].sort();
		expect(missing).toEqual(Object.keys(validConnection).sort());
	});

	it('accepts a full connection body', () => {
		const result = TestOtelConnectionDto.safeParse(validConnection);
		expect(result.success).toBe(true);
	});
});
