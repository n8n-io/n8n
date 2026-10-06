import { declareCapability } from '../declareCapability';
import type { CredentialCatalog } from '../types/capability';

/**
 * The credential types and the user's credentials. They live in the shell's credentials store,
 * which a module cannot reach. Render the `credential-picker` slot to pick a credential.
 */
export const credentialCatalog = declareCapability<CredentialCatalog>('credential-catalog');
