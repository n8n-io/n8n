import { makeRestApiRequest } from '@/utils';
import type {
	IRestApiContext,
	SamlPreferencesLoginEnabled,
	SamlPreferences,
	SamlPreferencesExtractedData,
} from '@/Interface';

export const initSSO = (context: IRestApiContext): Promise<string> => {
	return makeRestApiRequest(context, 'GET', '/sso/saml/initsso');
};

export const getSamlMetadata = (context: IRestApiContext): Promise<SamlPreferences> => {
	return makeRestApiRequest(context, 'GET', '/sso/saml/metadata');
};

export const getSamlConfig = (
	context: IRestApiContext,
): Promise<SamlPreferences & SamlPreferencesExtractedData> => {
	return makeRestApiRequest(context, 'GET', '/sso/saml/config');
};

export const saveSamlConfig = (
	context: IRestApiContext,
	data: SamlPreferences,
): Promise<SamlPreferences | undefined> => {
	return makeRestApiRequest(context, 'POST', '/sso/saml/config', data);
};

export const toggleSamlConfig = (
	context: IRestApiContext,
	data: SamlPreferencesLoginEnabled,
): Promise<void> => {
	return makeRestApiRequest(context, 'POST', '/sso/saml/config/toggle', data);
};

export const testSamlConfig = (context: IRestApiContext): Promise<string> => {
	return makeRestApiRequest(context, 'GET', '/sso/saml/config/test');
};
