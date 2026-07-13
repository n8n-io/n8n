import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { ResourceMetadata } from './module.types';

// The registry keeps module-level state and exposes no reset, so re-import a
// fresh module instance before each test to keep them isolated.
const importRegistry = async () => await import('./resourceRegistry');

describe('resourceRegistry', () => {
	let resourceRegistry: Awaited<ReturnType<typeof importRegistry>>;

	const resourceA: ResourceMetadata = {
		key: 'resource-a',
		displayName: 'Resource A',
	};

	const resourceB: ResourceMetadata = {
		key: 'resource-b',
		displayName: 'Resource B',
		i18nKeys: { title: 'resourceB.title' },
	};

	beforeEach(async () => {
		vi.resetModules();
		resourceRegistry = await importRegistry();
	});

	describe('registerResource', () => {
		it('should register a new resource', () => {
			resourceRegistry.registerResource(resourceA);

			expect(resourceRegistry.hasResource('resource-a')).toBe(true);
			expect(resourceRegistry.getResource('resource-a')).toEqual(resourceA);
		});

		it('should register multiple resources', () => {
			resourceRegistry.registerResource(resourceA);
			resourceRegistry.registerResource(resourceB);

			expect(resourceRegistry.getAllResourceKeys()).toEqual(['resource-a', 'resource-b']);
		});

		it('should overwrite a resource registered with the same key', () => {
			resourceRegistry.registerResource(resourceA);
			const updated: ResourceMetadata = { key: 'resource-a', displayName: 'Updated A' };

			resourceRegistry.registerResource(updated);

			expect(resourceRegistry.getResource('resource-a')).toEqual(updated);
			expect(resourceRegistry.getAllResourceKeys()).toHaveLength(1);
		});
	});

	describe('getResource', () => {
		it('should return resource metadata for an existing key', () => {
			resourceRegistry.registerResource(resourceB);

			expect(resourceRegistry.getResource('resource-b')).toEqual(resourceB);
		});

		it('should return undefined for a non-existent key', () => {
			expect(resourceRegistry.getResource('non-existent-resource')).toBeUndefined();
		});
	});

	describe('hasResource', () => {
		it('should return true for a registered key', () => {
			resourceRegistry.registerResource(resourceA);

			expect(resourceRegistry.hasResource('resource-a')).toBe(true);
		});

		it('should return false for an unregistered key', () => {
			expect(resourceRegistry.hasResource('non-existent-resource')).toBe(false);
		});
	});

	describe('getAllResourceKeys', () => {
		it('should return an empty array when no resources are registered', () => {
			expect(resourceRegistry.getAllResourceKeys()).toEqual([]);
		});

		it('should return keys in registration order', () => {
			resourceRegistry.registerResource(resourceB);
			resourceRegistry.registerResource(resourceA);

			expect(resourceRegistry.getAllResourceKeys()).toEqual(['resource-b', 'resource-a']);
		});
	});
});
