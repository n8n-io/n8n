import { render } from '@testing-library/vue';
import { defineComponent, h } from 'vue';

import { setTelemetry, TelemetryKey, useTelemetry, type Telemetry } from './useTelemetry';

function createTelemetry(): Telemetry {
	return {
		init: vi.fn(),
		identify: vi.fn(),
		track: vi.fn(),
		page: vi.fn(),
		reset: vi.fn(),
		flushPageEvents: vi.fn(),
		trackAskAI: vi.fn(),
		trackAiTransform: vi.fn(),
		trackNodeParametersValuesChange: vi.fn(),
	};
}

describe('useTelemetry', () => {
	afterEach(() => {
		setTelemetry(undefined);
	});

	it('returns a no-op instance when nothing is registered', () => {
		const telemetry = useTelemetry();
		// Every method resolves to a callable no-op; calling must not throw.
		expect(() => telemetry.track('event')).not.toThrow();
		expect(telemetry.track('event')).toBeUndefined();
	});

	it('returns the registered instance from any context', () => {
		const registered = createTelemetry();
		setTelemetry(registered);

		const telemetry = useTelemetry();
		telemetry.track('event', { foo: 'bar' });

		expect(telemetry).toBe(registered);
		expect(registered.track).toHaveBeenCalledWith('event', { foo: 'bar' });
	});

	it('prefers a component-provided instance over the registered one', () => {
		const registered = createTelemetry();
		const provided = createTelemetry();
		setTelemetry(registered);

		let resolved: Telemetry | undefined;
		const Consumer = defineComponent({
			setup() {
				resolved = useTelemetry();
				return () => h('div');
			},
		});

		render(Consumer, { global: { provide: { [TelemetryKey as symbol]: provided } } });

		expect(resolved).toBe(provided);
		expect(resolved).not.toBe(registered);
	});

	it('falls back to the registered instance inside a component without a provided key', () => {
		const registered = createTelemetry();
		setTelemetry(registered);

		let resolved: Telemetry | undefined;
		const Consumer = defineComponent({
			setup() {
				resolved = useTelemetry();
				return () => h('div');
			},
		});

		render(Consumer);

		expect(resolved).toBe(registered);
	});
});
