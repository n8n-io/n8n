import { telemetry, TelemetryPlugin } from '@/app/plugins/telemetry';
import {
	getRegisteredTelemetry,
	TelemetryKey,
} from '@n8n/composables/registries/telemetryRegistry';
import { createApp, inject } from 'vue';

// The partial factory shape used by ~100 editor-ui test files: it returns
// `useTelemetry` and nothing else. While the plugin imported its registration
// helpers from `@n8n/composables/useTelemetry`, this mock also intercepted them
// and loading the plugin threw `No "setTelemetry" export is defined` — sometimes
// swallowed into an unrelated render failure with no mock error in the log.
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({ track: vi.fn() })),
}));

describe('telemetry plugin registration', () => {
	it('survives a partial `useTelemetry` mock', () => {
		// Module-load registration, for consumers calling `useTelemetry` outside
		// of a component setup.
		expect(getRegisteredTelemetry()).toBe(telemetry);

		// Injection-based registration, for consumers inside a component tree.
		const app = createApp({ render: () => null });
		app.use(TelemetryPlugin);
		expect(app.runWithContext(() => inject(TelemetryKey))).toBe(telemetry);
	});
});
