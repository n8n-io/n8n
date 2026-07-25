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
	agentModelPairingValidator,
	aiGatewayValidator,
	alwaysOutputDataValidator,
	arrayInputCollapseValidator,
	branchOutputValidator,
	chainLlmValidator,
	codeNodeValidator,
	connectionIndexValidator,
	dataTableColumnValidator,
	dateMethodValidator,
	disconnectedNodeValidator,
	emptyResourceLocatorValidator,
	expressionPathValidator,
	expressionPrefixValidator,
	filterNodeValidator,
	fromAiValidator,
	httpPaginationValidator,
	httpRequestValidator,
	listFixtureValidator,
	llmTextPathValidator,
	maxNodesValidator,
	memoryFromInputValidator,
	memorySessionKeyValidator,
	mergeNodeValidator,
	missingTriggerValidator,
	noNodesValidator,
	openAiStructuredOutputValidator,
	outputFixtureValidator,
	rawCredentialValidator,
	setNodeValidator,
	sheetsMatchColumnValidator,
	nestedSplitInBatchesValidator,
	splitInBatchesLoopbackValidator,
	subnodeConnectionValidator,
	subnodeJsonReferenceValidator,
	toolNodeValidator,
	unknownConfigKeysValidator,
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
	agentModelPairingValidator,
	aiGatewayValidator,
	chainLlmValidator,
	httpRequestValidator,
	httpPaginationValidator,
	openAiStructuredOutputValidator,
	arrayInputCollapseValidator,
	codeNodeValidator,
	toolNodeValidator,
	fromAiValidator,
	memorySessionKeyValidator,
	memoryFromInputValidator,
	subnodeJsonReferenceValidator,
	emptyResourceLocatorValidator,
	rawCredentialValidator,
	unknownConfigKeysValidator,
	outputFixtureValidator,
	listFixtureValidator,
	alwaysOutputDataValidator,
	sheetsMatchColumnValidator,
	dataTableColumnValidator,

	// Node-type validators (medium priority)
	setNodeValidator,
	mergeNodeValidator,
	filterNodeValidator,
	branchOutputValidator,
	nestedSplitInBatchesValidator,
	splitInBatchesLoopbackValidator,
	connectionIndexValidator,

	// Expression validators (lower priority)
	expressionPrefixValidator,
	dateMethodValidator,
	llmTextPathValidator, // Workflow-level + node fixture checks
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
