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

	it('registers the project-filter slot', () => {
		registerComponentSlots();

		expect(componentRegistry.get('project-filter')).toBeDefined();
	});

	it('registers the host lazily, so the projects feature stays out of the boot chunk', () => {
		registerComponentSlots();

		// An async component wrapper, not the resolved SFC: resolving here would make
		// `ProjectSharing` and the projects store statically reachable from `main.ts`.
		const slot = componentRegistry.get('project-filter');
		expect((slot as { __asyncLoader?: unknown }).__asyncLoader).toBeInstanceOf(Function);
	});
});
