import { declareCapability } from '../declareCapability';

/**
 * Whether the PostHog flag of custom MCP servers gives this instance the variant `test`. A module
 * cannot import the PostHog store, so the shell reads the flag. Reads reactive state, so call it
 * in a `computed`.
 *
 * Optional: read it with `tryUse()`. No provider means the feature is off.
 * Provided by the shell in `capabilities.manifest.ts`.
 */
export const customMcpServersEnabled = declareCapability<() => boolean>(
	'custom-mcp-servers-enabled',
);
