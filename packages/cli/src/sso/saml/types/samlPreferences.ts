import type { SamlAttributeMapping } from './samlAttributeMapping';

export interface SamlPreferences {
	mapping: SamlAttributeMapping;
	metadata: string;
	//TODO:SAML: add fields for separate SAML settins to generate metadata from
}
