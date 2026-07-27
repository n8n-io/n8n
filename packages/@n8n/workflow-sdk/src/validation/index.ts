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
	INFORMATIONAL_VALIDATION_CODES,
	isInformationalValidationCode,
	partitionValidationIssues,
} from './informational-validation-codes';

export {
	matchesDisplayOptions,
	checkConditions,
	type DisplayOptions,
	type DisplayOptionsContext,
} from './display-options';

export { resolveMainInputCount } from './node-port-resolvers/resolve-main-input-count';
export { resolveMainOutputCount } from './node-port-resolvers/resolve-main-output-count';
