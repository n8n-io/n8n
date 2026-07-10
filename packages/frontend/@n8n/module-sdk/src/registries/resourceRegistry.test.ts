import { describe, it, expect, beforeEach } from 'vitest';

import * as resourceRegistry from './resourceRegistry';
import type { ResourceMetadata } from '../types/resource';

describe('resourceRegistry', () => {
	const resourceA: ResourceMetadata = { key: 'resource-a', displayName: 'Resource A' };
	const resourceB: ResourceMetadata = {
		key: 'resource-b',
		displayName: 'Resource B',
		i18nKeys: { title: 'resourceB.title' },
	};

	beforeEach(() => {
		resourceRegistry.clearResources();
	});

	it('should register and retrieve a resource', () => {
		resourceRegistry.registerResource(resourceA);

		expect(resourceRegistry.hasResource('resource-a')).toBe(true);
		expect(resourceRegistry.getResource('resource-a')).toEqual(resourceA);
	});

	it('should return undefined for an unregistered resource', () => {
		expect(resourceRegistry.getResource('missing')).toBeUndefined();
		expect(resourceRegistry.hasResource('missing')).toBe(false);
	});

	it('should overwrite a resource registered under the same key', () => {
		resourceRegistry.registerResource(resourceA);
		resourceRegistry.registerResource({ ...resourceA, displayName: 'Renamed' });

		expect(resourceRegistry.getResource('resource-a')?.displayName).toBe('Renamed');
		expect(resourceRegistry.getAllResourceKeys()).toEqual(['resource-a']);
	});

	it('should list all registered resource keys', () => {
		resourceRegistry.registerResource(resourceA);
		resourceRegistry.registerResource(resourceB);

		expect(resourceRegistry.getAllResourceKeys()).toEqual(['resource-a', 'resource-b']);
	});

	it('should clear all resources', () => {
		resourceRegistry.registerResource(resourceA);
		resourceRegistry.registerResource(resourceB);

		resourceRegistry.clearResources();

		expect(resourceRegistry.getAllResourceKeys()).toEqual([]);
	});
});
