import type { SamlPreferences, SamlPreferencesAttributeMapping } from '@n8n/api-types';

export type SamlLoginBinding = SamlPreferences['loginBinding'];
export type SamlAttributeMapping = NonNullable<SamlPreferencesAttributeMapping>;
export type SamlUserAttributes = SamlAttributeMapping;
