export const BASE_URL = 'https://api.airtop.ai/api/v1';
export const INTEGRATION_URL = 'https://portal-api.airtop.ai/integrations/v1/no-code';

export const DEFAULT_TIMEOUT_MINUTES = 10;
export const MIN_TIMEOUT_MINUTES = 1;
export const MAX_TIMEOUT_MINUTES = 10080;

export const ERROR_MESSAGES = {
	SESSION_ID_REQUIRED: "Please fill the 'Session ID' parameter",
	WINDOW_ID_REQUIRED: "Please fill the 'Window ID' parameter",
	URL_REQUIRED: "Please fill the 'URL' parameter",
	PROFILE_NAME_INVALID: "'Profile Name' should only contain letters, numbers and dashes",
	TIMEOUT_MINUTES_INVALID: `Timeout must be between ${MIN_TIMEOUT_MINUTES} and ${MAX_TIMEOUT_MINUTES} minutes`,
	URL_INVALID: "'URL' must start with 'http' or 'https'",
	PROFILE_NAME_REQUIRED: "'Profile Name' is required when 'Save Profile' is enabled",
	REQUIRED_PARAMETER: "Please fill the '{{field}}' parameter",
	PROXY_URL_REQUIRED: "Please fill the 'Proxy URL' parameter",
	PROXY_URL_INVALID: "'Proxy URL' must start with 'http' or 'https'",
	SCREEN_RESOLUTION_INVALID:
		"'Screen Resolution' must be in the format 'width x height' (e.g. '1280x720')",
};
