import { render } from '@testing-library/vue';
import { defineComponent, h } from 'vue';

import {
	setExternalHooks,
	ExternalHooksKey,
	useExternalHooks,
	type ExternalHooks,
} from './useExternalHooks';

function createExternalHooks(): ExternalHooks {
	return {
		run: vi.fn().mockResolvedValue(undefined),
	};
}

describe('useExternalHooks', () => {
	afterEach(() => {
		setExternalHooks(undefined);
	});

	it('returns a no-op runner when nothing is registered', async () => {
		const externalHooks = useExternalHooks();
		// `run` resolves to a no-op; calling must not throw and must be awaitable.
		await expect(externalHooks.run('app.mount')).resolves.toBeUndefined();
	});

	it('returns the registered runner from any context', async () => {
		const registered = createExternalHooks();
		setExternalHooks(registered);

		const externalHooks = useExternalHooks();
		await externalHooks.run('app.mount', { foo: 'bar' });

		expect(externalHooks).toBe(registered);
		expect(registered.run).toHaveBeenCalledWith('app.mount', { foo: 'bar' });
	});

	it('prefers a component-provided runner over the registered one', () => {
		const registered = createExternalHooks();
		const provided = createExternalHooks();
		setExternalHooks(registered);

		let resolved: ExternalHooks | undefined;
		const Consumer = defineComponent({
			setup() {
				resolved = useExternalHooks();
				return () => h('div');
			},
		});

		render(Consumer, { global: { provide: { [ExternalHooksKey as symbol]: provided } } });

		expect(resolved).toBe(provided);
		expect(resolved).not.toBe(registered);
	});

	it('falls back to the registered runner inside a component without a provided key', () => {
		const registered = createExternalHooks();
		setExternalHooks(registered);

		let resolved: ExternalHooks | undefined;
		const Consumer = defineComponent({
			setup() {
				resolved = useExternalHooks();
				return () => h('div');
			},
		});

		render(Consumer);

		expect(resolved).toBe(registered);
	});
});
