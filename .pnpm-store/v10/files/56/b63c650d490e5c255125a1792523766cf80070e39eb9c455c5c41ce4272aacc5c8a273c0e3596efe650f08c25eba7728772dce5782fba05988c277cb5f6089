/**
 * Copyright 2018 Google LLC
 *
 * Distributed under MIT license.
 * See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
 */
import { GaxiosOptions, GaxiosPromise } from 'gaxios';
export interface Transporter {
    request<T>(opts: GaxiosOptions): GaxiosPromise<T>;
}
export type GetTokenCallback = (err: Error | null, token?: TokenData) => void;
export interface Credentials {
    privateKey: string;
    clientEmail?: string;
}
export interface TokenData {
    refresh_token?: string;
    expires_in?: number;
    access_token?: string;
    token_type?: string;
    id_token?: string;
}
export interface TokenOptions {
    keyFile?: string;
    key?: string;
    email?: string;
    iss?: string;
    sub?: string;
    scope?: string | string[];
    additionalClaims?: {};
    eagerRefreshThresholdMillis?: number;
    transporter?: Transporter;
}
export interface GetTokenOptions {
    forceRefresh?: boolean;
}
export declare class GoogleToken {
    #private;
    get accessToken(): string | undefined;
    get idToken(): string | undefined;
    get tokenType(): string | undefined;
    get refreshToken(): string | undefined;
    expiresAt?: number;
    key?: string;
    keyFile?: string;
    iss?: string;
    sub?: string;
    scope?: string;
    rawToken?: TokenData;
    tokenExpires?: number;
    email?: string;
    additionalClaims?: {};
    eagerRefreshThresholdMillis?: number;
    transporter: Transporter;
    /**
     * Create a GoogleToken.
     *
     * @param options  Configuration object.
     */
    constructor(options?: TokenOptions);
    /**
     * Returns whether the token has expired.
     *
     * @return true if the token has expired, false otherwise.
     */
    hasExpired(): boolean;
    /**
     * Returns whether the token will expire within eagerRefreshThresholdMillis
     *
     * @return true if the token will be expired within eagerRefreshThresholdMillis, false otherwise.
     */
    isTokenExpiring(): boolean;
    /**
     * Returns a cached token or retrieves a new one from Google.
     *
     * @param callback The callback function.
     */
    getToken(opts?: GetTokenOptions): Promise<TokenData>;
    getToken(callback: GetTokenCallback, opts?: GetTokenOptions): void;
    /**
     * Given a keyFile, extract the key and client email if available
     * @param keyFile Path to a json, pem, or p12 file that contains the key.
     * @returns an object with privateKey and clientEmail properties
     */
    getCredentials(keyFile: string): Promise<Credentials>;
    /**
     * Revoke the token if one is set.
     *
     * @param callback The callback function.
     */
    revokeToken(): Promise<void>;
    revokeToken(callback: (err?: Error) => void): void;
}
