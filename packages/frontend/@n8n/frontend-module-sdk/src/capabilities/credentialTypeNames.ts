import { declareCapability } from '../declareCapability';
import type { CredentialTypeNames } from '../types/capability';

/**
 * Reads the credential type display names from the shell's credentials store, so
 * a module shares its cache.
 *
 * Provided by the shell in `capabilities.manifest.ts`.
 */
export const credentialTypeNames = declareCapability<CredentialTypeNames>('credential-type-names');
