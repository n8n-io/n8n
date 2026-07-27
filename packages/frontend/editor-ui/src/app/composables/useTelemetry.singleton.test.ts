import { useTelemetry as useTelemetryFromUtils } from '@n8n/frontend-utils/useTelemetry';
import {
	setTelemetry,
	useTelemetry as useTelemetryFromComposables,
	type Telemetry,
} from '@n8n/composables/useTelemetry';

/**
 * Guards the package-side telemetry singleton, not the deprecated app shim in
 * `./useTelemetry`.
 *
 * `useTelemetry` lives in `@n8n/frontend-utils` (N8N-100, so `@n8n/stores` can
 * consume it without a `stores → composables` cycle) and `@n8n/composables`
 * re-exports it at the old path. Both paths must resolve to one module instance,
 * because the registered instance is module-level state: the telemetry plugin
 * calls `setTelemetry` through `@n8n/composables/useTelemetry`, while
 * `@n8n/stores` consumers read through `@n8n/frontend-utils/useTelemetry`. A
 * second copy of the module — a re-implemented shim, or a bundler inlining the
 * dependency — splits the two silently and telemetry degrades to the no-op.
 *
 * This runs in `editor-ui` because it is the only package that resolves both
 * specifiers: `@n8n/composables` via a source alias, `@n8n/frontend-utils` from
 * `dist`. The build-level half of the guarantee is asserted in
 * `@n8n/composables`' own `useTelemetry.singleton.test.ts`.
 */
describe('telemetry singleton across package paths', () => {
	afterEach(() => {
		setTelemetry(undefined);
	});

	it('resolves to the same module through both import paths', () => {
		expect(useTelemetryFromComposables).toBe(useTelemetryFromUtils);
	});

	it('observes an instance registered through the other path', () => {
		const registered = { track: vi.fn() } as unknown as Telemetry;

		setTelemetry(registered);

		// The path `@n8n/stores` uses sees what the telemetry plugin registered.
		expect(useTelemetryFromUtils()).toBe(registered);
		expect(useTelemetryFromComposables()).toBe(registered);
	});
});
