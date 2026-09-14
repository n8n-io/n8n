import { describe, it, expect, expectTypeOf } from 'vitest';

import { defineFrontendModule } from './defineFrontendModule';
import type { FrontendModuleDescription } from './types/descriptor';

describe('defineFrontendModule', () => {
	it('should return the same object it was given', () => {
		const descriptor = {
			id: 'identity',
			name: 'Identity',
			description: 'A descriptor passed straight through',
			icon: 'box',
		};

		expect(defineFrontendModule(descriptor)).toBe(descriptor);
	});

	it('should not freeze, seal, or clone the descriptor', () => {
		const module: FrontendModuleDescription = defineFrontendModule({
			id: 'mutable',
			name: 'Mutable',
			description: 'A descriptor that stays writable',
			icon: 'box',
			resources: [{ key: 'mutable', displayName: 'Mutable' }],
		});

		expect(Object.isFrozen(module)).toBe(false);
		expect(Object.isSealed(module)).toBe(false);
		expect(Object.isExtensible(module)).toBe(true);

		// The shell reads a descriptor through the contract type, and registration
		// order lets a host append. Nothing the helper does may prevent that.
		module.resources?.push({ key: 'added', displayName: 'Added' });
		expect(module.resources).toHaveLength(2);
	});

	it('should keep a getter lazy instead of reading it', () => {
		let reads = 0;
		const module = defineFrontendModule({
			id: 'lazy',
			name: 'Lazy',
			description: 'A descriptor with a getter-backed field',
			icon: 'box',
			get settingsPages() {
				reads += 1;
				return [];
			},
		});

		expect(reads).toBe(0);
		expect(module.settingsPages).toHaveLength(0);
		expect(reads).toBe(1);
	});

	it('should keep the literal type of each field', () => {
		const module = defineFrontendModule({
			id: 'literal',
			name: 'Literal',
			description: 'A descriptor whose literal types survive',
			icon: 'box',
		});

		expectTypeOf(module.id).toEqualTypeOf<'literal'>();
		expectTypeOf(module.name).toEqualTypeOf<'Literal'>();
		expectTypeOf(module.icon).toEqualTypeOf<'box'>();
	});

	it('should narrow optional fields a descriptor declares', () => {
		const module = defineFrontendModule({
			id: 'narrow',
			name: 'Narrow',
			description: 'A descriptor declaring one optional surface',
			icon: 'box',
			commands: [{ id: 'narrow.open', title: 'Open Narrow' }],
		});

		// An annotated descriptor widens this to `CommandBarEntry[] | undefined`.
		expectTypeOf(module.commands).not.toBeUndefined();
		expectTypeOf(module).toExtend<FrontendModuleDescription>();
	});

	it('should type-check a descriptor against the contract', () => {
		// @ts-expect-error `id` is required.
		defineFrontendModule({ name: 'No id', description: '', icon: 'box' });

		// @ts-expect-error `icon` must be a string.
		defineFrontendModule({ id: 'typed', name: 'Typed', description: '', icon: 42 });

		// @ts-expect-error `routes` must hold route records.
		defineFrontendModule({ id: 'typed', name: 'Typed', description: '', icon: 'box', routes: [1] });
	});

	it('should keep array element types narrow under `const` inference', () => {
		const module = defineFrontendModule({
			id: 'narrow-elements',
			name: 'Narrow elements',
			description: 'A descriptor whose array elements keep their literal types',
			icon: 'box',
			resources: [{ key: 'thing', displayName: 'Thing' }],
		});

		expectTypeOf(module.resources[0].key).toEqualTypeOf<'thing'>();
		expect(module.resources[0].key).toBe('thing');
	});

	it('should type a route guard from the contract', () => {
		const module = defineFrontendModule({
			id: 'guarded',
			name: 'Guarded',
			description: 'A descriptor whose guard parameter is typed by the contract',
			icon: 'box',
			routes: [
				{
					path: '/guarded',
					component: async () => await Promise.resolve({}),
					beforeEnter: (to) => {
						expectTypeOf(to.params).not.toBeAny();
						return true;
					},
				},
			],
		});

		expect(module.routes).toHaveLength(1);
	});
});
