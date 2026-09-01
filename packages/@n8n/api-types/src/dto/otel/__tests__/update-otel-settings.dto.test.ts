import { TestOtelTraceDto } from '../test-otel-trace.dto';
import { UpdateOtelSettingsDto } from '../update-otel-settings.dto';

const validSettings = {
	enabled: true,
	exporterProtocol: 'http/protobuf',
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

// `exporterProtocol` was added after the PUT endpoint shipped, so it carries a
// default instead of being required: a body written against the older API stays
// valid. Every other field must still be supplied explicitly.
const defaultedFields = ['exporterProtocol'];

describe('UpdateOtelSettingsDto', () => {
	it('requires every field except the defaulted ones (so a partial body is rejected)', () => {
		const result = UpdateOtelSettingsDto.safeParse({});

		assert(!result.success, 'Expected validation to fail for an empty body');

		// An empty body must report every non-defaulted field as missing. A field
		// that gains a default parses successfully instead of erroring, so it must
		// be listed in `defaultedFields` deliberately — this keeps the public API
		// PUT from silently resetting fields a client did not mean to omit.
		const missing = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))].sort();
		expect(missing).toEqual(
			Object.keys(validSettings)
				.filter((key) => !defaultedFields.includes(key))
				.sort(),
		);
	});

	it('defaults the exporter protocol when omitted (body predates the field)', () => {
		const { exporterProtocol: _omitted, ...withoutProtocol } = validSettings;

		const result = UpdateOtelSettingsDto.safeParse(withoutProtocol);

		assert(result.success, 'Expected a body without exporterProtocol to stay valid');
		expect(result.data.exporterProtocol).toBe('http/protobuf');
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

	it.each(['http/protobuf', 'grpc'])('accepts the %s exporter protocol', (exporterProtocol) => {
		const result = UpdateOtelSettingsDto.safeParse({ ...validSettings, exporterProtocol });

		assert(result.success, `Expected ${exporterProtocol} to be a valid exporter protocol`);
		expect(result.data.exporterProtocol).toBe(exporterProtocol);
	});

	it.each(['http/json', 'HTTP/PROTOBUF', 'http', 'gRPC', ''])(
		'rejects %p as an exporter protocol',
		(exporterProtocol) => {
			const result = UpdateOtelSettingsDto.safeParse({ ...validSettings, exporterProtocol });

			assert(!result.success, `Expected ${exporterProtocol} to be an invalid exporter protocol`);
			expect(result.error.issues).toContainEqual(
				expect.objectContaining({
					code: 'invalid_enum_value',
					path: ['exporterProtocol'],
				}),
			);
		},
	);

	// The scheme selects TLS, so it must be explicit. Everything rejected here
	// already fails at export time, so no working configuration stops validating.
	// Schemes are matched case-insensitively (RFC 3986) and the value is stored
	// verbatim — the scheme is lowercased later, before it reaches the exporter.
	it.each([
		'http://localhost:4318',
		'https://collector.example.com:4317',
		'http://[::1]:4317',
		'HTTP://localhost:4318',
		'HttpS://collector.example.com:4317',
	])('accepts %p as an exporter endpoint', (exporterEndpoint) => {
		const result = UpdateOtelSettingsDto.safeParse({ ...validSettings, exporterEndpoint });

		assert(result.success, `Expected ${exporterEndpoint} to be a valid exporter endpoint`);
		expect(result.data.exporterEndpoint).toBe(exporterEndpoint);
	});

	it.each(['localhost:4318', 'grpc://host:4317', 'ftp://x'])(
		'rejects %p as an exporter endpoint',
		(exporterEndpoint) => {
			const result = UpdateOtelSettingsDto.safeParse({ ...validSettings, exporterEndpoint });

			assert(!result.success, `Expected ${exporterEndpoint} to be an invalid exporter endpoint`);
			expect(result.error.issues).toContainEqual(
				expect.objectContaining({ path: ['exporterEndpoint'] }),
			);
		},
	);

	it('explains why a non-http endpoint scheme is rejected', () => {
		const result = UpdateOtelSettingsDto.safeParse({
			...validSettings,
			exporterEndpoint: 'grpc://host:4317',
		});

		assert(!result.success, 'Expected validation to fail for a grpc:// exporter endpoint');
		expect(result.error.issues).toContainEqual(
			expect.objectContaining({
				code: 'invalid_string',
				validation: 'regex',
				path: ['exporterEndpoint'],
				message: 'Endpoint must start with http:// or https://. The scheme selects TLS.',
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
		exporterProtocol: 'http/protobuf',
		exporterEndpoint: 'http://localhost:4318',
		exporterTracingPath: '/v1/traces',
		exporterServiceName: 'n8n',
		exporterHeaders: '',
		startupConnectivityTimeoutMs: 2_000,
	};

	it('requires every connection field except the defaulted ones (stays strict)', () => {
		const result = TestOtelTraceDto.safeParse({});

		assert(!result.success, 'Expected validation to fail for an empty body');

		const missing = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))].sort();
		expect(missing).toEqual(
			Object.keys(validConnection)
				.filter((key) => !defaultedFields.includes(key))
				.sort(),
		);
	});

	it('accepts a full connection body', () => {
		const result = TestOtelTraceDto.safeParse(validConnection);
		expect(result.success).toBe(true);
	});

	it('defaults the exporter protocol when omitted (body predates the field)', () => {
		const { exporterProtocol: _omitted, ...withoutProtocol } = validConnection;

		const result = TestOtelTraceDto.safeParse(withoutProtocol);

		assert(result.success, 'Expected a connection body without exporterProtocol to stay valid');
		expect(result.data.exporterProtocol).toBe('http/protobuf');
	});

	it('accepts a gRPC connection body', () => {
		const result = TestOtelTraceDto.safeParse({
			...validConnection,
			exporterProtocol: 'grpc',
			exporterEndpoint: 'http://localhost:4317',
		});

		assert(result.success, 'Expected a gRPC connection body to be valid');
		expect(result.data.exporterProtocol).toBe('grpc');
	});

	it('rejects an unsupported exporter protocol', () => {
		const result = TestOtelTraceDto.safeParse({
			...validConnection,
			exporterProtocol: 'http/json',
		});

		assert(!result.success, 'Expected validation to fail for an unsupported exporter protocol');
		expect(result.error.issues).toContainEqual(
			expect.objectContaining({
				code: 'invalid_enum_value',
				path: ['exporterProtocol'],
			}),
		);
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

	// This DTO picks the endpoint field from `UpdateOtelSettingsDto`, so the same
	// scheme rule must hold on the test-trace body, case-insensitivity included.
	it.each([
		'http://localhost:4318',
		'https://collector.example.com:4317',
		'http://[::1]:4317',
		'HTTP://localhost:4318',
		'HttpS://collector.example.com:4317',
	])('accepts %p as an exporter endpoint', (exporterEndpoint) => {
		const result = TestOtelTraceDto.safeParse({ ...validConnection, exporterEndpoint });

		assert(result.success, `Expected ${exporterEndpoint} to be a valid exporter endpoint`);
		expect(result.data.exporterEndpoint).toBe(exporterEndpoint);
	});

	it.each(['localhost:4318', 'grpc://host:4317', 'ftp://x'])(
		'rejects %p as an exporter endpoint',
		(exporterEndpoint) => {
			const result = TestOtelTraceDto.safeParse({ ...validConnection, exporterEndpoint });

			assert(!result.success, `Expected ${exporterEndpoint} to be an invalid exporter endpoint`);
			expect(result.error.issues).toContainEqual(
				expect.objectContaining({ path: ['exporterEndpoint'] }),
			);
		},
	);
});
