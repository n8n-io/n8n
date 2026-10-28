import { componentRegistry } from '@n8n/frontend-module-sdk';

import { registerComponentSlots } from './componentSlots.manifest';

describe('registerComponentSlots', () => {
	beforeEach(() => {
		componentRegistry.clear();
	});

	afterEach(() => {
		componentRegistry.clear();
	});

	it('leaves the project-filter slot empty until it is called', () => {
		expect(componentRegistry.get('project-filter')).toBeUndefined();
	});

	// An async component wrapper, not the resolved SFC: resolving here would make the
	// projects feature and the list layout statically reachable from `main.ts`.
	it.each([
		'project-filter',
		'project-header',
		'insights-summary',
		'resources-list-layout',
	] as const)('registers the %s slot lazily', (slot) => {
		registerComponentSlots();

		const component = componentRegistry.get(slot);
		expect((component as { __asyncLoader?: unknown }).__asyncLoader).toBeInstanceOf(Function);
	});
});
