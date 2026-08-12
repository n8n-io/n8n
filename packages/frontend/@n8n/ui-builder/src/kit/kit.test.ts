import { describe, expect, it } from 'vitest';

import { getComponentDef, KIT } from './index';

// Descriptor-shape tests, in the style `document.test.ts` already checks the
// kit's defaults with: nothing here mounts a component (the design system is
// stubbed for the whole run), only the descriptor object is asserted on.

describe('spinningCat', () => {
	const def = getComponentDef('spinningCat');

	it('is registered in the kit', () => {
		expect(KIT).toContain(def);
	});

	it('is a presentation component with no drop points', () => {
		expect(def?.regions).toBeUndefined();
	});

	it('defaults to a 40px size', () => {
		expect(def?.props.find((prop) => prop.name === 'size')?.default).toBe(40);
	});
});
