/**
 * Default Plugin Registration
 *
 * Registers the core plugins that come built-in with the workflow SDK.
 * This includes validators, composite handlers, and serializers.
 */

import { ifElseHandler, switchCaseHandler, splitInBatchesHandler } from './composite-handlers';
import type { PluginRegistry } from './registry';
import { jsonSerializer } from './serializers';
import type { ValidatorPlugin, CompositeHandlerPlugin, SerializerPlugin } from './types';
import {
	agentValidator,
	chainLlmValidator,
	dateMethodValidator,
	disconnectedNodeValidator,
	expressionPathValidator,
	expressionPrefixValidator,
	fromAiValidator,
	httpRequestValidator,
	maxNodesValidator,
	mergeNodeValidator,
	missingTriggerValidator,
	noNodesValidator,
	setNodeValidator,
	subnodeConnectionValidator,
	toolNodeValidator,
} from './validators';

// Note: Core composite handlers are now imported from ./composite-handlers

// Note: Core serializers are now imported from ./serializers

// =============================================================================
// Registration
// =============================================================================

/**
 * All core validators to register
 */
const coreValidators: ValidatorPlugin[] = [
	// Workflow-level validators (highest priority - run early)
	noNodesValidator, // Check if workflow has any nodes
	missingTriggerValidator, // Check if workflow has a trigger
	maxNodesValidator, // Check max nodes per type constraint

	// Node-specific validators (high priority)
	agentValidator,
	chainLlmValidator,
	httpRequestValidator,
	toolNodeValidator,
	fromAiValidator,

	// Node-type validators (medium priority)
	setNodeValidator,
	mergeNodeValidator,

	// Expression validators (lower priority)
	expressionPrefixValidator,
	dateMethodValidator,
	expressionPathValidator, // Workflow-level validator

	// Structural validators (lowest priority)
	disconnectedNodeValidator, // Workflow-level validator
	subnodeConnectionValidator, // Workflow-level validator
];

/**
 * All core composite handlers to register
 */
const coreCompositeHandlers: CompositeHandlerPlugin[] = [
	ifElseHandler,
	switchCaseHandler,
	splitInBatchesHandler,
];

/**
 * All core serializers to register
 */
const coreSerializers: SerializerPlugin[] = [jsonSerializer];

/**
 * Register all default plugins with the given registry.
 *
 * This function is idempotent - calling it multiple times will not
 * register duplicate plugins (existing plugins are skipped).
 *
 * @param registry The plugin registry to register with
 */
export function registerDefaultPlugins(registry: PluginRegistry): void {
	// Register validators (skip if already registered)
	for (const validator of coreValidators) {
		try {
			registry.registerValidator(validator);
		} catch {
			// Already registered, skip
		}
	}

	// Register composite handlers (skip if already registered)
	for (const handler of coreCompositeHandlers) {
		try {
			registry.registerCompositeHandler(handler);
		} catch {
			// Already registered, skip
		}
	}

	// Register serializers (skip if already registered)
	for (const serializer of coreSerializers) {
		try {
			registry.registerSerializer(serializer);
		} catch {
			// Already registered, skip
		}
	}
}
