/**
 * Allows features to register their resource types without modifying core components
 * These resources can then be used in ResourcesListLayout.
 *
 * Apart from this, new resource types can be registered like this:
  	1. Create a types.d.ts file in your feature directory
		2. Define your resource type extending BaseResource
  	3. Use module augmentation to extend ModuleResources:
  			declare module '@/Interface' {
    			interface ModuleResources {
      			myFeature: MyFeatureResource;
    		}
			}
  	4. Import your resource type from the local types file in your components
 */

import { type ResourceMetadata } from './module.types';

// Private module state
const resources: Map<string, ResourceMetadata> = new Map();

/**
 * Register a new resource type
 */
export function registerResource(metadata: ResourceMetadata): void {
	resources.set(metadata.key, metadata);
}

/**
 * Get resource metadata by key
 */
export function getResource(key: string): ResourceMetadata | undefined {
	return resources.get(key);
}

/**
 * Check if a resource is registered
 */
export function hasResource(key: string): boolean {
	return resources.has(key);
}

/**
 * Get all registered resource keys
 */
export function getAllResourceKeys(): string[] {
	return Array.from(resources.keys());
}
