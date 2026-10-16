import { computed, defineComponent } from 'vue';

import * as componentRegistry from './componentRegistry';

const First = defineComponent({ template: '<div>first</div>' });
const Second = defineComponent({ template: '<div>second</div>' });

describe('componentRegistry', () => {
	beforeEach(() => {
		componentRegistry.clear();
	});

	it('resolves a registered slot', () => {
		componentRegistry.register('project-filter', First);

		expect(componentRegistry.get('project-filter')).toBe(First);
		expect(componentRegistry.has('project-filter')).toBe(true);
	});

	it('resolves an unregistered slot to undefined', () => {
		expect(componentRegistry.get('project-filter')).toBeUndefined();
		expect(componentRegistry.has('project-filter')).toBe(false);
	});

	it('treats re-registering the same component as a no-op', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		componentRegistry.register('project-filter', First);
		componentRegistry.register('project-filter', First);

		expect(componentRegistry.get('project-filter')).toBe(First);
		expect(warn).not.toHaveBeenCalled();
	});

	it('keeps the first component and warns when a second claims the slot', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		componentRegistry.register('project-filter', First);
		componentRegistry.register('project-filter', Second);

		expect(componentRegistry.get('project-filter')).toBe(First);
		expect(warn).toHaveBeenCalledWith(
			'Component slot "project-filter" is already registered. Skipping.',
		);
	});

	// The registry is `shallowReactive` so a module can resolve a slot with a plain
	// `computed`. The shell registers slots lazily, after a module may already have
	// read an empty slot — swapping in a plain `Map` would break that silently.
	it('makes a computed reader see a later registration', () => {
		const slot = computed(() => componentRegistry.get('project-filter'));
		expect(slot.value).toBeUndefined();

		componentRegistry.register('project-filter', First);

		expect(slot.value).toBe(First);
	});

	it('makes a computed reader see an unregister', () => {
		componentRegistry.register('project-filter', First);
		const slot = computed(() => componentRegistry.get('project-filter'));
		expect(slot.value).toBe(First);

		componentRegistry.unregister('project-filter');

		expect(slot.value).toBeUndefined();
	});

	it('frees the slot on unregister', () => {
		componentRegistry.register('project-filter', First);
		componentRegistry.unregister('project-filter');

		expect(componentRegistry.get('project-filter')).toBeUndefined();
	});
});
