import * as http from 'http';
import { Storage } from './storage.js';
import { GoogleAuth } from 'google-auth-library';
type GoogleAuthLike = Pick<GoogleAuth, 'getCredentials' | 'sign'>;
/**
 * @deprecated Use {@link GoogleAuth} instead
 */
export interface AuthClient {
    sign(blobToSign: string): Promise<string>;
    getCredentials(): Promise<{
        client_email?: string;
    }>;
}
export interface BucketI {
    name: string;
}
export interface FileI {
    name: string;
}
export interface Query {
    [key: string]: string;
}
export interface GetSignedUrlConfigInternal {
    expiration: number;
    accessibleAt?: Date;
    method: string;
    extensionHeaders?: http.OutgoingHttpHeaders;
    queryParams?: Query;
    cname?: string;
    contentMd5?: string;
    contentType?: string;
    bucket: string;
    file?: string;
    /**
     * The host for the generated signed URL
     *
     * @example
     * 'https://localhost:8080/'
     */
    host?: string | URL;
    /**
     * An endpoint for generating the signed URL
     *
     * @example
     * 'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/'
     */
    signingEndpoint?: string | URL;
}
export interface SignerGetSignedUrlConfig {
    method: 'GET' | 'PUT' | 'DELETE' | 'POST';
    expires: string | number | Date;
    accessibleAt?: string | number | Date;
    virtualHostedStyle?: boolean;
    version?: 'v2' | 'v4';
    cname?: string;
    extensionHeaders?: http.OutgoingHttpHeaders;
    queryParams?: Query;
    contentMd5?: string;
    contentType?: string;
    /**
     * The host for the generated signed URL
     *
     * @example
     * 'https://localhost:8080/'
     */
    host?: string | URL;
    /**
     * An endpoint for generating the signed URL
     *
     * @example
     * 'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/'
     */
    signingEndpoint?: string | URL;
}
export type SignerGetSignedUrlResponse = string;
export type GetSignedUrlResponse = [SignerGetSignedUrlResponse];
export interface GetSignedUrlCallback {
    (err: Error | null, url?: string): void;
}
export declare enum SignerExceptionMessages {
    ACCESSIBLE_DATE_INVALID = "The accessible at date provided was invalid.",
    EXPIRATION_BEFORE_ACCESSIBLE_DATE = "An expiration date cannot be before accessible date.",
    X_GOOG_CONTENT_SHA256 = "The header X-Goog-Content-SHA256 must be a hexadecimal string."
}
/**
 * @const {string}
 * @deprecated - unused
 */
export declare const PATH_STYLED_HOST = "https://storage.googleapis.com";
export declare class URLSigner {
    private auth;
    private bucket;
    private file?;
    /**
     * A {@link Storage} object.
     *
     * @privateRemarks
     *
     * Technically this is a required field, however it would be a breaking change to
     * move it before optional properties. In the next major we should refactor the
     * constructor of this class to only accept a config object.
     */
    private storage;
    constructor(auth: AuthClient | GoogleAuthLike, bucket: BucketI, file?: FileI | undefined, 
    /**
     * A {@link Storage} object.
     *
     * @privateRemarks
     *
     * Technically this is a required field, however it would be a breaking change to
     * move it before optional properties. In the next major we should refactor the
     * constructor of this class to only accept a config object.
     */
    storage?: Storage);
    getSignedUrl(cfg: SignerGetSignedUrlConfig): Promise<SignerGetSignedUrlResponse>;
    private getSignedUrlV2;
    private getSignedUrlV4;
    /**
     * Create canonical headers for signing v4 url.
     *
     * The canonical headers for v4-signing a request demands header names are
     * first lowercased, followed by sorting the header names.
     * Then, construct the canonical headers part of the request:
     *  <lowercasedHeaderName> + ":" + Trim(<value>) + "\n"
     *  ..
     *  <lowercasedHeaderName> + ":" + Trim(<value>) + "\n"
     *
     * @param headers
     * @private
     */
    getCanonicalHeaders(headers: http.OutgoingHttpHeaders): string;
    getCanonicalRequest(method: string, path: string, query: string, headers: string, signedHeaders: string, contentSha256?: string): string;
    getCanonicalQueryParams(query: Query): string;
    getResourcePath(cname: boolean, bucket: string, file?: string): string;
    parseExpires(expires: string | number | Date, current?: Date): number;
    parseAccessibleAt(accessibleAt?: string | number | Date): number;
}
/**
 * Custom error type for errors related to getting signed errors and policies.
 *
 * @private
 */
export declare class SigningError extends Error {
    name: string;
}
export {};
