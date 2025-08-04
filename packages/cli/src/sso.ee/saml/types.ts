import type { SamlPreferences } from '@n8n/api-types';

export type SamlLoginBinding = SamlPreferences['loginBinding'];
export type SamlAttributeMapping = NonNullable<SamlPreferences['mapping']>;
export type SamlUserAttributes = SamlAttributeMapping;
