import { defineComponent } from 'vue';

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

	it('frees the slot on unregister', () => {
		componentRegistry.register('project-filter', First);
		componentRegistry.unregister('project-filter');

		expect(componentRegistry.get('project-filter')).toBeUndefined();
	});
});
