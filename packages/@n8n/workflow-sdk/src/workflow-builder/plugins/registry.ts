/**
 * Plugin Registry
 *
 * Central registry for managing validator, composite handler, and serializer plugins.
 * Provides registration, lookup, and lifecycle management for plugins.
 */

import type { ValidatorPlugin, CompositeHandlerPlugin, SerializerPlugin } from './types';

/**
 * Registry for managing workflow plugins.
 *
 * Plugins are organized by type:
 * - Validators: Check nodes and workflows for issues
 * - Composite Handlers: Handle complex node structures (if/else, switch, etc.)
 * - Serializers: Convert workflows to different output formats
 *
 * @example
 * ```typescript
 * const registry = new PluginRegistry();
 *
 * // Register a custom validator
 * registry.registerValidator({
 *   id: 'custom:my-validator',
 *   name: 'My Validator',
 *   validateNode: (node) => [],
 * });
 *
 * // Use the registry
 * const validators = registry.getValidatorsForNodeType('n8n-nodes-base.httpRequest');
 * ```
 */
export class PluginRegistry {
	private validators = new Map<string, ValidatorPlugin>();
	private compositeHandlers = new Map<string, CompositeHandlerPlugin>();
	private serializers = new Map<string, SerializerPlugin>();
	private serializersByFormat = new Map<string, SerializerPlugin>();

	/**
	 * Register a validator plugin.
	 * @throws Error if a validator with the same id is already registered
	 */
	registerValidator(plugin: ValidatorPlugin): void {
		if (this.validators.has(plugin.id)) {
			throw new Error(`Validator '${plugin.id}' is already registered`);
		}
		this.validators.set(plugin.id, plugin);
	}

	/**
	 * Unregister a validator plugin by id.
	 */
	unregisterValidator(id: string): void {
		this.validators.delete(id);
	}

	/**
	 * Get all registered validators, sorted by priority (highest first).
	 */
	getValidators(): ValidatorPlugin[] {
		return [...this.validators.values()].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
	}

	/**
	 * Get validators applicable to a specific node type.
	 * Returns validators that either:
	 * - Have the node type in their nodeTypes array
	 * - Have an empty or undefined nodeTypes array (applies to all)
	 *
	 * Results are sorted by priority (highest first).
	 */
	getValidatorsForNodeType(nodeType: string): ValidatorPlugin[] {
		return this.getValidators().filter((v) => {
			// No nodeTypes specified = applies to all nodes
			if (!v.nodeTypes || v.nodeTypes.length === 0) {
				return true;
			}
			// Check if this node type is in the validator's list
			return v.nodeTypes.includes(nodeType);
		});
	}

	/**
	 * Register a composite handler plugin.
	 * @throws Error if a handler with the same id is already registered
	 */
	registerCompositeHandler(plugin: CompositeHandlerPlugin): void {
		if (this.compositeHandlers.has(plugin.id)) {
			throw new Error(`Composite handler '${plugin.id}' is already registered`);
		}
		this.compositeHandlers.set(plugin.id, plugin);
	}

	/**
	 * Unregister a composite handler plugin by id.
	 */
	unregisterCompositeHandler(id: string): void {
		this.compositeHandlers.delete(id);
	}

	/**
	 * Get all registered composite handlers, sorted by priority (highest first).
	 */
	getCompositeHandlers(): CompositeHandlerPlugin[] {
		return [...this.compositeHandlers.values()].sort(
			(a, b) => (b.priority ?? 0) - (a.priority ?? 0),
		);
	}

	/**
	 * Find the first composite handler that can handle the given input.
	 * Handlers are checked in priority order (highest first).
	 * @returns The matching handler, or undefined if no handler matches
	 */
	findCompositeHandler(input: unknown): CompositeHandlerPlugin | undefined {
		const handlers = this.getCompositeHandlers();
		return handlers.find((h) => h.canHandle(input));
	}

	/**
	 * Check if a target is a composite type that has a registered handler.
	 * Use this to determine if a target should be skipped or handled specially.
	 * @param target The target to check
	 * @returns true if a composite handler exists for this target
	 */
	isCompositeType(target: unknown): boolean {
		return this.findCompositeHandler(target) !== undefined;
	}

	/**
	 * Resolve the head node name for a composite target.
	 * This allows looking up connection targets without type-specific knowledge.
	 * @param target The target to resolve
	 * @param nameMapping Optional map from node ID to actual map key (for renamed nodes)
	 * @returns The head node name if target is a composite with getHeadNodeName, undefined otherwise
	 */
	resolveCompositeHeadName(target: unknown, nameMapping?: Map<string, string>): string | undefined {
		const handler = this.findCompositeHandler(target);
		if (!handler?.getHeadNodeName) {
			return undefined;
		}

		// Get the head node info from the handler
		const info = handler.getHeadNodeName(target);

		// If handler returns { name, id }, we can use nameMapping
		// Otherwise it returns just the name string
		if (typeof info === 'object' && info !== null && 'name' in info && 'id' in info) {
			const { name, id } = info as { name: string; id: string };
			// Check if this node was renamed
			const mappedName = nameMapping?.get(id);
			return mappedName ?? name;
		}

		// Handler returned just the name - can't use nameMapping without ID
		// But we can check if the name is a key in nameMapping (legacy support)
		const baseName = info;
		if (nameMapping) {
			const mappedName = nameMapping.get(baseName);
			if (mappedName) return mappedName;
		}
		return baseName;
	}

	/**
	 * Register a serializer plugin.
	 * @throws Error if a serializer with the same id is already registered
	 * @throws Error if a serializer for the same format is already registered
	 */
	registerSerializer(plugin: SerializerPlugin): void {
		if (this.serializers.has(plugin.id)) {
			throw new Error(`Serializer '${plugin.id}' is already registered`);
		}
		if (this.serializersByFormat.has(plugin.format)) {
			throw new Error(`Serializer for format '${plugin.format}' is already registered`);
		}
		this.serializers.set(plugin.id, plugin);
		this.serializersByFormat.set(plugin.format, plugin);
	}

	/**
	 * Unregister a serializer plugin by id.
	 */
	unregisterSerializer(id: string): void {
		const plugin = this.serializers.get(id);
		if (plugin) {
			this.serializers.delete(id);
			this.serializersByFormat.delete(plugin.format);
		}
	}

	/**
	 * Get a serializer by format.
	 * @returns The serializer for the format, or undefined if not found
	 */
	getSerializer(format: string): SerializerPlugin | undefined {
		return this.serializersByFormat.get(format);
	}

	/**
	 * Clear all registered plugins.
	 * Useful for testing or resetting the registry.
	 */
	clearAll(): void {
		this.validators.clear();
		this.compositeHandlers.clear();
		this.serializers.clear();
		this.serializersByFormat.clear();
	}
}

/**
 * Global singleton instance of the plugin registry.
 * Use this for registering and accessing plugins throughout the application.
 */
export const pluginRegistry = new PluginRegistry();
