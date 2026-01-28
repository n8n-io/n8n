import { reactive } from 'vue';
import type { ExtensionEntry } from './types';

class ExtensionPointRegistry {
	private extensions = new Map<string, ExtensionEntry[]>();

	/**
	 * Register an extension for a specific point.
	 * Extension points are implicitly defined by <ExtensionPoint> components in the codebase.
	 */
	register(pointName: string, extension: ExtensionEntry): void {
		if (!this.extensions.has(pointName)) {
			this.extensions.set(pointName, []);
		}

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const extensions = this.extensions.get(pointName)!;
		extensions.push(extension);

		extensions.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
	}

	/**
	 * Get all extension entries for a point.
	 * Called by <ExtensionPoint> component to render registered components.
	 */
	get(pointName: string): ExtensionEntry[] {
		return this.extensions.get(pointName) ?? [];
	}

	/**
	 * Check if any extension entries are registered at a point
	 */
	has(pointName: string): boolean {
		return this.get(pointName).length > 0;
	}

	/**
	 * Unregister extension entries from a cloud extension (for cleanup)
	 */
	unregisterCloudExtension(extensionName: string): void {
		for (const [pointName, extensions] of this.extensions.entries()) {
			const filtered = extensions.filter((ext) => ext.extensionName !== extensionName);
			this.extensions.set(pointName, filtered);
		}
	}

	/**
	 * Clear all extension entries (useful for testing)
	 */
	clear(): void {
		this.extensions.clear();
	}

	/**
	 * Get all extension point names that have registered extensions entries
	 */
	getActivePoints(): string[] {
		return Array.from(this.extensions.keys()).filter((key) => this.get(key).length > 0);
	}
}

export const extensionPointRegistry = reactive(new ExtensionPointRegistry());
