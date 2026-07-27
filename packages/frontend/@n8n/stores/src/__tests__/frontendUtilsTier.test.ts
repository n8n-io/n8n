import { useStorage } from '@n8n/frontend-utils/useStorage';
import { setTelemetry, useTelemetry, type Telemetry } from '@n8n/frontend-utils/useTelemetry';
import { nextTick } from 'vue';

/**
 * `@n8n/frontend-utils` sits below this package, so stores may depend on it —
 * unlike `@n8n/composables`, which depends on `@n8n/stores` and would make the
 * edge a build-fatal cycle (`build` is topological via `dependsOn: ["^build"]`).
 *
 * `useTelemetry` and `useStorage` were relocated there for exactly this reason
 * (N8N-100). This exercises the edge from the stores tier so the dependency is
 * covered before the stores that need it land (N8N-70); the cycle-freedom itself
 * is enforced by turbo whenever this package builds.
 */
describe('@n8n/frontend-utils from the stores tier', () => {
	afterEach(() => {
		setTelemetry(undefined);
		localStorage.clear();
	});

	it('resolves useTelemetry and returns the registered instance', () => {
		const registered = { track: vi.fn() } as unknown as Telemetry;
		setTelemetry(registered);

		expect(useTelemetry()).toBe(registered);
	});

	it('resolves useStorage and reads and writes localStorage', async () => {
		const data = useStorage('stores-tier-key');
		expect(data.value).toBeNull();

		data.value = 'value';
		await nextTick();

		expect(localStorage.getItem('stores-tier-key')).toBe('value');
	});
});
