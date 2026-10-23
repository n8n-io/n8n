import { mock } from 'vitest-mock-extended';

import {
	FavoriteResourceResolverRegistry,
	type FavoriteResourceResolver,
} from '../favorite-resource-resolver.registry';

describe('FavoriteResourceResolverRegistry', () => {
	it('returns a registered resolver', () => {
		const registry = new FavoriteResourceResolverRegistry();
		const resolver = mock<FavoriteResourceResolver>();

		registry.register('dataTable', resolver);

		expect(registry.get('dataTable')).toBe(resolver);
	});

	it('returns undefined when no resolver is registered', () => {
		const registry = new FavoriteResourceResolverRegistry();

		expect(registry.get('agent')).toBeUndefined();
	});
});
