import * as client from './index.js';
import type { PrivateKey } from 'oauth4webapi';
import type * as express from 'express';
import type passport from 'passport';
export type VerifyFunction = (
/**
 * Parsed Token Endpoint Response returned by the authorization server with
 * attached helpers.
 */
tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers, verified: passport.AuthenticateCallback) => void;
export type VerifyFunctionWithRequest = (req: express.Request, 
/**
 * Parsed Token Endpoint Response returned by the authorization server with
 * attached helpers.
 */
tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers, verified: passport.AuthenticateCallback) => void;
/**
 * Retrieve an openid-client DPoPHandle for a given request.
 */
export type getDPoPHandle = (req: express.Request) => Promise<client.DPoPHandle | undefined> | client.DPoPHandle | undefined;
interface StrategyOptionsBase {
    /**
     * Openid-client Configuration instance.
     */
    config: client.Configuration;
    /**
     * Name of the strategy, default is the host component of the authorization
     * server's issuer identifier.
     */
    name?: string;
    /**
     * Property in the session to use for storing the authorization request state,
     * default is the host component of the authorization server's issuer
     * identifier.
     */
    sessionKey?: string;
    /**
     * Function used to retrieve an openid-client DPoPHandle for a given request,
     * when provided the strategy will use DPoP where applicable.
     */
    DPoP?: getDPoPHandle;
    /**
     * URL to which the authorization server will redirect the user after
     * obtaining authorization. This will be used as the `redirect_uri`
     * authorization request parameter unless specified elsewhere.
     */
    callbackURL?: string;
    /**
     * Authorization Request Scope. This will be used as the `scope` authorization
     * request parameter unless specified elsewhere.
     */
    scope?: string;
    /**
     * Whether the strategy will use PAR. Default is `false`.
     */
    usePAR?: boolean;
    /**
     * Whether the strategy will use JAR. Its value can be a private key to sign
     * with or an array with the private key and a modify assertion function that
     * will be used to modify the request object before it is signed. Default is
     * `false`.
     */
    useJAR?: false | client.CryptoKey | PrivateKey | [client.CryptoKey | PrivateKey, client.ModifyAssertionFunction];
    /**
     * Whether the verify function should get the `req` as first argument instead.
     * Default is `false`.
     */
    passReqToCallback?: boolean;
}
export interface StrategyOptions extends StrategyOptionsBase {
    passReqToCallback?: false;
}
export interface StrategyOptionsWithRequest extends StrategyOptionsBase {
    passReqToCallback: true;
}
export declare class Strategy implements passport.Strategy {
    /**
     * Name of the strategy
     */
    readonly name: string;
    constructor(options: StrategyOptions, verify: VerifyFunction);
    constructor(options: StrategyOptionsWithRequest, verify: VerifyFunctionWithRequest);
    /**
     * Return extra parameters to be included an authorization request.
     */
    authorizationRequestParams<TOptions extends passport.AuthenticateOptions = passport.AuthenticateOptions>(req: express.Request, options: TOptions): URLSearchParams | Record<string, string> | undefined;
    /**
     * Return extra parameters to be included in the authorization code grant
     * token endpoint request.
     */
    authorizationCodeGrantParameters<TOptions extends passport.AuthenticateOptions = passport.AuthenticateOptions>(req: express.Request, options: TOptions): URLSearchParams | Record<string, string> | undefined;
    /**
     * Return the current request URL.
     *
     * - Its `searchParams` are used as the authorization response parameters when
     *   the response type used by the client is `code`
     * - Its value stripped of `searchParams` and `hash` is used as the
     *   `redirect_uri` authorization code grant token endpoint parameter
     *
     * This function may need to be overridden by users if its return value does
     * not match the actual URL the authorization server redirected the user to.
     */
    currentUrl(req: express.Request): URL;
    /**
     * Authenticate request.
     */
    authenticate<TOptions extends passport.AuthenticateOptions = passport.AuthenticateOptions>(this: passport.StrategyCreated<Strategy, Strategy & passport.StrategyCreatedStatic>, req: express.Request, options: TOptions): void;
}
export {};
