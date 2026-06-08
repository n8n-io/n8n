import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, shallowRef } from 'vue';

import type { McpAppTelemetry } from '@mcp-apps/telemetry';

import { useMcpAppCrashTelemetry } from './use-mcp-app-crash-telemetry';

function createTelemetryMock() {
	return {
		track: vi.fn(),
	} as unknown as McpAppTelemetry;
}

function mountCrashTelemetry(telemetry: McpAppTelemetry) {
	const hostVersion = shallowRef<Implementation>({ name: 'Claude Desktop', version: '1.2.3' });
	const target = document.createElement('div');
	const app = createApp(
		defineComponent({
			setup() {
				useMcpAppCrashTelemetry({
					app: 'workflow-preview',
					event: 'workflow-preview app crashed',
					hostVersion,
					sources: {
						appError: 'app_error',
						appUnhandledRejection: 'app_unhandled_rejection',
					},
					telemetry,
				});

				return () => null;
			},
		}),
	);

	app.mount(target);

	return {
		unmount: () => app.unmount(),
	};
}

describe('useMcpAppCrashTelemetry', () => {
	const mountedApps: Array<{ unmount: () => void }> = [];

	afterEach(() => {
		for (const app of mountedApps.splice(0)) {
			app.unmount();
		}
	});

	it('tracks uncaught app errors', () => {
		const telemetry = createTelemetryMock();
		mountedApps.push(mountCrashTelemetry(telemetry));

		window.dispatchEvent(
			new ErrorEvent('error', { error: new Error('render boom api_key=secret-value') }),
		);

		expect(telemetry.track).toHaveBeenCalledWith('workflow-preview app crashed', {
			app: 'workflow-preview',
			error_message: 'render boom [REDACTED]',
			mcp_client_name: 'Claude Desktop',
			mcp_client_version: '1.2.3',
			source: 'app_error',
		});
	});

	it('tracks unhandled app promise rejections', () => {
		const telemetry = createTelemetryMock();
		mountedApps.push(mountCrashTelemetry(telemetry));
		const event = Object.assign(new Event('unhandledrejection'), {
			reason: new Error('async boom Authorization: Bearer abc.def-ghi_jkl/mno='),
		}) as PromiseRejectionEvent;

		window.dispatchEvent(event);

		expect(telemetry.track).toHaveBeenCalledWith('workflow-preview app crashed', {
			app: 'workflow-preview',
			error_message: 'async boom [REDACTED]',
			mcp_client_name: 'Claude Desktop',
			mcp_client_version: '1.2.3',
			source: 'app_unhandled_rejection',
		});
	});
});
