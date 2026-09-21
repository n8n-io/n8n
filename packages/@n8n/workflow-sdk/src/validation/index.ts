/**
 * Workflow validation public API.
 *
 * Prefer importing from this barrel (`../validation` or `@n8n/workflow-sdk`)
 * rather than deep paths.
 */

export {
	validateWorkflow,
	ValidationError,
	ValidationWarning,
	type ValidationResult,
	type ValidationOptions,
	type ValidationErrorCode,
} from './validate-workflow';

export {
	getSchemaBaseDirs,
	setSchemaBaseDirs,
	validateNodeConfig,
	type SchemaValidationResult,
} from './node-parameter-schema/schema-validator';

export {
	type IssueSeverity,
	isInformationalIssue,
	partitionValidationIssues,
} from './issue-severity';

export {
	validateWorkflowBuilder,
	buildUncheckedNotes,
	type ValidateWorkflowBuilderOptions,
	type ValidateWorkflowBuilderResult,
	type CollectedValidationIssue,
	type ValidationIssueSource,
} from './validate-workflow-builder';

export {
	matchesDisplayOptions,
	checkConditions,
	type DisplayOptions,
	type DisplayOptionsContext,
} from './display-options';

export {
	connectRequiredSubnodeInputs,
	describeAddedSubnodeConnection,
	type AddedSubnodeConnection,
	type ClearedSubnodeInput,
	type WorkflowForSubnodeWiring,
} from './required-subnode-connections';

export { resolveMainInputCount } from './node-port-resolvers/resolve-main-input-count';
export { resolveMainOutputCount } from './node-port-resolvers/resolve-main-output-count';
