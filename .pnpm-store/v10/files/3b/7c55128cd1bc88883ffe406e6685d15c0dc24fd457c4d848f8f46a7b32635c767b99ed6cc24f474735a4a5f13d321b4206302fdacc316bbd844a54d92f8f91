export interface Credentials {
    /**
     * This field is only present if the access_type parameter was set to offline in the authentication request. For details, see Refresh tokens.
     */
    refresh_token?: string | null;
    /**
     * The time in ms at which this token is thought to expire.
     */
    expiry_date?: number | null;
    /**
     * A token that can be sent to a Google API.
     */
    access_token?: string | null;
    /**
     * Identifies the type of token returned. At this time, this field always has the value Bearer.
     */
    token_type?: string | null;
    /**
     * A JWT that contains identity information about the user that is digitally signed by Google.
     */
    id_token?: string | null;
    /**
     * The scopes of access granted by the access_token expressed as a list of space-delimited, case-sensitive strings.
     */
    scope?: string;
}
export interface CredentialRequest {
    /**
     * This field is only present if the access_type parameter was set to offline in the authentication request. For details, see Refresh tokens.
     */
    refresh_token?: string;
    /**
     * A token that can be sent to a Google API.
     */
    access_token?: string;
    /**
     * Identifies the type of token returned. At this time, this field always has the value Bearer.
     */
    token_type?: string;
    /**
     * The remaining lifetime of the access token in seconds.
     */
    expires_in?: number;
    /**
     * A JWT that contains identity information about the user that is digitally signed by Google.
     */
    id_token?: string;
    /**
     * The scopes of access granted by the access_token expressed as a list of space-delimited, case-sensitive strings.
     */
    scope?: string;
}
export interface JWTInput {
    type?: string;
    client_email?: string;
    private_key?: string;
    private_key_id?: string;
    project_id?: string;
    client_id?: string;
    client_secret?: string;
    refresh_token?: string;
    quota_project_id?: string;
    universe_domain?: string;
}
export interface ImpersonatedJWTInput {
    type?: string;
    source_credentials?: JWTInput;
    service_account_impersonation_url?: string;
    delegates?: string[];
    scopes?: string[];
}
export interface CredentialBody {
    client_email?: string;
    private_key?: string;
    universe_domain?: string;
}
