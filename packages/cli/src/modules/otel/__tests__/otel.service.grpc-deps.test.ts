import type { Metadata } from '@grpc/grpc-js';
import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { OtelConnectionParams, OtelSettingsService } from '../otel-settings.service';
import { OtelService } from '../otel.service';

// Only the gRPC exporter is mocked, so that grpc-js stays real: its metadata
// rules are stricter than any stand-in (a `-bin` key also rejects string
// values), and the warn-and-skip behaviour must hold against the real class.
const { exporterOptions } = vi.hoisted(() => ({
	exporterOptions: [] as Array<{ url: string; metadata: Metadata }>,
}));

vi.mock('@opentelemetry/exporter-trace-otlp-grpc', () => ({
	OTLPTraceExporter: vi.fn().mockImplementation(function (options: {
		url: string;
		metadata: Metadata;
	}) {
		exporterOptions.push(options);
		return {
			export: (_spans: unknown[], resultCallback: (result: { error?: Error }) => void) =>
				resultCallback({}),
			shutdown: async () => {},
		};
	}),
}));

const grpcConnection: OtelConnectionParams = {
	exporterProtocol: 'grpc',
	exporterEndpoint: 'https://collector.example.com:4317',
	exporterTracingPath: '/v1/traces',
	exporterServiceName: 'n8n-prod',
	exporterHeaders: '',
	startupConnectivityTimeoutMs: 3_000,
};

describe('OtelService with real gRPC dependencies', () => {
	let logger: ReturnType<typeof mock<Logger>>;
	let service: OtelService;

	beforeEach(() => {
		vi.clearAllMocks();
		exporterOptions.length = 0;
		logger = mock<Logger>();
		service = new OtelService(
			mock<OtelSettingsService>(),
			mock<InstanceSettings>({ instanceId: 'inst-1', instanceType: 'main' }),
			logger,
			mock<OutboundHttp>(),
		);
	});

	async function exportWithHeaders(exporterHeaders: string) {
		const result = await service.sendTestTrace({ ...grpcConnection, exporterHeaders });

		return { result, metadata: exporterOptions[0].metadata };
	}

	describe('gRPC metadata', () => {
		it('lowercases header keys grpc-js accepts', async () => {
			const { metadata } = await exportWithHeaders('Authorization=Bearer abc,X-Tenant=acme');

			expect(metadata.getMap()).toEqual({ authorization: 'Bearer abc', 'x-tenant': 'acme' });
		});

		it('warns and skips a header key with illegal characters', async () => {
			const { result, metadata } = await exportWithHeaders('bad key=value,x-tenant=acme');

			expect(metadata.getMap()).toEqual({ 'x-tenant': 'acme' });
			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('bad key'));
			expect(result).toEqual({ success: true });
		});

		it('warns and skips a "-bin" header key, which grpc-js allows only for buffers', async () => {
			const { result, metadata } = await exportWithHeaders('x-token-bin=abc,x-tenant=acme');

			expect(metadata.getMap()).toEqual({ 'x-tenant': 'acme' });
			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('x-token-bin'));
			expect(result).toEqual({ success: true });
		});
	});

	// The gRPC packages are imported at exporter construction, so a missing or
	// renamed dependency surfaces only when an instance runs on gRPC.
	it('resolves the lazily imported gRPC exporter and grpc-js', async () => {
		const exporterModule = await vi.importActual<
			typeof import('@opentelemetry/exporter-trace-otlp-grpc')
		>('@opentelemetry/exporter-trace-otlp-grpc');
		const grpcModule = await vi.importActual<typeof import('@grpc/grpc-js')>('@grpc/grpc-js');

		expect(exporterModule.OTLPTraceExporter).toBeInstanceOf(Function);
		expect(grpcModule.Metadata).toBeInstanceOf(Function);
		expect(grpcModule.Client).toBeInstanceOf(Function);
	});
});
