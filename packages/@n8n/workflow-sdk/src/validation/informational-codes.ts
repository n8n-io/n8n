/**
 * Validation codes that must not block a save / CLI exit.
 *
 * Shared by the workflow-sdk CLI `validate` command and Instance AI's
 * `partitionWarnings` so the local check predicts the build gate.
 *
 * New shape-aware rules land here first (informational), then promote to
 * blocking once eval corpus false-positive rates look clean.
 */
export const INFORMATIONAL_VALIDATION_CODES: ReadonlySet<string> = new Set([
	'MISSING_TRIGGER',
	'DISCONNECTED_NODE',
	'auto_imported_sdk_symbols',
	// Staged: common-output-shape heuristics (promote after evals)
	'EMPTY_RESOURCE_LOCATOR_VALUE',
	'SET_LEGACY_VALUES_SHAPE',
	'WRONG_LLM_TEXT_PATH',
	'WRONG_LLM_OUTPUT_FIXTURE',
	'GUESSED_LLM_OUTPUT_PATH',
	'REDUNDANT_LLM_OUTPUT_PARSE',
	'MEMORY_FROM_INPUT_WITHOUT_CHAT_TRIGGER',
	'AGENT_CHAT_INPUT_WITHOUT_CHAT_TRIGGER',
	// Staged: skill→lint first cut (promote after evals)
	'CODE_NODE_NETWORK_CALL',
	'CODE_MODE_API_MISUSE',
	'OUTPUT_FIXTURE_ITEM_ENVELOPE',
	'MISSING_OUTPUT_FIXTURE',
	'RAW_CREDENTIAL_OBJECT',
	'BRANCH_OUTPUT_NOT_WIRED',
	'ERROR_OUTPUT_NOT_WIRED',
	'ERROR_OUTPUT_MISROUTED',
	'ERROR_OUTPUT_INVALID_PORT',
	// Staged: boolean LHS compared with string op under strict (promote after evals)
	'FILTER_BOOLEAN_COMPARED_AS_STRING',
	'SPLIT_IN_BATCHES_NO_LOOPBACK',
	// Staged: nested Loop Over Items (promote after evals)
	'NESTED_SPLIT_IN_BATCHES',
	// Staged: skill→lint second cut
	'TOOL_NAME_CONVENTION',
	'SHEETS_MATCH_COLUMN_NOT_IN_SCHEMA',
	'SHEETS_SCHEMA_ID_NOT_HEADER',
	'SHEETS_VALUE_KEY_NOT_IN_SCHEMA',
	'DATA_TABLE_CAMELCASE_COLUMN',
	'AGENT_MODEL_PAIRING',
	'AI_GATEWAY_CONSTRAINT',
	'SDK_CODE_AFTER_EXPORT_DEFAULT',
	'SDK_REPEATED_BRANCH_WIRING',
	'SDK_FORBIDDEN_CONSTRUCT',
	'SDK_AS_CONST',
	'SDK_PLACEHOLDER_WRAPPED',
	// Staged: fixture cardinality + empty-item semantics
	'SINGLE_ITEM_LIST_FIXTURE',
	'HTTP_ENVELOPE_NOT_UNWRAPPED',
	'ALWAYS_OUTPUT_DATA_NO_EFFECT',
	'EMPTY_ITEM_NOT_FILTERED',
	'SUBNODE_UNSAFE_JSON_REFERENCE',
	// Staged: skill→lint third cut (promote after evals)
	'MISSING_EXECUTE_ONCE',
	'WEEKDAY_DIGEST_CADENCE',
	'SIDE_EFFECT_JSON_CHAIN',
	'CODE_NODE_FORBIDDEN_IMPORT',
	'CODE_NESTED_TEMPLATE_LITERAL',
	'SDK_UNSOLICITED_STICKY',
	'AGENT_WITHOUT_PRIOR_AGGREGATE',
]);

export function isInformationalValidationCode(code: string): boolean {
	return INFORMATIONAL_VALIDATION_CODES.has(code);
}

export function partitionValidationIssues<T extends { code: string }>(
	issues: readonly T[],
): { errors: T[]; informational: T[] } {
	const errors: T[] = [];
	const informational: T[] = [];

	for (const issue of issues) {
		if (isInformationalValidationCode(issue.code)) {
			informational.push(issue);
		} else {
			errors.push(issue);
		}
	}

	return { errors, informational };
}
