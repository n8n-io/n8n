import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { McpAppTelemetry } from './index';
import type { McpAppTelemetryConfig } from '../telemetry-contract';

const enabledConfig: McpAppTelemetryConfig = {
	enabled: true,
	writeKey: 'wk',
	dataPlaneUrl: 'https://n8n.example.com/rest/telemetry/proxy',
	configUrl: 'https://n8n.example.com/rest/telemetry/rudderstack',
	instanceId: 'instance-123',
	versionCli: '1.2.3',
};

function getCalls(method: string): unknown[][] {
	const buffer: unknown[] = window.rudderanalytics ?? [];
	const calls: unknown[][] = [];
	for (const entry of buffer) {
		if (Array.isArray(entry) && entry[0] === method) {
			calls.push(entry);
		}
	}
	return calls;
}

describe('McpAppTelemetry', () => {
	beforeEach(() => {
		delete window.rudderanalytics;
	});

	afterEach(() => {
		delete window.rudderanalytics;
	});

	it('loads RudderStack and dispatches enriched events when enabled', () => {
		const telemetry = new McpAppTelemetry();
		telemetry.init(enabledConfig);

		expect(window.rudderanalytics).toBeDefined();
		expect(getCalls('load')).toEqual([
			[
				'load',
				'wk',
				'https://n8n.example.com/rest/telemetry/proxy',
				{
					configUrl: 'https://n8n.example.com/rest/telemetry/rudderstack',
					// eslint-disable-next-line @typescript-eslint/naming-convention
					integrations: { All: false },
					loadIntegration: false,
				},
			],
		]);

		telemetry.track('Test event', { boot_ms: 42 });

		expect(getCalls('track')).toEqual([
			[
				'track',
				'Test event',
				{ boot_ms: 42, instance_id: 'instance-123', version_cli: '1.2.3' },
				{ context: { ip: '0.0.0.0' } },
			],
		]);
	});

	it('sanitizes event properties before dispatching', () => {
		const telemetry = new McpAppTelemetry();
		telemetry.init(enabledConfig);

		telemetry.track('Test event', {
			apiKey: 'secret-api-key',
			error_message: 'Authorization: Bearer abc.def-ghi_jkl/mno=',
		});

		expect(getCalls('track')).toEqual([
			[
				'track',
				'Test event',
				{
					apiKey: '[REDACTED]',
					error_message: '[REDACTED]',
					instance_id: 'instance-123',
					version_cli: '1.2.3',
				},
				{ context: { ip: '0.0.0.0' } },
			],
		]);
	});

	it('no-ops when diagnostics are disabled', () => {
		const telemetry = new McpAppTelemetry();
		telemetry.init({ ...enabledConfig, enabled: false });
		telemetry.track('Test event');

		expect(window.rudderanalytics).toBeUndefined();
	});

	it('no-ops when required config values are missing', () => {
		const telemetry = new McpAppTelemetry();
		telemetry.init({ ...enabledConfig, writeKey: '' });
		telemetry.init({ ...enabledConfig, dataPlaneUrl: '' });
		telemetry.init({ ...enabledConfig, configUrl: '' });
		telemetry.track('Test event');

		expect(window.rudderanalytics).toBeUndefined();
	});

	it('no-ops when no config is provided', () => {
		const telemetry = new McpAppTelemetry();
		telemetry.init(undefined);
		telemetry.track('Test event');

		expect(window.rudderanalytics).toBeUndefined();
	});

	it('does not dispatch events before init', () => {
		const telemetry = new McpAppTelemetry();
		telemetry.track('Test event', { reason: 'x' });

		expect(window.rudderanalytics).toBeUndefined();
	});

	it('is idempotent and only loads the SDK once', () => {
		const telemetry = new McpAppTelemetry();
		telemetry.init(enabledConfig);
		telemetry.init(enabledConfig);

		expect(getCalls('load')).toHaveLength(1);
	});
});
