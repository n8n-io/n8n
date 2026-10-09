import { mock } from 'vitest-mock-extended';

import {
	ProjectOwnedResourceScopeResolverRegistry,
	type ProjectOwnedResourceScopeResolver,
} from '../project-owned-resource-scope-resolver.registry';

describe('ProjectOwnedResourceScopeResolverRegistry', () => {
	it('returns a registered resolver', () => {
		const registry = new ProjectOwnedResourceScopeResolverRegistry();
		const resolver = mock<ProjectOwnedResourceScopeResolver>();

		registry.register('dataTable', resolver);

		expect(registry.get('dataTable')).toBe(resolver);
	});

	it('returns undefined for an unregistered resource type', () => {
		const registry = new ProjectOwnedResourceScopeResolverRegistry();

		expect(registry.get('dataTable')).toBeUndefined();
	});

	it('rejects duplicate registrations', () => {
		const registry = new ProjectOwnedResourceScopeResolverRegistry();
		registry.register('dataTable', mock<ProjectOwnedResourceScopeResolver>());

		expect(() => registry.register('dataTable', mock<ProjectOwnedResourceScopeResolver>())).toThrow(
			'A scope resolver is already registered for resource type "dataTable".',
		);
	});
});
