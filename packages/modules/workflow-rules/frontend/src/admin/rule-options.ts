/** Catalogue rules with options an admin can change. */
export const CONFIGURABLE_RULE_IDS: ReadonlySet<string> = new Set([
	'http-request-credential',
	'allowed-http-domains',
	'execution-timeout',
	'max-nodes',
	'workflow-name-pattern',
]);
