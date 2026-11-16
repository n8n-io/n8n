import { declareCapability } from '../declareCapability';
import type { EnvironmentsSettings } from '../types/capability';

/**
 * Reads and changes the Environments settings. They live in the source control
 * store, which the shell keeps.
 *
 * Provided by the shell in `capabilities.manifest.ts`.
 */
export const environmentsSettings =
	declareCapability<EnvironmentsSettings>('environments-settings');
