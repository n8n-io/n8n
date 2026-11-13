import { declareCapability } from '../declareCapability';
import type { TagNames } from '../types/capability';

/**
 * Reads the tag names from the shell's tags store, so a module shares its cache.
 *
 * Provided by the shell in `capabilities.manifest.ts`.
 */
export const tagNames = declareCapability<TagNames>('tag-names');
