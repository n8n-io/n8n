import {
	MCP_APP_TELEMETRY_GLOBAL,
	RUDDERSTACK_CDN_ORIGIN,
	type McpAppTelemetryConfig,
} from '../telemetry-contract';
import { sanitizeTelemetryProperties } from './sanitize';
import type { RudderStack } from './types';

function loadRudderStack(writeKey: string, dataPlaneUrl: string, options: object): void {
	const stub = (window.rudderanalytics ?? []) as RudderStack;
	window.rudderanalytics = stub;

	stub.methods = [
		'load',
		'page',
		'track',
		'identify',
		'group',
		'ready',
		'reset',
		'getAnonymousId',
		'setAnonymousId',
	];

	stub.factory =
		(method: string) =>
		(...args: unknown[]) => {
			stub.push([method, ...args]);
			return stub;
		};

	for (const method of stub.methods) {
		stub[method] = stub.factory(method);
	}

	stub.loadJS = () => {
		const script = document.createElement('script');
		script.type = 'text/javascript';
		script.async = true;
		script.src = `${RUDDERSTACK_CDN_ORIGIN}/v1/ra.min.js`;

		const first = document.getElementsByTagName('script')[0];
		if (first?.parentNode) {
			first.parentNode.insertBefore(script, first);
		} else {
			document.head.appendChild(script);
		}
	};

	stub.loadJS();
	stub.load(writeKey, dataPlaneUrl, options);
}

export class McpAppTelemetry {
	private config?: McpAppTelemetryConfig;
	private ready = false;

	private get rudderStack(): RudderStack | undefined {
		return window.rudderanalytics;
	}

	init(config: McpAppTelemetryConfig | undefined = window[MCP_APP_TELEMETRY_GLOBAL]): void {
		if (this.ready) return;
		if (!config?.enabled || !config.writeKey || !config.dataPlaneUrl || !config.configUrl) return;

		try {
			loadRudderStack(config.writeKey, config.dataPlaneUrl, {
				configUrl: config.configUrl,
				// `All` is RudderStack's required key for disabling all destinations.
				// eslint-disable-next-line @typescript-eslint/naming-convention
				integrations: { All: false },
				loadIntegration: false,
			});
			this.config = config;
			this.ready = true;
		} catch {
			// Telemetry is best-effort and must never block rendering.
			this.ready = false;
		}
	}

	track(event: string, properties: Record<string, unknown> = {}): void {
		if (!this.ready || !this.config) return;

		try {
			const sanitizedProperties = sanitizeTelemetryProperties(properties);

			this.rudderStack?.track(
				event,
				{
					...sanitizedProperties,
					instance_id: this.config.instanceId,
					version_cli: this.config.versionCli,
				},
				// Send a fake IP so RudderStack does not capture the user's real one.
				{ context: { ip: '0.0.0.0' } },
			);
		} catch {
			// Best-effort: never let telemetry break the app.
		}
	}
}

export const telemetry = new McpAppTelemetry();

export function useTelemetry(): McpAppTelemetry {
	return telemetry;
}
