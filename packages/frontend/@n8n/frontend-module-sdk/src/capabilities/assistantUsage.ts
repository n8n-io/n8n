import { declareCapability } from '../declareCapability';
import type { AssistantUsage } from '../types/capability';

/**
 * Reads the n8n Assistant usage of the instance for the insights Assistant tab.
 * No provider means no tab.
 *
 * Provided by the shell in `capabilities.manifest.ts`.
 */
export const assistantUsage = declareCapability<AssistantUsage>('assistant-usage');
