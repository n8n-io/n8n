/**
 * Gates the AI preferences feature: the Context settings UI and the injection of
 * saved preferences into the AI assistant and the MCP server.
 *
 * Multivariate: the enabled arm is the `variant` string, not `true`. Every reader
 * compares against `CONTEXT_PREFERENCES_ENABLED_VARIANT`, so `control` and an
 * unassigned user both fail closed.
 */
export const CONTEXT_PREFERENCES_FLAG = '111_context_preferences';
export const CONTEXT_PREFERENCES_CONTROL_VARIANT = 'control';
export const CONTEXT_PREFERENCES_ENABLED_VARIANT = 'variant';
