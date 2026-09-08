import { describe, expect, it } from 'vitest';

import { getMcpClientTelemetryProperties } from './client-info';

describe('getMcpClientTelemetryProperties', () => {
	it('maps host implementation info to telemetry properties', () => {
		expect(getMcpClientTelemetryProperties({ name: 'Claude Desktop', version: '1.2.3' })).toEqual({
			mcp_client_name: 'Claude Desktop',
			mcp_client_version: '1.2.3',
		});
	});

	it('omits missing fields', () => {
		expect(getMcpClientTelemetryProperties({ name: 'Claude Desktop', version: '' })).toEqual({
			mcp_client_name: 'Claude Desktop',
		});
		expect(getMcpClientTelemetryProperties(undefined)).toEqual({});
	});
});
