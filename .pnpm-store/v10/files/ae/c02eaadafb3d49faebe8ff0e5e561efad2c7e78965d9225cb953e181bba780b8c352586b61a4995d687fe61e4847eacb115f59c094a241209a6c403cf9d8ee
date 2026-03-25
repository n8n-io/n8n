import * as oauth from 'oauth4webapi';
import { compactDecrypt } from 'jose/jwe/compact/decrypt';
import { JOSEError } from 'jose/errors';
let headers;
let USER_AGENT;
if (typeof navigator === 'undefined' || !navigator.userAgent?.startsWith?.('Mozilla/5.0 ')) {
    const NAME = 'openid-client';
    const VERSION = 'v6.5.0';
    USER_AGENT = `${NAME}/${VERSION}`;
    headers = { 'user-agent': USER_AGENT };
}
const int = (config) => {
    return props.get(config);
};
let props;
export { AuthorizationResponseError, ResponseBodyError, WWWAuthenticateChallengeError, } from 'oauth4webapi';
let tbi;
export function ClientSecretPost(clientSecret) {
    if (clientSecret !== undefined) {
        return oauth.ClientSecretPost(clientSecret);
    }
    tbi ||= new WeakMap();
    return (as, client, body, headers) => {
        let auth;
        if (!(auth = tbi.get(client))) {
            assertString(client.client_secret, '"metadata.client_secret"');
            auth = oauth.ClientSecretPost(client.client_secret);
            tbi.set(client, auth);
        }
        return auth(as, client, body, headers);
    };
}
function assertString(input, it) {
    if (typeof input !== 'string') {
        throw CodedTypeError(`${it} must be a string`, ERR_INVALID_ARG_TYPE);
    }
    if (input.length === 0) {
        throw CodedTypeError(`${it} must not be empty`, ERR_INVALID_ARG_VALUE);
    }
}
export function ClientSecretBasic(clientSecret) {
    if (clientSecret !== undefined) {
        return oauth.ClientSecretBasic(clientSecret);
    }
    tbi ||= new WeakMap();
    return (as, client, body, headers) => {
        let auth;
        if (!(auth = tbi.get(client))) {
            assertString(client.client_secret, '"metadata.client_secret"');
            auth = oauth.ClientSecretBasic(client.client_secret);
            tbi.set(client, auth);
        }
        return auth(as, client, body, headers);
    };
}
export function ClientSecretJwt(clientSecret, options) {
    if (clientSecret !== undefined) {
        return oauth.ClientSecretJwt(clientSecret, options);
    }
    tbi ||= new WeakMap();
    return (as, client, body, headers) => {
        let auth;
        if (!(auth = tbi.get(client))) {
            assertString(client.client_secret, '"metadata.client_secret"');
            auth = oauth.ClientSecretJwt(client.client_secret, options);
            tbi.set(client, auth);
        }
        return auth(as, client, body, headers);
    };
}
export function None() {
    return oauth.None();
}
export function PrivateKeyJwt(clientPrivateKey, options) {
    return oauth.PrivateKeyJwt(clientPrivateKey, options);
}
export function TlsClientAuth() {
    return oauth.TlsClientAuth();
}
export const skipStateCheck = oauth.skipStateCheck;
export const skipSubjectCheck = oauth.skipSubjectCheck;
export const customFetch = oauth.customFetch;
export const modifyAssertion = oauth.modifyAssertion;
export const clockSkew = oauth.clockSkew;
export const clockTolerance = oauth.clockTolerance;
const ERR_INVALID_ARG_VALUE = 'ERR_INVALID_ARG_VALUE';
const ERR_INVALID_ARG_TYPE = 'ERR_INVALID_ARG_TYPE';
function CodedTypeError(message, code, cause) {
    const err = new TypeError(message, { cause });
    Object.assign(err, { code });
    return err;
}
export function calculatePKCECodeChallenge(codeVerifier) {
    return oauth.calculatePKCECodeChallenge(codeVerifier);
}
export function randomPKCECodeVerifier() {
    return oauth.generateRandomCodeVerifier();
}
export function randomNonce() {
    return oauth.generateRandomNonce();
}
export function randomState() {
    return oauth.generateRandomState();
}
export class ClientError extends Error {
    code;
    constructor(message, options) {
        super(message, options);
        this.name = this.constructor.name;
        this.code = options?.code;
        Error.captureStackTrace?.(this, this.constructor);
    }
}
const decoder = new TextDecoder();
function e(msg, cause, code) {
    return new ClientError(msg, { cause, code });
}
function errorHandler(err) {
    if (err instanceof TypeError ||
        err instanceof ClientError ||
        err instanceof oauth.ResponseBodyError ||
        err instanceof oauth.AuthorizationResponseError ||
        err instanceof oauth.WWWAuthenticateChallengeError) {
        throw err;
    }
    if (err instanceof oauth.OperationProcessingError) {
        switch (err.code) {
            case oauth.HTTP_REQUEST_FORBIDDEN:
                throw e('only requests to HTTPS are allowed', err, err.code);
            case oauth.REQUEST_PROTOCOL_FORBIDDEN:
                throw e('only requests to HTTP or HTTPS are allowed', err, err.code);
            case oauth.RESPONSE_IS_NOT_CONFORM:
                throw e('unexpected HTTP response status code', err.cause, err.code);
            case oauth.RESPONSE_IS_NOT_JSON:
                throw e('unexpected response content-type', err.cause, err.code);
            case oauth.PARSE_ERROR:
                throw e('parsing error occured', err, err.code);
            case oauth.INVALID_RESPONSE:
                throw e('invalid response encountered', err, err.code);
            case oauth.JWT_CLAIM_COMPARISON:
                throw e('unexpected JWT claim value encountered', err, err.code);
            case oauth.JSON_ATTRIBUTE_COMPARISON:
                throw e('unexpected JSON attribute value encountered', err, err.code);
            case oauth.JWT_TIMESTAMP_CHECK:
                throw e('JWT timestamp claim value failed validation', err, err.code);
            default:
                throw e(err.message, err, err.code);
        }
    }
    if (err instanceof oauth.UnsupportedOperationError) {
        throw e('unsupported operation', err, err.code);
    }
    if (err instanceof DOMException) {
        switch (err.name) {
            case 'OperationError':
                throw e('runtime operation error', err, oauth.UNSUPPORTED_OPERATION);
            case 'NotSupportedError':
                throw e('runtime unsupported operation', err, oauth.UNSUPPORTED_OPERATION);
            case 'TimeoutError':
                throw e('operation timed out', err, 'OAUTH_TIMEOUT');
            case 'AbortError':
                throw e('operation aborted', err, 'OAUTH_ABORT');
        }
    }
    throw new ClientError('something went wrong', { cause: err });
}
export function randomDPoPKeyPair(alg, options) {
    return oauth
        .generateKeyPair(alg ?? 'ES256', {
        extractable: options?.extractable,
    })
        .catch(errorHandler);
}
function handleEntraId(server, as, options) {
    if (server.origin === 'https://login.microsoftonline.com' &&
        (!options?.algorithm || options.algorithm === 'oidc')) {
        as[kEntraId] = true;
        return true;
    }
    return false;
}
function handleB2Clogin(server, options) {
    if (server.hostname.endsWith('.b2clogin.com') &&
        (!options?.algorithm || options.algorithm === 'oidc')) {
        return true;
    }
    return false;
}
export async function dynamicClientRegistration(server, metadata, clientAuthentication, options) {
    let as;
    if (options?.flag === retry) {
        as = options.as;
    }
    else {
        as = await performDiscovery(server, options);
    }
    const clockSkew = metadata[oauth.clockSkew] ?? 0;
    const clockTolerance = metadata[oauth.clockTolerance] ?? 30;
    metadata = structuredClone(metadata);
    const timeout = options?.timeout ?? 30;
    const signal = AbortSignal.timeout(timeout * 1000);
    let registered;
    try {
        registered = await oauth
            .dynamicClientRegistrationRequest(as, metadata, {
            initialAccessToken: options?.initialAccessToken,
            DPoP: options?.DPoP,
            headers: new Headers(headers),
            [oauth.customFetch]: options?.[customFetch],
            [oauth.allowInsecureRequests]: options?.execute?.includes(allowInsecureRequests),
            signal,
        })
            .then(oauth.processDynamicClientRegistrationResponse);
    }
    catch (err) {
        if (retryable(err, options)) {
            return dynamicClientRegistration(server, metadata, clientAuthentication, {
                ...options,
                flag: retry,
                as,
            });
        }
        errorHandler(err);
    }
    registered[oauth.clockSkew] = clockSkew;
    registered[oauth.clockTolerance] = clockTolerance;
    const instance = new Configuration(as, registered.client_id, registered, clientAuthentication);
    let internals = int(instance);
    if (options?.[customFetch]) {
        internals.fetch = options[customFetch];
    }
    if (options?.timeout) {
        internals.timeout = options.timeout;
    }
    if (options?.execute) {
        for (const extension of options.execute) {
            extension(instance);
        }
    }
    return instance;
}
export async function discovery(server, clientId, metadata, clientAuthentication, options) {
    const as = await performDiscovery(server, options);
    const instance = new Configuration(as, clientId, metadata, clientAuthentication);
    let internals = int(instance);
    if (options?.[customFetch]) {
        internals.fetch = options[customFetch];
    }
    if (options?.timeout) {
        internals.timeout = options.timeout;
    }
    if (options?.execute) {
        for (const extension of options.execute) {
            extension(instance);
        }
    }
    return instance;
}
async function performDiscovery(server, options) {
    if (!(server instanceof URL)) {
        throw CodedTypeError('"server" must be an instance of URL', ERR_INVALID_ARG_TYPE);
    }
    const resolve = !server.href.includes('/.well-known/');
    const timeout = options?.timeout ?? 30;
    const signal = AbortSignal.timeout(timeout * 1000);
    const as = await (resolve
        ? oauth.discoveryRequest(server, {
            algorithm: options?.algorithm,
            [oauth.customFetch]: options?.[customFetch],
            [oauth.allowInsecureRequests]: options?.execute?.includes(allowInsecureRequests),
            signal,
            headers: new Headers(headers),
        })
        : (options?.[customFetch] || fetch)((() => {
            oauth.checkProtocol(server, options?.execute?.includes(allowInsecureRequests) ? false : true);
            return server.href;
        })(), {
            headers: Object.fromEntries(new Headers({ accept: 'application/json', ...headers }).entries()),
            body: undefined,
            method: 'GET',
            redirect: 'manual',
            signal,
        }))
        .then((response) => oauth.processDiscoveryResponse(oauth._nodiscoverycheck, response))
        .catch(errorHandler);
    if (resolve && new URL(as.issuer).href !== server.href) {
        handleEntraId(server, as, options) ||
            handleB2Clogin(server, options) ||
            (() => {
                throw new ClientError('discovered metadata issuer does not match the expected issuer', {
                    code: oauth.JSON_ATTRIBUTE_COMPARISON,
                    cause: {
                        expected: server.href,
                        body: as,
                        attribute: 'issuer',
                    },
                });
            })();
    }
    return as;
}
function isRsaOaep(input) {
    return input.name === 'RSA-OAEP';
}
function isEcdh(input) {
    return input.name === 'ECDH';
}
const ecdhEs = 'ECDH-ES';
const ecdhEsA128Kw = 'ECDH-ES+A128KW';
const ecdhEsA192Kw = 'ECDH-ES+A192KW';
const ecdhEsA256Kw = 'ECDH-ES+A256KW';
function checkEcdhAlg(algs, alg, pk) {
    switch (alg) {
        case undefined:
            algs.add(ecdhEs);
            algs.add(ecdhEsA128Kw);
            algs.add(ecdhEsA192Kw);
            algs.add(ecdhEsA256Kw);
            break;
        case ecdhEs:
        case ecdhEsA128Kw:
        case ecdhEsA192Kw:
        case ecdhEsA256Kw:
            algs.add(alg);
            break;
        default:
            throw CodedTypeError('invalid key alg', ERR_INVALID_ARG_VALUE, { pk });
    }
}
export function enableDecryptingResponses(config, contentEncryptionAlgorithms = [
    'A128GCM',
    'A192GCM',
    'A256GCM',
    'A128CBC-HS256',
    'A192CBC-HS384',
    'A256CBC-HS512',
], ...keys) {
    if (int(config).decrypt !== undefined) {
        throw new TypeError('enableDecryptingResponses can only be called on a given Configuration instance once');
    }
    if (keys.length === 0) {
        throw CodedTypeError('no keys were provided', ERR_INVALID_ARG_VALUE);
    }
    const algs = new Set();
    const normalized = [];
    for (const pk of keys) {
        let key;
        if ('key' in pk) {
            key = { key: pk.key };
            if (typeof pk.alg === 'string')
                key.alg = pk.alg;
            if (typeof pk.kid === 'string')
                key.kid = pk.kid;
        }
        else {
            key = { key: pk };
        }
        if (key.key.type !== 'private') {
            throw CodedTypeError('only private keys must be provided', ERR_INVALID_ARG_VALUE);
        }
        if (isRsaOaep(key.key.algorithm)) {
            switch (key.key.algorithm.hash.name) {
                case 'SHA-1':
                case 'SHA-256':
                case 'SHA-384':
                case 'SHA-512': {
                    let alg = 'RSA-OAEP';
                    let sha;
                    if ((sha = parseInt(key.key.algorithm.hash.name.slice(-3), 10))) {
                        alg = `${alg}-${sha}`;
                    }
                    key.alg ||= alg;
                    if (alg !== key.alg)
                        throw CodedTypeError('invalid key alg', ERR_INVALID_ARG_VALUE, {
                            pk,
                        });
                    algs.add(key.alg);
                    break;
                }
                default:
                    throw CodedTypeError('only SHA-512, SHA-384, SHA-256, and SHA-1 RSA-OAEP keys are supported', ERR_INVALID_ARG_VALUE);
            }
        }
        else if (isEcdh(key.key.algorithm)) {
            if (key.key.algorithm.namedCurve !== 'P-256') {
                throw CodedTypeError('Only P-256 ECDH keys are supported', ERR_INVALID_ARG_VALUE);
            }
            checkEcdhAlg(algs, key.alg, pk);
        }
        else if (key.key.algorithm.name === 'X25519') {
            checkEcdhAlg(algs, key.alg, pk);
        }
        else {
            throw CodedTypeError('only RSA-OAEP, ECDH, or X25519 keys are supported', ERR_INVALID_ARG_VALUE);
        }
        normalized.push(key);
    }
    int(config).decrypt = async (jwe) => decrypt(normalized, jwe, contentEncryptionAlgorithms, [...algs]).catch(errorHandler);
}
function checkCryptoKey(key, alg, epk) {
    if (alg.startsWith('RSA-OAEP')) {
        return true;
    }
    if (alg.startsWith('ECDH-ES')) {
        if (key.algorithm.name !== 'ECDH' && key.algorithm.name !== 'X25519') {
            return false;
        }
        if (key.algorithm.name === 'ECDH') {
            return epk?.crv === key.algorithm.namedCurve;
        }
        if (key.algorithm.name === 'X25519') {
            return epk?.crv === 'X25519';
        }
    }
    return false;
}
function selectCryptoKeyForDecryption(keys, alg, kid, epk) {
    const { 0: key, length } = keys.filter((key) => {
        if (kid !== key.kid) {
            return false;
        }
        if (key.alg && alg !== key.alg) {
            return false;
        }
        return checkCryptoKey(key.key, alg, epk);
    });
    if (!key) {
        throw e('no applicable decryption key selected', undefined, 'OAUTH_DECRYPTION_FAILED');
    }
    if (length !== 1) {
        throw e('multiple applicable decryption keys selected', undefined, 'OAUTH_DECRYPTION_FAILED');
    }
    return key.key;
}
async function decrypt(keys, jwe, contentEncryptionAlgorithms, keyManagementAlgorithms) {
    return decoder.decode((await compactDecrypt(jwe, (header) => {
        const { kid, alg, epk } = header;
        return selectCryptoKeyForDecryption(keys, alg, kid, epk);
    }, { keyManagementAlgorithms, contentEncryptionAlgorithms }).catch((err) => {
        if (err instanceof JOSEError) {
            throw e('decryption failed', err, 'OAUTH_DECRYPTION_FAILED');
        }
        errorHandler(err);
    })).plaintext);
}
function getServerHelpers(metadata) {
    return {
        supportsPKCE: {
            __proto__: null,
            value(method = 'S256') {
                return (metadata.code_challenge_methods_supported?.includes(method) === true);
            },
        },
    };
}
function addServerHelpers(metadata) {
    Object.defineProperties(metadata, getServerHelpers(metadata));
}
const kEntraId = Symbol();
export class Configuration {
    constructor(server, clientId, metadata, clientAuthentication) {
        if (typeof clientId !== 'string' || !clientId.length) {
            throw CodedTypeError('"clientId" must be a non-empty string', ERR_INVALID_ARG_TYPE);
        }
        if (typeof metadata === 'string') {
            metadata = { client_secret: metadata };
        }
        if (metadata?.client_id !== undefined && clientId !== metadata.client_id) {
            throw CodedTypeError('"clientId" and "metadata.client_id" must be the same', ERR_INVALID_ARG_VALUE);
        }
        const client = {
            ...structuredClone(metadata),
            client_id: clientId,
        };
        client[oauth.clockSkew] = metadata?.[oauth.clockSkew] ?? 0;
        client[oauth.clockTolerance] = metadata?.[oauth.clockTolerance] ?? 30;
        let auth;
        if (clientAuthentication) {
            auth = clientAuthentication;
        }
        else {
            if (typeof client.client_secret === 'string' &&
                client.client_secret.length) {
                auth = ClientSecretPost(client.client_secret);
            }
            else {
                auth = None();
            }
        }
        let c = Object.freeze(client);
        const clone = structuredClone(server);
        if (kEntraId in server) {
            clone[oauth._expectedIssuer] = ({ claims: { tid } }) => server.issuer.replace('{tenantid}', tid);
        }
        let as = Object.freeze(clone);
        props ||= new WeakMap();
        props.set(this, {
            __proto__: null,
            as,
            c,
            auth,
            tlsOnly: true,
            jwksCache: {},
        });
    }
    serverMetadata() {
        const metadata = structuredClone(int(this).as);
        addServerHelpers(metadata);
        return metadata;
    }
    clientMetadata() {
        const metadata = structuredClone(int(this).c);
        return metadata;
    }
    get timeout() {
        return int(this).timeout;
    }
    set timeout(value) {
        int(this).timeout = value;
    }
    get [customFetch]() {
        return int(this).fetch;
    }
    set [customFetch](value) {
        int(this).fetch = value;
    }
}
Object.freeze(Configuration.prototype);
function getHelpers(response) {
    let exp = undefined;
    if (response.expires_in !== undefined) {
        const now = new Date();
        now.setSeconds(now.getSeconds() + response.expires_in);
        exp = now.getTime();
    }
    return {
        expiresIn: {
            __proto__: null,
            value() {
                if (exp) {
                    const now = Date.now();
                    if (exp > now) {
                        return Math.floor((exp - now) / 1000);
                    }
                    return 0;
                }
                return undefined;
            },
        },
        claims: {
            __proto__: null,
            value() {
                try {
                    return oauth.getValidatedIdTokenClaims(this);
                }
                catch {
                    return undefined;
                }
            },
        },
    };
}
function addHelpers(response) {
    Object.defineProperties(response, getHelpers(response));
}
export function getDPoPHandle(config, keyPair, options) {
    checkConfig(config);
    return oauth.DPoP(int(config).c, keyPair, options);
}
function wait(interval) {
    return new Promise((resolve) => {
        setTimeout(resolve, interval * 1000);
    });
}
export async function pollDeviceAuthorizationGrant(config, deviceAuthorizationResponse, parameters, options) {
    checkConfig(config);
    parameters = new URLSearchParams(parameters);
    let interval = deviceAuthorizationResponse.interval ?? 5;
    const pollingSignal = options?.signal ??
        AbortSignal.timeout(deviceAuthorizationResponse.expires_in * 1000);
    try {
        pollingSignal.throwIfAborted();
    }
    catch (err) {
        errorHandler(err);
    }
    await wait(interval);
    const { as, c, auth, fetch, tlsOnly, nonRepudiation, timeout, decrypt } = int(config);
    const response = await oauth
        .deviceCodeGrantRequest(as, c, auth, deviceAuthorizationResponse.device_code, {
        [oauth.customFetch]: fetch,
        [oauth.allowInsecureRequests]: !tlsOnly,
        additionalParameters: parameters,
        DPoP: options?.DPoP,
        headers: new Headers(headers),
        signal: pollingSignal.aborted ? pollingSignal : signal(timeout),
    })
        .catch(errorHandler);
    const p = oauth.processDeviceCodeResponse(as, c, response, {
        [oauth.jweDecrypt]: decrypt,
    });
    let result;
    try {
        result = await p;
    }
    catch (err) {
        if (retryable(err, options)) {
            return pollDeviceAuthorizationGrant(config, {
                ...deviceAuthorizationResponse,
                interval,
            }, parameters, {
                ...options,
                signal: pollingSignal,
                flag: retry,
            });
        }
        if (err instanceof oauth.ResponseBodyError) {
            switch (err.error) {
                case 'slow_down':
                    interval += 5;
                case 'authorization_pending':
                    return pollDeviceAuthorizationGrant(config, {
                        ...deviceAuthorizationResponse,
                        interval,
                    }, parameters, {
                        ...options,
                        signal: pollingSignal,
                        flag: undefined,
                    });
            }
        }
        errorHandler(err);
    }
    result.id_token && (await nonRepudiation?.(response));
    addHelpers(result);
    return result;
}
export async function initiateDeviceAuthorization(config, parameters) {
    checkConfig(config);
    const { as, c, auth, fetch, tlsOnly, timeout } = int(config);
    return oauth
        .deviceAuthorizationRequest(as, c, auth, parameters, {
        [oauth.customFetch]: fetch,
        [oauth.allowInsecureRequests]: !tlsOnly,
        headers: new Headers(headers),
        signal: signal(timeout),
    })
        .then((response) => oauth.processDeviceAuthorizationResponse(as, c, response))
        .catch(errorHandler);
}
export async function initiateBackchannelAuthentication(config, parameters) {
    checkConfig(config);
    const { as, c, auth, fetch, tlsOnly, timeout } = int(config);
    return oauth
        .backchannelAuthenticationRequest(as, c, auth, parameters, {
        [oauth.customFetch]: fetch,
        [oauth.allowInsecureRequests]: !tlsOnly,
        headers: new Headers(headers),
        signal: signal(timeout),
    })
        .then((response) => oauth.processBackchannelAuthenticationResponse(as, c, response))
        .catch(errorHandler);
}
export async function pollBackchannelAuthenticationGrant(config, backchannelAuthenticationResponse, parameters, options) {
    checkConfig(config);
    parameters = new URLSearchParams(parameters);
    let interval = backchannelAuthenticationResponse.interval ?? 5;
    const pollingSignal = options?.signal ??
        AbortSignal.timeout(backchannelAuthenticationResponse.expires_in * 1000);
    try {
        pollingSignal.throwIfAborted();
    }
    catch (err) {
        errorHandler(err);
    }
    await wait(interval);
    const { as, c, auth, fetch, tlsOnly, nonRepudiation, timeout, decrypt } = int(config);
    const response = await oauth
        .backchannelAuthenticationGrantRequest(as, c, auth, backchannelAuthenticationResponse.auth_req_id, {
        [oauth.customFetch]: fetch,
        [oauth.allowInsecureRequests]: !tlsOnly,
        additionalParameters: parameters,
        DPoP: options?.DPoP,
        headers: new Headers(headers),
        signal: pollingSignal.aborted ? pollingSignal : signal(timeout),
    })
        .catch(errorHandler);
    const p = oauth.processBackchannelAuthenticationGrantResponse(as, c, response, {
        [oauth.jweDecrypt]: decrypt,
    });
    let result;
    try {
        result = await p;
    }
    catch (err) {
        if (retryable(err, options)) {
            return pollBackchannelAuthenticationGrant(config, {
                ...backchannelAuthenticationResponse,
                interval,
            }, parameters, {
                ...options,
                signal: pollingSignal,
                flag: retry,
            });
        }
        if (err instanceof oauth.ResponseBodyError) {
            switch (err.error) {
                case 'slow_down':
                    interval += 5;
                case 'authorization_pending':
                    return pollBackchannelAuthenticationGrant(config, {
                        ...backchannelAuthenticationResponse,
                        interval,
                    }, parameters, {
                        ...options,
                        signal: pollingSignal,
                        flag: undefined,
                    });
            }
        }
        errorHandler(err);
    }
    result.id_token && (await nonRepudiation?.(response));
    addHelpers(result);
    return result;
}
export function allowInsecureRequests(config) {
    int(config).tlsOnly = false;
}
export function setJwksCache(config, jwksCache) {
    int(config).jwksCache = structuredClone(jwksCache);
}
export function getJwksCache(config) {
    const cache = int(config).jwksCache;
    if (cache.uat) {
        return cache;
    }
    return undefined;
}
export function enableNonRepudiationChecks(config) {
    checkConfig(config);
    int(config).nonRepudiation = (response) => {
        const { as, fetch, tlsOnly, timeout, jwksCache } = int(config);
        return oauth
            .validateApplicationLevelSignature(as, response, {
            [oauth.customFetch]: fetch,
            [oauth.allowInsecureRequests]: !tlsOnly,
            headers: new Headers(headers),
            signal: signal(timeout),
            [oauth.jwksCache]: jwksCache,
        })
            .catch(errorHandler);
    };
}
export function useJwtResponseMode(config) {
    checkConfig(config);
    const { hybrid, implicit } = int(config);
    if (hybrid || implicit) {
        throw e('JARM cannot be combined with a hybrid or implicit response types', undefined, oauth.UNSUPPORTED_OPERATION);
    }
    int(config).jarm = (authorizationResponse, expectedState) => validateJARMResponse(config, authorizationResponse, expectedState);
}
export function enableDetachedSignatureResponseChecks(config) {
    if (!int(config).hybrid) {
        throw e('"code id_token" response type must be configured to be used first', undefined, oauth.UNSUPPORTED_OPERATION);
    }
    int(config).hybrid = (authorizationResponse, expectedNonce, expectedState, maxAge) => validateCodeIdTokenResponse(config, authorizationResponse, expectedNonce, expectedState, maxAge, true);
}
export async function implicitAuthentication(config, currentUrl, expectedNonce, checks) {
    checkConfig(config);
    if (!(currentUrl instanceof URL) &&
        !webInstanceOf(currentUrl, 'Request')) {
        throw CodedTypeError('"currentUrl" must be an instance of URL, or Request', ERR_INVALID_ARG_TYPE);
    }
    if (typeof expectedNonce !== 'string') {
        throw CodedTypeError('"expectedNonce" must be a string', ERR_INVALID_ARG_TYPE);
    }
    const { as, c, fetch, tlsOnly, timeout, decrypt, implicit, jwksCache } = int(config);
    if (!implicit) {
        throw new TypeError('implicitAuthentication() cannot be used by clients using flows other than response_type=id_token');
    }
    let params;
    if (!(currentUrl instanceof URL)) {
        const request = currentUrl;
        switch (request.method) {
            case 'GET':
                params = new URLSearchParams(new URL(request.url).hash.slice(1));
                break;
            case 'POST':
                params = new URLSearchParams(await oauth.formPostResponse(request));
                break;
            default:
                throw CodedTypeError('unexpected Request HTTP method', ERR_INVALID_ARG_VALUE);
        }
    }
    else {
        params = new URLSearchParams(currentUrl.hash.slice(1));
    }
    try {
        {
            const decoy = new URLSearchParams(params);
            decoy.delete('id_token');
            oauth.validateAuthResponse({
                ...as,
                authorization_response_iss_parameter_supported: undefined,
            }, c, decoy, checks?.expectedState);
        }
        {
            const decoy = new Response(JSON.stringify({
                access_token: 'decoy',
                token_type: 'bearer',
                id_token: params.get('id_token'),
            }), {
                headers: new Headers({ 'content-type': 'application/json' }),
            });
            const ref = await oauth.processAuthorizationCodeResponse(as, c, decoy, {
                expectedNonce,
                maxAge: checks?.maxAge,
                [oauth.jweDecrypt]: decrypt,
            });
            await oauth.validateApplicationLevelSignature(as, decoy, {
                [oauth.customFetch]: fetch,
                [oauth.allowInsecureRequests]: !tlsOnly,
                headers: new Headers(headers),
                signal: signal(timeout),
                [oauth.jwksCache]: jwksCache,
            });
            return oauth.getValidatedIdTokenClaims(ref);
        }
    }
    catch (err) {
        errorHandler(err);
    }
}
export function useCodeIdTokenResponseType(config) {
    checkConfig(config);
    const { jarm, implicit } = int(config);
    if (jarm || implicit) {
        throw e('"code id_token" response type cannot be combined with JARM or implicit response type', undefined, oauth.UNSUPPORTED_OPERATION);
    }
    int(config).hybrid = (authorizationResponse, expectedNonce, expectedState, maxAge) => validateCodeIdTokenResponse(config, authorizationResponse, expectedNonce, expectedState, maxAge, false);
}
export function useIdTokenResponseType(config) {
    checkConfig(config);
    const { jarm, hybrid } = int(config);
    if (jarm || hybrid) {
        throw e('"id_token" response type cannot be combined with JARM or hybrid response type', undefined, oauth.UNSUPPORTED_OPERATION);
    }
    int(config).implicit = true;
}
function stripParams(url) {
    url = new URL(url);
    url.search = '';
    url.hash = '';
    return url.href;
}
function webInstanceOf(input, toStringTag) {
    try {
        return Object.getPrototypeOf(input)[Symbol.toStringTag] === toStringTag;
    }
    catch {
        return false;
    }
}
export async function authorizationCodeGrant(config, currentUrl, checks, tokenEndpointParameters, options) {
    checkConfig(config);
    if (options?.flag !== retry &&
        !(currentUrl instanceof URL) &&
        !webInstanceOf(currentUrl, 'Request')) {
        throw CodedTypeError('"currentUrl" must be an instance of URL, or Request', ERR_INVALID_ARG_TYPE);
    }
    let authResponse;
    let redirectUri;
    const { as, c, auth, fetch, tlsOnly, jarm, hybrid, nonRepudiation, timeout, decrypt, implicit } = int(config);
    if (options?.flag === retry) {
        authResponse = options.authResponse;
        redirectUri = options.redirectUri;
    }
    else {
        if (!(currentUrl instanceof URL)) {
            const request = currentUrl;
            currentUrl = new URL(currentUrl.url);
            switch (request.method) {
                case 'GET':
                    break;
                case 'POST':
                    const params = new URLSearchParams(await oauth.formPostResponse(request));
                    if (hybrid) {
                        currentUrl.hash = params.toString();
                    }
                    else {
                        for (const [k, v] of params.entries()) {
                            currentUrl.searchParams.append(k, v);
                        }
                    }
                    break;
                default:
                    throw CodedTypeError('unexpected Request HTTP method', ERR_INVALID_ARG_VALUE);
            }
        }
        redirectUri = stripParams(currentUrl);
        switch (true) {
            case !!jarm:
                authResponse = await jarm(currentUrl, checks?.expectedState);
                break;
            case !!hybrid:
                authResponse = await hybrid(currentUrl, checks?.expectedNonce, checks?.expectedState, checks?.maxAge);
                break;
            case !!implicit:
                throw new TypeError('authorizationCodeGrant() cannot be used by response_type=id_token clients');
            default:
                try {
                    authResponse = oauth.validateAuthResponse(as, c, currentUrl.searchParams, checks?.expectedState);
                }
                catch (err) {
                    errorHandler(err);
                }
        }
    }
    const response = await oauth
        .authorizationCodeGrantRequest(as, c, auth, authResponse, redirectUri, checks?.pkceCodeVerifier || oauth._nopkce, {
        additionalParameters: tokenEndpointParameters,
        [oauth.customFetch]: fetch,
        [oauth.allowInsecureRequests]: !tlsOnly,
        DPoP: options?.DPoP,
        headers: new Headers(headers),
        signal: signal(timeout),
    })
        .catch(errorHandler);
    if (typeof checks?.expectedNonce === 'string' ||
        typeof checks?.maxAge === 'number') {
        checks.idTokenExpected = true;
    }
    const p = oauth.processAuthorizationCodeResponse(as, c, response, {
        expectedNonce: checks?.expectedNonce,
        maxAge: checks?.maxAge,
        requireIdToken: checks?.idTokenExpected,
        [oauth.jweDecrypt]: decrypt,
    });
    let result;
    try {
        result = await p;
    }
    catch (err) {
        if (retryable(err, options)) {
            return authorizationCodeGrant(config, undefined, checks, tokenEndpointParameters, {
                ...options,
                flag: retry,
                authResponse: authResponse,
                redirectUri: redirectUri,
            });
        }
        errorHandler(err);
    }
    result.id_token && (await nonRepudiation?.(response));
    addHelpers(result);
    return result;
}
async function validateJARMResponse(config, authorizationResponse, expectedState) {
    const { as, c, fetch, tlsOnly, timeout, decrypt, jwksCache } = int(config);
    return oauth
        .validateJwtAuthResponse(as, c, authorizationResponse, expectedState, {
        [oauth.customFetch]: fetch,
        [oauth.allowInsecureRequests]: !tlsOnly,
        headers: new Headers(headers),
        signal: signal(timeout),
        [oauth.jweDecrypt]: decrypt,
        [oauth.jwksCache]: jwksCache,
    })
        .catch(errorHandler);
}
async function validateCodeIdTokenResponse(config, authorizationResponse, expectedNonce, expectedState, maxAge, fapi) {
    if (typeof expectedNonce !== 'string') {
        throw CodedTypeError('"expectedNonce" must be a string', ERR_INVALID_ARG_TYPE);
    }
    if (expectedState !== undefined && typeof expectedState !== 'string') {
        throw CodedTypeError('"expectedState" must be a string', ERR_INVALID_ARG_TYPE);
    }
    const { as, c, fetch, tlsOnly, timeout, decrypt, jwksCache } = int(config);
    return (fapi
        ? oauth.validateDetachedSignatureResponse
        : oauth.validateCodeIdTokenResponse)(as, c, authorizationResponse, expectedNonce, expectedState, maxAge, {
        [oauth.customFetch]: fetch,
        [oauth.allowInsecureRequests]: !tlsOnly,
        headers: new Headers(headers),
        signal: signal(timeout),
        [oauth.jweDecrypt]: decrypt,
        [oauth.jwksCache]: jwksCache,
    }).catch(errorHandler);
}
export async function refreshTokenGrant(config, refreshToken, parameters, options) {
    checkConfig(config);
    parameters = new URLSearchParams(parameters);
    const { as, c, auth, fetch, tlsOnly, nonRepudiation, timeout, decrypt } = int(config);
    const response = await oauth
        .refreshTokenGrantRequest(as, c, auth, refreshToken, {
        [oauth.customFetch]: fetch,
        [oauth.allowInsecureRequests]: !tlsOnly,
        additionalParameters: parameters,
        DPoP: options?.DPoP,
        headers: new Headers(headers),
        signal: signal(timeout),
    })
        .catch(errorHandler);
    const p = oauth.processRefreshTokenResponse(as, c, response, {
        [oauth.jweDecrypt]: decrypt,
    });
    let result;
    try {
        result = await p;
    }
    catch (err) {
        if (retryable(err, options)) {
            return refreshTokenGrant(config, refreshToken, parameters, {
                ...options,
                flag: retry,
            });
        }
        errorHandler(err);
    }
    result.id_token && (await nonRepudiation?.(response));
    addHelpers(result);
    return result;
}
export async function clientCredentialsGrant(config, parameters, options) {
    checkConfig(config);
    parameters = new URLSearchParams(parameters);
    const { as, c, auth, fetch, tlsOnly, timeout } = int(config);
    const response = await oauth
        .clientCredentialsGrantRequest(as, c, auth, parameters, {
        [oauth.customFetch]: fetch,
        [oauth.allowInsecureRequests]: !tlsOnly,
        DPoP: options?.DPoP,
        headers: new Headers(headers),
        signal: signal(timeout),
    })
        .catch(errorHandler);
    const p = oauth.processClientCredentialsResponse(as, c, response);
    let result;
    try {
        result = await p;
    }
    catch (err) {
        if (retryable(err, options)) {
            return clientCredentialsGrant(config, parameters, {
                ...options,
                flag: retry,
            });
        }
        errorHandler(err);
    }
    addHelpers(result);
    return result;
}
export function buildAuthorizationUrl(config, parameters) {
    checkConfig(config);
    const { as, c, tlsOnly, hybrid, jarm, implicit } = int(config);
    const authorizationEndpoint = oauth.resolveEndpoint(as, 'authorization_endpoint', false, tlsOnly);
    parameters = new URLSearchParams(parameters);
    if (!parameters.has('client_id')) {
        parameters.set('client_id', c.client_id);
    }
    if (!parameters.has('request_uri') && !parameters.has('request')) {
        if (!parameters.has('response_type')) {
            parameters.set('response_type', hybrid ? 'code id_token' : implicit ? 'id_token' : 'code');
        }
        if (implicit && !parameters.has('nonce')) {
            throw CodedTypeError('response_type=id_token clients must provide a nonce parameter in their authorization request parameters', ERR_INVALID_ARG_VALUE);
        }
        if (jarm) {
            parameters.set('response_mode', 'jwt');
        }
    }
    for (const [k, v] of parameters.entries()) {
        authorizationEndpoint.searchParams.append(k, v);
    }
    return authorizationEndpoint;
}
export async function buildAuthorizationUrlWithJAR(config, parameters, signingKey, options) {
    checkConfig(config);
    const authorizationEndpoint = buildAuthorizationUrl(config, parameters);
    parameters = authorizationEndpoint.searchParams;
    if (!signingKey) {
        throw CodedTypeError('"signingKey" must be provided', ERR_INVALID_ARG_VALUE);
    }
    const { as, c } = int(config);
    const request = await oauth
        .issueRequestObject(as, c, parameters, signingKey, options)
        .catch(errorHandler);
    return buildAuthorizationUrl(config, { request });
}
export async function buildAuthorizationUrlWithPAR(config, parameters, options) {
    checkConfig(config);
    const authorizationEndpoint = buildAuthorizationUrl(config, parameters);
    const { as, c, auth, fetch, tlsOnly, timeout } = int(config);
    const response = await oauth
        .pushedAuthorizationRequest(as, c, auth, authorizationEndpoint.searchParams, {
        [oauth.customFetch]: fetch,
        [oauth.allowInsecureRequests]: !tlsOnly,
        DPoP: options?.DPoP,
        headers: new Headers(headers),
        signal: signal(timeout),
    })
        .catch(errorHandler);
    const p = oauth.processPushedAuthorizationResponse(as, c, response);
    let result;
    try {
        result = await p;
    }
    catch (err) {
        if (retryable(err, options)) {
            return buildAuthorizationUrlWithPAR(config, parameters, {
                ...options,
                flag: retry,
            });
        }
        errorHandler(err);
    }
    return buildAuthorizationUrl(config, { request_uri: result.request_uri });
}
export function buildEndSessionUrl(config, parameters) {
    checkConfig(config);
    const { as, c, tlsOnly } = int(config);
    const endSessionEndpoint = oauth.resolveEndpoint(as, 'end_session_endpoint', false, tlsOnly);
    parameters = new URLSearchParams(parameters);
    if (!parameters.has('client_id')) {
        parameters.set('client_id', c.client_id);
    }
    for (const [k, v] of parameters.entries()) {
        endSessionEndpoint.searchParams.append(k, v);
    }
    return endSessionEndpoint;
}
function checkConfig(input) {
    if (!(input instanceof Configuration)) {
        throw CodedTypeError('"config" must be an instance of Configuration', ERR_INVALID_ARG_TYPE);
    }
    if (Object.getPrototypeOf(input) !== Configuration.prototype) {
        throw CodedTypeError('subclassing Configuration is not allowed', ERR_INVALID_ARG_VALUE);
    }
}
function signal(timeout) {
    return timeout ? AbortSignal.timeout(timeout * 1000) : undefined;
}
export async function fetchUserInfo(config, accessToken, expectedSubject, options) {
    checkConfig(config);
    const { as, c, fetch, tlsOnly, nonRepudiation, timeout, decrypt } = int(config);
    const response = await oauth
        .userInfoRequest(as, c, accessToken, {
        [oauth.customFetch]: fetch,
        [oauth.allowInsecureRequests]: !tlsOnly,
        DPoP: options?.DPoP,
        headers: new Headers(headers),
        signal: signal(timeout),
    })
        .catch(errorHandler);
    let exec = oauth.processUserInfoResponse(as, c, expectedSubject, response, {
        [oauth.jweDecrypt]: decrypt,
    });
    let result;
    try {
        result = await exec;
    }
    catch (err) {
        if (retryable(err, options)) {
            return fetchUserInfo(config, accessToken, expectedSubject, {
                ...options,
                flag: retry,
            });
        }
        errorHandler(err);
    }
    oauth.getContentType(response) === 'application/jwt' &&
        (await nonRepudiation?.(response));
    return result;
}
function retryable(err, options) {
    if (options?.DPoP && options.flag !== retry) {
        return oauth.isDPoPNonceError(err);
    }
    return false;
}
export async function tokenIntrospection(config, token, parameters) {
    checkConfig(config);
    const { as, c, auth, fetch, tlsOnly, nonRepudiation, timeout, decrypt } = int(config);
    const response = await oauth
        .introspectionRequest(as, c, auth, token, {
        [oauth.customFetch]: fetch,
        [oauth.allowInsecureRequests]: !tlsOnly,
        additionalParameters: new URLSearchParams(parameters),
        headers: new Headers(headers),
        signal: signal(timeout),
    })
        .catch(errorHandler);
    const result = await oauth
        .processIntrospectionResponse(as, c, response, {
        [oauth.jweDecrypt]: decrypt,
    })
        .catch(errorHandler);
    oauth.getContentType(response) === 'application/token-introspection+jwt' &&
        (await nonRepudiation?.(response));
    return result;
}
const retry = Symbol();
export async function genericGrantRequest(config, grantType, parameters, options) {
    checkConfig(config);
    const { as, c, auth, fetch, tlsOnly, timeout, decrypt } = int(config);
    const result = await oauth
        .genericTokenEndpointRequest(as, c, auth, grantType, new URLSearchParams(parameters), {
        [oauth.customFetch]: fetch,
        [oauth.allowInsecureRequests]: !tlsOnly,
        DPoP: options?.DPoP,
        headers: new Headers(headers),
        signal: signal(timeout),
    })
        .then((response) => oauth.processGenericTokenEndpointResponse(as, c, response, {
        [oauth.jweDecrypt]: decrypt,
    }))
        .catch(errorHandler);
    addHelpers(result);
    return result;
}
export async function tokenRevocation(config, token, parameters) {
    checkConfig(config);
    const { as, c, auth, fetch, tlsOnly, timeout } = int(config);
    return oauth
        .revocationRequest(as, c, auth, token, {
        [oauth.customFetch]: fetch,
        [oauth.allowInsecureRequests]: !tlsOnly,
        additionalParameters: new URLSearchParams(parameters),
        headers: new Headers(headers),
        signal: signal(timeout),
    })
        .then(oauth.processRevocationResponse)
        .catch(errorHandler);
}
export async function fetchProtectedResource(config, accessToken, url, method, body, headers, options) {
    checkConfig(config);
    headers ||= new Headers();
    if (!headers.has('user-agent')) {
        headers.set('user-agent', USER_AGENT);
    }
    const { fetch, tlsOnly, timeout } = int(config);
    const exec = oauth.protectedResourceRequest(accessToken, method, url, headers, body, {
        [oauth.customFetch]: fetch,
        [oauth.allowInsecureRequests]: !tlsOnly,
        DPoP: options?.DPoP,
        signal: signal(timeout),
    });
    let result;
    try {
        result = await exec;
    }
    catch (err) {
        if (retryable(err, options)) {
            return fetchProtectedResource(config, accessToken, url, method, body, headers, {
                ...options,
                flag: retry,
            });
        }
        errorHandler(err);
    }
    return result;
}
//# sourceMappingURL=index.js.map