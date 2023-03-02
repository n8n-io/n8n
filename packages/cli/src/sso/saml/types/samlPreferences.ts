import type { SamlAttributeMapping } from './samlAttributeMapping';

export interface SamlPreferences {
	mapping: SamlAttributeMapping;
	metadata: string;
	loginEnabled: boolean;
	loginLabel: string;
}
