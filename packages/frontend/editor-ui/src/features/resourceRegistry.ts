/**
 * Allows features to register their resource types without modifying core components
 * These resources can then be used in ResourcesListLayout
 */

interface ResourceMetadata {
	key: string;
	displayName: string;
	i18nKeys?: Record<string, string>;
}

class ResourceRegistry {
	private resources: Map<string, ResourceMetadata> = new Map();

	/**
	 * Register a new resource type
	 */
	register(metadata: ResourceMetadata): void {
		this.resources.set(metadata.key, metadata);
	}

	/**
	 * Get resource metadata by key
	 */
	get(key: string): ResourceMetadata | undefined {
		return this.resources.get(key);
	}

	/**
	 * Check if a resource is registered
	 */
	has(key: string): boolean {
		return this.resources.has(key);
	}

	/**
	 * Get all registered resource keys
	 */
	getAllKeys(): string[] {
		return Array.from(this.resources.keys());
	}
}

// Singleton instance
export const resourceRegistry = new ResourceRegistry();

export function registerResource(metadata: ResourceMetadata): void {
	resourceRegistry.register(metadata);
}
