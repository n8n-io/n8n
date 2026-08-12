import { describe, expect, it } from 'vitest';

import { getComponentDef, KIT } from './index';

// Descriptor-shape tests, in the style `document.test.ts` already checks the
// kit's defaults with: nothing here mounts a component (the design system is
// stubbed for the whole run), only the descriptor object is asserted on.

describe('badge', () => {
	const def = getComponentDef('badge');

	it('is registered in the kit', () => {
		expect(KIT).toContain(def);
	});

	it('is a presentation component with no drop points', () => {
		expect(def?.regions).toBeUndefined();
	});

	it('defaults to a plain, untinted badge', () => {
		expect(def?.props.find((prop) => prop.name === 'text')?.default).toBe('Badge');
		expect(def?.props.find((prop) => prop.name === 'theme')?.default).toBe('default');
	});

	it('offers a theme for every status the demo needs', () => {
		const values = def?.props
			.find((prop) => prop.name === 'theme')
			?.options?.map((option) => (option as { value: string }).value);

		expect(values).toEqual(expect.arrayContaining(['default', 'success', 'warning', 'danger']));
	});
});

describe('divider', () => {
	const def = getComponentDef('divider');

	it('is registered in the kit', () => {
		expect(KIT).toContain(def);
	});

	it('takes no props and no children', () => {
		expect(def?.props).toEqual([]);
		expect(def?.regions).toBeUndefined();
	});
});

describe('emptyState', () => {
	const def = getComponentDef('emptyState');

	it('is registered in the kit', () => {
		expect(KIT).toContain(def);
	});

	it('defaults to a generic empty message', () => {
		expect(def?.props.find((prop) => prop.name === 'heading')?.default).toBe('Nothing here yet');
		expect(def?.props.find((prop) => prop.name === 'description')?.default).toBe('');
	});
});

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

describe('select', () => {
	const def = getComponentDef('select');

	it('is registered in the kit', () => {
		expect(KIT).toContain(def);
	});

	it('splits reads and writes the same way input does', () => {
		const names = def?.props.map((prop) => prop.name);
		expect(names).toEqual(expect.arrayContaining(['value', 'model', 'options', 'placeholder']));
		expect(def?.props.find((prop) => prop.name === 'model')?.type).toBe('statePath');
	});
});
