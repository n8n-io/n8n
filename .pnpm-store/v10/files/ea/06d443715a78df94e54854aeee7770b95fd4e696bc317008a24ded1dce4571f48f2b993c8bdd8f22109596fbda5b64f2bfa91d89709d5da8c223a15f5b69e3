/**
 * Response properties that may be returned by the /authorize endpoint
 */
export type AuthorizeResponse = {
    /**
     * Authorization Code to be exchanged for tokens
     */
    code?: string;
    /**
     * Encrypted Authorize Response (EAR) JWE
     */
    ear_jwe?: string;
    /**
     * Client info object containing UserId and TenantId
     */
    client_info?: string;
    /**
     * State string, should match what was sent on request
     */
    state?: string;
    /**
     * Cloud instance returned when application is instance aware
     */
    cloud_instance_name?: string;
    /**
     * Cloud instance hostname returned when application is instance aware
     */
    cloud_instance_host_name?: string;
    /**
     * AAD Graph hostname returned when application is instance aware
     * https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-graph-api
     */
    cloud_graph_host_name?: string;
    /**
     * Microsoft Graph hostname returned when application is instance aware
     * https://docs.microsoft.com/en-us/graph/overview
     */
    msgraph_host?: string;
    /**
     * Server error code
     */
    error?: string;
    /**
     * Server error URI
     */
    error_uri?: string;
    /**
     * Server error description
     */
    error_description?: string;
    /**
     * Server Sub-Error
     */
    suberror?: string;
    /**
     * Timestamp of request
     */
    timestamp?: string;
    /**
     * Trace Id used to look up request in logs
     */
    trace_id?: string;
    /**
     * Correlation ID use to look up request in logs
     */
    correlation_id?: string;
    /**
     * Claims
     */
    claims?: string;
    /**
     * AccountId for the user, returned when platform broker is available to use
     */
    accountId?: string;
};
//# sourceMappingURL=AuthorizeResponse.d.ts.map