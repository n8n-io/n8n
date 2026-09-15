/**
 * Expression globals that were removed in a major version, with the API that
 * replaces each one.
 *
 * An unbound global resolves to `undefined`, so a workflow calling a removed
 * helper would keep running and feed `undefined` into its downstream data. Both
 * engines therefore bind these names to a function that throws, which turns a
 * silent wrong result into an error naming the replacement.
 *
 * Lives in the runtime package because the in-isolate context is bundled from
 * here and `n8n-workflow` depends on this package, so both engines read one
 * definition.
 */
export const REMOVED_EXPRESSION_GLOBALS = {
	$getPairedItem: "$('Node').item, $('Node').itemMatching(n), or $('Node').pairedItem(n)",
} as const;

export type RemovedExpressionGlobal = keyof typeof REMOVED_EXPRESSION_GLOBALS;

/** The message both engines raise when a removed global is called. */
export function removedGlobalMessage(name: RemovedExpressionGlobal): string {
	return `${name} was removed. Use ${REMOVED_EXPRESSION_GLOBALS[name]} instead`;
}
