import { SSO_ERROR_ACCESS_DENIED, SSO_ERROR_QUERY_PARAM } from '@n8n/api-types';

export const PROVISIONING_PREFERENCES_DB_KEY = 'features.provisioning';

/**
 * Instance-relative path the SSO callbacks redirect a login denied by role
 * mapping to, where the UI explains that the user has no access.
 */
export const SSO_ACCESS_DENIED_REDIRECT_PATH = `/signin?${SSO_ERROR_QUERY_PARAM}=${SSO_ERROR_ACCESS_DENIED}`;
