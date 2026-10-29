import { declareCapability } from '../declareCapability';
import type { McpExposeAllOffer } from '../types/capability';

/**
 * The expose-all-workflows experiment on the MCP settings page. Experiments read
 * PostHog and open shell modals, so they stay in the shell.
 *
 * Optional: read it with `tryUse()`. No provider means the experiment is off.
 * Provided by the shell in `capabilities.manifest.ts`.
 */
export const mcpExposeAllOffer = declareCapability<McpExposeAllOffer>('mcp-expose-all-offer');
