/**
 * Account properties returned by Native Platform e.g. WAM
 */
export type NativeAccountInfo = {
    id: string;
    properties: object;
    userName: string;
};
/**
 * Token response returned by Native Platform
 */
export type PlatformAuthResponse = {
    access_token: string;
    account: NativeAccountInfo;
    client_info: string;
    expires_in: number;
    id_token: string;
    properties: NativeResponseProperties;
    scope: string;
    state: string;
    shr?: string;
    extendedLifetimeToken?: boolean;
};
/**
 * Properties returned under "properties" of the NativeResponse
 */
export type NativeResponseProperties = {
    MATS?: string;
};
/**
 * The native token broker can optionally include additional information about operations it performs. If that data is returned, MSAL.js will include the following properties in the telemetry it collects.
 */
export type MATS = {
    is_cached?: number;
    broker_version?: string;
    account_join_on_start?: string;
    account_join_on_end?: string;
    device_join?: string;
    prompt_behavior?: string;
    api_error_code?: number;
    ui_visible?: boolean;
    silent_code?: number;
    silent_bi_sub_code?: number;
    silent_message?: string;
    silent_status?: number;
    http_status?: number;
    http_event_count?: number;
};
export type PlatformDOMTokenResponse = {
    isSuccess: boolean;
    state?: string;
    accessToken: string;
    expiresIn: number;
    account: NativeAccountInfo;
    clientInfo: string;
    idToken: string;
    scopes: string;
    proofOfPossessionPayload?: string;
    extendedLifetimeToken?: boolean;
    error: ErrorResult;
    properties?: Record<string, string>;
};
export type ErrorResult = {
    code: string;
    description?: string;
    errorCode: string;
    protocolError?: string;
    status: string;
    properties?: object;
};
//# sourceMappingURL=PlatformAuthResponse.d.ts.map