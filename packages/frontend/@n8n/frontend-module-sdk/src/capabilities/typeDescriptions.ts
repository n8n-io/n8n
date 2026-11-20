import { declareCapability } from '../declareCapability';
import type { TypeDescriptions } from '../types/capability';

/**
 * Reads the node and credential types from the shell's stores, so a module shares their cache and
 * does not load the large type lists again.
 *
 * Provided by the shell in `capabilities.manifest.ts`.
 */
export const typeDescriptions = declareCapability<TypeDescriptions>('type-descriptions');
