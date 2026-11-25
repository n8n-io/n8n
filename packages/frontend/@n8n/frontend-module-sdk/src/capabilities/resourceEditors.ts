import { declareCapability } from '../declareCapability';
import type { ResourceEditors } from '../types/capability';

/**
 * Opens the shell's credential and variable editors with a custom save. The
 * editors are shell modals, and their stores live in shell features.
 *
 * Provided by the shell in `capabilities.manifest.ts`.
 */
export const resourceEditors = declareCapability<ResourceEditors>('resource-editors');
