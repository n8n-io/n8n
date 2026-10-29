import { Container } from '@n8n/di';

import { OtelConfig, OtelCustomAttributesConfig } from '../otel.config';
import {
	CUSTOM_ATTRIBUTE_PREFIXES_ENV_VAR,
	DEFAULT_CUSTOM_ATTRIBUTE_PREFIXES,
	OTEL_ENV_VARS,
} from '../otel.constants';

const DEFAULT_ENDPOINT = 'http://localhost:4318';

describe('OtelConfig', () => {
	beforeEach(() => {
		Container.reset();
	});

	afterEach(() => {
		delete process.env[OTEL_ENV_VARS.exporterEndpoint];
		delete process.env[OTEL_ENV_VARS.exporterProtocol];
	});

	describe('exporterEndpoint', () => {
		it('defaults to the conventional OTLP/HTTP endpoint', () => {
			const { exporterEndpoint } = Container.get(OtelConfig);

			expect(exporterEndpoint).toBe(DEFAULT_ENDPOINT);
		});

		it.each([
			'http://localhost:4318',
			'https://collector.example.com:4317',
			'http://[::1]:4317',
			'HTTP://localhost:4318',
			'HttpS://collector.example.com:4317',
		])('accepts %p', (value) => {
			process.env[OTEL_ENV_VARS.exporterEndpoint] = value;

			const { exporterEndpoint } = Container.get(OtelConfig);

			expect(exporterEndpoint).toBe(value);
		});

		it.each(['localhost:4318', 'grpc://host:4317', 'ftp://x', 'not-a-url'])(
			'falls back to the default for %p',
			(value) => {
				process.env[OTEL_ENV_VARS.exporterEndpoint] = value;

				const { exporterEndpoint } = Container.get(OtelConfig);

				expect(exporterEndpoint).toBe(DEFAULT_ENDPOINT);
			},
		);
	});

	describe('exporterProtocol', () => {
		it('defaults to http/protobuf', () => {
			const { exporterProtocol } = Container.get(OtelConfig);

			expect(exporterProtocol).toBe('http/protobuf');
		});

		it.each(['http/protobuf', 'grpc'])('accepts %p', (value) => {
			process.env[OTEL_ENV_VARS.exporterProtocol] = value;

			const { exporterProtocol } = Container.get(OtelConfig);

			expect(exporterProtocol).toBe(value);
		});

		it.each(['http/json', 'gRPC', 'http'])('falls back to the default for %p', (value) => {
			process.env[OTEL_ENV_VARS.exporterProtocol] = value;

			const { exporterProtocol } = Container.get(OtelConfig);

			expect(exporterProtocol).toBe('http/protobuf');
		});
	});
});

describe('OtelCustomAttributesConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		delete process.env[CUSTOM_ATTRIBUTE_PREFIXES_ENV_VAR];
		vi.restoreAllMocks();
	});

	it('uses the default prefixes when unset', () => {
		const { prefixes } = Container.get(OtelCustomAttributesConfig);

		expect(prefixes).toEqual(DEFAULT_CUSTOM_ATTRIBUTE_PREFIXES);
	});

	it('keeps the default prefix for each level that is left out', () => {
		process.env[CUSTOM_ATTRIBUTE_PREFIXES_ENV_VAR] = '{"project":""}';

		const { prefixes } = Container.get(OtelCustomAttributesConfig);

		expect(prefixes).toEqual({
			project: '',
			workflow: 'n8n.workflow.custom.',
			node: 'n8n.node.custom.',
		});
	});

	it.each(['not json', '[]', '"str"', '{"nodes":""}', '{"node":1}', '{"node":null}'])(
		'falls back to the default prefixes for %p',
		(value) => {
			process.env[CUSTOM_ATTRIBUTE_PREFIXES_ENV_VAR] = value;

			const { prefixes } = Container.get(OtelCustomAttributesConfig);

			expect(prefixes).toEqual(DEFAULT_CUSTOM_ATTRIBUTE_PREFIXES);
		},
	);
});
