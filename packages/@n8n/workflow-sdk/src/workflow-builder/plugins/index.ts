/**
 * Plugin System
 *
 * Export all plugin types, registry, and default registration.
 */

// Types
export type {
	ValidationIssue,
	PluginContext,
	MutablePluginContext,
	ValidatorPlugin,
	CompositeHandlerPlugin,
	SerializerContext,
	SerializerPlugin,
} from './types';

// Registry
export { PluginRegistry, pluginRegistry } from './registry';

// Default registration
export { registerDefaultPlugins } from './defaults';
