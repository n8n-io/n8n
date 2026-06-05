import { describe, expect, it } from 'vitest';

import {
	injectTelemetryConfig,
	MCP_APP_TELEMETRY_GLOBAL,
	type McpAppTelemetryConfig,
} from './telemetry-config';

const config: McpAppTelemetryConfig = {
	enabled: true,
	writeKey: 'wk',
	dataPlaneUrl: 'https://n8n.example.com/rest/telemetry/proxy',
	configUrl: 'https://n8n.example.com/rest/telemetry/rudderstack',
	instanceId: 'inst',
	versionCli: '1.0.0',
};

describe('injectTelemetryConfig', () => {
	it('injects the config global right after <head>, before existing head content', () => {
		const html = '<!doctype html><html><head><title>n8n</title></head><body></body></html>';
		const out = injectTelemetryConfig(html, config);

		expect(out).toContain(`<head><script>window.${MCP_APP_TELEMETRY_GLOBAL}=`);
		expect(out).toContain('"instanceId":"inst"');
		expect(out.indexOf(MCP_APP_TELEMETRY_GLOBAL)).toBeLessThan(out.indexOf('<title>'));
	});

	it('escapes "<" so values cannot break out of the script context', () => {
		const out = injectTelemetryConfig('<head></head>', {
			...config,
			writeKey: '</script><script>alert(1)</script>',
		});

		expect(out).not.toContain('</script><script>alert(1)');
		expect(out).toContain('\\u003c/script>');
	});

	it('escapes JavaScript line and paragraph separators in string values', () => {
		const out = injectTelemetryConfig('<head></head>', {
			...config,
			instanceId: 'line\u2028paragraph\u2029separator',
		});

		expect(out).toContain('line\\u2028paragraph\\u2029separator');
		expect(out).not.toContain('line\u2028paragraph\u2029separator');
	});

	it('falls back to prepending when there is no <head>', () => {
		const out = injectTelemetryConfig('<body>no head</body>', config);
		expect(out.startsWith(`<script>window.${MCP_APP_TELEMETRY_GLOBAL}=`)).toBe(true);
	});
});
