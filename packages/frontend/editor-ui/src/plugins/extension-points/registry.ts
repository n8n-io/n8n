import { reactive } from 'vue';
import type { Extension } from './types';

class ExtensionPointRegistry {
	private extensions = new Map<string, Extension[]>();

	/**
	 * Register an extension for a specific point.
	 * Extension points are implicitly defined by <ExtensionPoint> components in the codebase.
	 */
	register(pointName: string, extension: Extension): void {
		if (!this.extensions.has(pointName)) {
			this.extensions.set(pointName, []);
		}

		// Well this is obvious, an if would just consume CPU cycles for nothing
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const extensions = this.extensions.get(pointName)!;
		extensions.push(extension);

		// Sort by priority (higher first)
		extensions.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
	}

	/**
	 * Get all extensions for a point.
	 * Called by <ExtensionPoint> component to render registered components.
	 */
	get(pointName: string): Extension[] {
		return this.extensions.get(pointName) ?? [];
	}

	/**
	 * Check if any extensions are registered at a point
	 */
	has(pointName: string): boolean {
		return this.get(pointName).length > 0;
	}

	/**
	 * Unregister extensions from a plugin (for cleanup)
	 */
	unregisterPlugin(pluginName: string): void {
		for (const [pointName, extensions] of this.extensions.entries()) {
			const filtered = extensions.filter((ext) => ext.pluginName !== pluginName);
			this.extensions.set(pointName, filtered);
		}
	}

	/**
	 * Clear all extensions (useful for testing)
	 */
	clear(): void {
		this.extensions.clear();
	}

	/**
	 * Get all extension point names that have registered extensions
	 */
	getActivePoints(): string[] {
		return Array.from(this.extensions.keys()).filter((key) => this.get(key).length > 0);
	}
}

// Singleton instance
export const extensionPointRegistry = reactive(new ExtensionPointRegistry());
