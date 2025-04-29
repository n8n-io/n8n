import type { Scope, ScopeLevels, MaskLevels } from '../../types.ee';
import { combineScopes } from '../combineScopes.ee';

describe('combineScopes', () => {
	test('should combine global scopes into a Set', () => {
		const globalScopes: ScopeLevels = {
			global: ['workflow:read', 'workflow:update', 'user:list'],
		};

		const result = combineScopes(globalScopes);

		expect(result).toBeInstanceOf(Set);
		expect(result.size).toBe(3);
		expect(result.has('workflow:read')).toBe(true);
		expect(result.has('workflow:update')).toBe(true);
		expect(result.has('user:list')).toBe(true);
	});

	test('should combine scopes from multiple levels into a Set', () => {
		const multiLevelScopes: ScopeLevels = {
			global: ['user:list', 'user:read'],
			project: ['workflow:read', 'workflow:update'],
			resource: ['credential:read'],
		};

		const result = combineScopes(multiLevelScopes);

		expect(result).toBeInstanceOf(Set);
		expect(result.size).toBe(5);
		expect(result.has('user:list')).toBe(true);
		expect(result.has('user:read')).toBe(true);
		expect(result.has('workflow:read')).toBe(true);
		expect(result.has('workflow:update')).toBe(true);
		expect(result.has('credential:read')).toBe(true);
	});

	test('should not modify the original scopes object', () => {
		const originalScopes: ScopeLevels = {
			global: ['user:list'],
			project: ['workflow:read', 'workflow:update'],
			resource: ['credential:read'],
		};

		const originalProjectScopes = [...originalScopes.project!];

		combineScopes(originalScopes, {
			sharing: ['workflow:read'],
		});

		// Verify the original object wasn't modified
		expect(originalScopes.project).toEqual(originalProjectScopes);
	});

	test('should apply masks to project and resource scopes but not global scopes', () => {
		const userScopes: ScopeLevels = {
			global: ['user:list', 'workflow:delete'],
			project: ['workflow:read', 'workflow:update', 'credential:update'],
			resource: ['credential:read', 'workflow:execute'],
		};

		const masks: MaskLevels = {
			sharing: ['workflow:read', 'credential:read'],
		};

		const result = combineScopes(userScopes, masks);

		// Global scopes should be included regardless of masks
		expect(result.has('user:list')).toBe(true);
		expect(result.has('workflow:delete')).toBe(true);

		// Project scopes should be filtered by mask
		expect(result.has('workflow:read')).toBe(true);
		expect(result.has('workflow:update')).toBe(false);
		expect(result.has('credential:update')).toBe(false);

		// Resource scopes should be filtered by mask
		expect(result.has('credential:read')).toBe(true);
		expect(result.has('workflow:execute')).toBe(false);
	});

	test('should handle empty scopes', () => {
		const emptyScopes: ScopeLevels = {
			global: [],
		};

		const result = combineScopes(emptyScopes);
		expect(result.size).toBe(0);
	});

	test('should handle empty masks', () => {
		const userScopes: ScopeLevels = {
			global: ['user:list'],
			project: ['workflow:read', 'workflow:update'],
			resource: ['credential:read'],
		};

		const emptyMasks: MaskLevels = {
			sharing: [],
		};

		const result = combineScopes(userScopes, emptyMasks);

		// Global scopes should be included
		expect(result.has('user:list')).toBe(true);

		// Project and resource scopes should be filtered out by empty mask
		expect(result.has('workflow:read')).toBe(false);
		expect(result.has('workflow:update')).toBe(false);
		expect(result.has('credential:read')).toBe(false);
	});

	test('should handle undefined masks', () => {
		const userScopes: ScopeLevels = {
			global: ['user:list'],
			project: ['workflow:read'],
			resource: ['credential:read'],
		};

		const result = combineScopes(userScopes, undefined);

		expect(result.size).toBe(3);
		expect(result.has('user:list')).toBe(true);
		expect(result.has('workflow:read')).toBe(true);
		expect(result.has('credential:read')).toBe(true);
	});

	test('should handle duplicate scopes across levels', () => {
		const duplicateScopes: ScopeLevels = {
			global: ['workflow:read', 'user:list'],
			project: ['workflow:read', 'workflow:update'],
			resource: ['workflow:read', 'credential:read'],
		};

		const result = combineScopes(duplicateScopes);

		// The Set should deduplicate the scopes
		expect(result.size).toBe(4);
		expect(result.has('workflow:read')).toBe(true);
		expect(result.has('user:list')).toBe(true);
		expect(result.has('workflow:update')).toBe(true);
		expect(result.has('credential:read')).toBe(true);
	});

	test('should handle partial level definitions', () => {
		const partialScopes: ScopeLevels = {
			global: ['user:list'],
			project: ['workflow:read'],
			resource: [], // Empty resource level
		};

		const result = combineScopes(partialScopes);

		expect(result.size).toBe(2);
		expect(result.has('user:list')).toBe(true);
		expect(result.has('workflow:read')).toBe(true);
	});

	test('should handle missing level definitions', () => {
		// Only global level defined
		const globalOnlyScopes = {
			global: ['user:list', 'workflow:read'] as Scope[],
		};

		const result = combineScopes(globalOnlyScopes);

		expect(result.size).toBe(2);
		expect(result.has('user:list')).toBe(true);
		expect(result.has('workflow:read')).toBe(true);
	});

	test('should correctly handle complex masking scenarios', () => {
		const complexScopes: ScopeLevels = {
			global: ['user:list', 'workflow:execute'],
			project: ['workflow:read', 'workflow:update', 'credential:read', 'credential:update'],
			resource: ['workflow:delete', 'credential:delete', 'tag:read'],
		};

		const complexMasks: MaskLevels = {
			sharing: ['workflow:read', 'workflow:delete', 'credential:read', 'tag:read'],
		};

		const result = combineScopes(complexScopes, complexMasks);

		// Global scopes should be included regardless of masks
		expect(result.has('user:list')).toBe(true);
		expect(result.has('workflow:execute')).toBe(true);

		// Project scopes should be filtered by mask
		expect(result.has('workflow:read')).toBe(true);
		expect(result.has('credential:read')).toBe(true);
		expect(result.has('workflow:update')).toBe(false);
		expect(result.has('credential:update')).toBe(false);

		// Resource scopes should be filtered by mask
		expect(result.has('workflow:delete')).toBe(true);
		expect(result.has('tag:read')).toBe(true);
		expect(result.has('credential:delete')).toBe(false);
	});
});
