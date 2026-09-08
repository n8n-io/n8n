export declare const getN8NVersion: () => string;
export declare const N8N_VERSION: string;
export declare const BASE_URL: string;
export declare const BASE_URL_V2: string;
export declare const AIRTOP_HOOKS_BASE_URL: string;
export declare const DEFAULT_TIMEOUT_MINUTES = 10;
export declare const MIN_TIMEOUT_MINUTES = 1;
export declare const MAX_TIMEOUT_MINUTES = 10080;
export declare const DEFAULT_DOWNLOAD_TIMEOUT_SECONDS = 30;
export declare const SESSION_STATUS: {
    readonly INITIALIZING: 'initializing';
    readonly RUNNING: 'running';
};
export declare const OPERATION_TIMEOUT: number;
export declare const AGENT_MIN_TIMEOUT_SECONDS = 10;
export type TScrollingMode = 'manual' | 'automatic';
export declare const PROFILE_IDENTIFIER_REGEX: RegExp;
export declare const ERROR_MESSAGES: {
    readonly SESSION_ID_REQUIRED: "Please fill the 'Session ID' parameter";
    readonly WINDOW_ID_REQUIRED: "Please fill the 'Window ID' parameter";
    readonly URL_REQUIRED: "Please fill the 'URL' parameter";
    readonly PROFILE_NAME_INVALID: "'Browser Profile ID' should only contain letters, numbers and dashes";
    readonly TIMEOUT_MINUTES_INVALID: "Timeout must be between 1 and 10080 minutes";
    readonly TIMEOUT_REACHED: 'Timeout reached while waiting for the operation to complete';
    readonly AGENT_TIMEOUT_INVALID: "Timeout must be at least 10 seconds";
    readonly URL_INVALID: "'URL' must start with 'http' or 'https'";
    readonly PROFILE_NAME_REQUIRED: "'Browser Profile ID' is required when 'Save Profile' is enabled";
    readonly REQUIRED_PARAMETER: "Please fill the '{{field}}' parameter";
    readonly PROXY_URL_REQUIRED: "Please fill the 'Proxy URL' parameter";
    readonly PROXY_URL_INVALID: "'Proxy URL' must start with 'http' or 'https'";
    readonly SCREEN_RESOLUTION_INVALID: "'Screen Resolution' must be in the format 'width x height' (e.g. '1280x720')";
    readonly SCROLL_BY_AMOUNT_INVALID: "'Scroll By' amount must be a number and either a percentage or pixels (e.g. '100px' or '100%')";
    readonly SCROLL_MODE_INVALID: "Please fill any of the 'Scroll To Edge' or 'Scroll By' parameters";
};
//# sourceMappingURL=constants.d.ts.map