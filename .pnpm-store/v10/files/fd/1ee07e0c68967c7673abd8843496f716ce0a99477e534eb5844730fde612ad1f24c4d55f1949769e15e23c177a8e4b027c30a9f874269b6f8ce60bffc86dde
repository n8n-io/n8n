'use strict';

var client = require('@aws-sdk/core/client');
var propertyProvider = require('@smithy/property-provider');
var sharedIniFileLoader = require('@smithy/shared-ini-file-loader');
var protocolHttp = require('@smithy/protocol-http');
var node_crypto = require('node:crypto');
var node_fs = require('node:fs');
var node_os = require('node:os');
var node_path = require('node:path');

class LoginCredentialsFetcher {
    profileData;
    init;
    callerClientConfig;
    static REFRESH_THRESHOLD = 5 * 60 * 1000;
    constructor(profileData, init, callerClientConfig) {
        this.profileData = profileData;
        this.init = init;
        this.callerClientConfig = callerClientConfig;
    }
    async loadCredentials() {
        const token = await this.loadToken();
        if (!token) {
            throw new propertyProvider.CredentialsProviderError(`Failed to load a token for session ${this.loginSession}, please re-authenticate using aws login`, { tryNextLink: false, logger: this.logger });
        }
        const accessToken = token.accessToken;
        const now = Date.now();
        const expiryTime = new Date(accessToken.expiresAt).getTime();
        const timeUntilExpiry = expiryTime - now;
        if (timeUntilExpiry <= LoginCredentialsFetcher.REFRESH_THRESHOLD) {
            return this.refresh(token);
        }
        return {
            accessKeyId: accessToken.accessKeyId,
            secretAccessKey: accessToken.secretAccessKey,
            sessionToken: accessToken.sessionToken,
            accountId: accessToken.accountId,
            expiration: new Date(accessToken.expiresAt),
        };
    }
    get logger() {
        return this.init?.logger;
    }
    get loginSession() {
        return this.profileData.login_session;
    }
    async refresh(token) {
        const { SigninClient, CreateOAuth2TokenCommand } = await import('@aws-sdk/nested-clients/signin');
        const { logger, userAgentAppId } = this.callerClientConfig ?? {};
        const isH2 = (requestHandler) => {
            return requestHandler?.metadata?.handlerProtocol === "h2";
        };
        const requestHandler = isH2(this.callerClientConfig?.requestHandler)
            ? undefined
            : this.callerClientConfig?.requestHandler;
        const region = this.profileData.region ?? (await this.callerClientConfig?.region?.()) ?? process.env.AWS_REGION;
        const client = new SigninClient({
            credentials: {
                accessKeyId: "",
                secretAccessKey: "",
            },
            region,
            requestHandler,
            logger,
            userAgentAppId,
            ...this.init?.clientConfig,
        });
        this.createDPoPInterceptor(client.middlewareStack);
        const commandInput = {
            tokenInput: {
                clientId: token.clientId,
                refreshToken: token.refreshToken,
                grantType: "refresh_token",
            },
        };
        try {
            const response = await client.send(new CreateOAuth2TokenCommand(commandInput));
            const { accessKeyId, secretAccessKey, sessionToken } = response.tokenOutput?.accessToken ?? {};
            const { refreshToken, expiresIn } = response.tokenOutput ?? {};
            if (!accessKeyId || !secretAccessKey || !sessionToken || !refreshToken) {
                throw new propertyProvider.CredentialsProviderError("Token refresh response missing required fields", {
                    logger: this.logger,
                    tryNextLink: false,
                });
            }
            const expiresInMs = (expiresIn ?? 900) * 1000;
            const expiration = new Date(Date.now() + expiresInMs);
            const updatedToken = {
                ...token,
                accessToken: {
                    ...token.accessToken,
                    accessKeyId: accessKeyId,
                    secretAccessKey: secretAccessKey,
                    sessionToken: sessionToken,
                    expiresAt: expiration.toISOString(),
                },
                refreshToken: refreshToken,
            };
            await this.saveToken(updatedToken);
            const newAccessToken = updatedToken.accessToken;
            return {
                accessKeyId: newAccessToken.accessKeyId,
                secretAccessKey: newAccessToken.secretAccessKey,
                sessionToken: newAccessToken.sessionToken,
                accountId: newAccessToken.accountId,
                expiration,
            };
        }
        catch (error) {
            if (error.name === "AccessDeniedException") {
                const errorType = error.error;
                let message;
                switch (errorType) {
                    case "TOKEN_EXPIRED":
                        message = "Your session has expired. Please reauthenticate.";
                        break;
                    case "USER_CREDENTIALS_CHANGED":
                        message =
                            "Unable to refresh credentials because of a change in your password. Please reauthenticate with your new password.";
                        break;
                    case "INSUFFICIENT_PERMISSIONS":
                        message =
                            "Unable to refresh credentials due to insufficient permissions. You may be missing permission for the 'CreateOAuth2Token' action.";
                        break;
                    default:
                        message = `Failed to refresh token: ${String(error)}. Please re-authenticate using \`aws login\``;
                }
                throw new propertyProvider.CredentialsProviderError(message, { logger: this.logger, tryNextLink: false });
            }
            throw new propertyProvider.CredentialsProviderError(`Failed to refresh token: ${String(error)}. Please re-authenticate using aws login`, { logger: this.logger });
        }
    }
    async loadToken() {
        const tokenFilePath = this.getTokenFilePath();
        try {
            let tokenData;
            try {
                tokenData = await sharedIniFileLoader.readFile(tokenFilePath, { ignoreCache: this.init?.ignoreCache });
            }
            catch {
                tokenData = await node_fs.promises.readFile(tokenFilePath, "utf8");
            }
            const token = JSON.parse(tokenData);
            const missingFields = ["accessToken", "clientId", "refreshToken", "dpopKey"].filter((k) => !token[k]);
            if (!token.accessToken?.accountId) {
                missingFields.push("accountId");
            }
            if (missingFields.length > 0) {
                throw new propertyProvider.CredentialsProviderError(`Token validation failed, missing fields: ${missingFields.join(", ")}`, {
                    logger: this.logger,
                    tryNextLink: false,
                });
            }
            return token;
        }
        catch (error) {
            throw new propertyProvider.CredentialsProviderError(`Failed to load token from ${tokenFilePath}: ${String(error)}`, {
                logger: this.logger,
                tryNextLink: false,
            });
        }
    }
    async saveToken(token) {
        const tokenFilePath = this.getTokenFilePath();
        const directory = node_path.dirname(tokenFilePath);
        try {
            await node_fs.promises.mkdir(directory, { recursive: true });
        }
        catch (error) {
        }
        await node_fs.promises.writeFile(tokenFilePath, JSON.stringify(token, null, 2), "utf8");
    }
    getTokenFilePath() {
        const directory = process.env.AWS_LOGIN_CACHE_DIRECTORY ?? node_path.join(node_os.homedir(), ".aws", "login", "cache");
        const loginSessionBytes = Buffer.from(this.loginSession, "utf8");
        const loginSessionSha256 = node_crypto.createHash("sha256").update(loginSessionBytes).digest("hex");
        return node_path.join(directory, `${loginSessionSha256}.json`);
    }
    derToRawSignature(derSignature) {
        let offset = 2;
        if (derSignature[offset] !== 0x02) {
            throw new Error("Invalid DER signature");
        }
        offset++;
        const rLength = derSignature[offset++];
        let r = derSignature.subarray(offset, offset + rLength);
        offset += rLength;
        if (derSignature[offset] !== 0x02) {
            throw new Error("Invalid DER signature");
        }
        offset++;
        const sLength = derSignature[offset++];
        let s = derSignature.subarray(offset, offset + sLength);
        r = r[0] === 0x00 ? r.subarray(1) : r;
        s = s[0] === 0x00 ? s.subarray(1) : s;
        const rPadded = Buffer.concat([Buffer.alloc(32 - r.length), r]);
        const sPadded = Buffer.concat([Buffer.alloc(32 - s.length), s]);
        return Buffer.concat([rPadded, sPadded]);
    }
    createDPoPInterceptor(middlewareStack) {
        middlewareStack.add((next) => async (args) => {
            if (protocolHttp.HttpRequest.isInstance(args.request)) {
                const request = args.request;
                const actualEndpoint = `${request.protocol}//${request.hostname}${request.port ? `:${request.port}` : ""}${request.path}`;
                const dpop = await this.generateDpop(request.method, actualEndpoint);
                request.headers = {
                    ...request.headers,
                    DPoP: dpop,
                };
            }
            return next(args);
        }, {
            step: "finalizeRequest",
            name: "dpopInterceptor",
            override: true,
        });
    }
    async generateDpop(method = "POST", endpoint) {
        const token = await this.loadToken();
        try {
            const privateKey = node_crypto.createPrivateKey({
                key: token.dpopKey,
                format: "pem",
                type: "sec1",
            });
            const publicKey = node_crypto.createPublicKey(privateKey);
            const publicDer = publicKey.export({ format: "der", type: "spki" });
            let pointStart = -1;
            for (let i = 0; i < publicDer.length; i++) {
                if (publicDer[i] === 0x04) {
                    pointStart = i;
                    break;
                }
            }
            const x = publicDer.slice(pointStart + 1, pointStart + 33);
            const y = publicDer.slice(pointStart + 33, pointStart + 65);
            const header = {
                alg: "ES256",
                typ: "dpop+jwt",
                jwk: {
                    kty: "EC",
                    crv: "P-256",
                    x: x.toString("base64url"),
                    y: y.toString("base64url"),
                },
            };
            const payload = {
                jti: crypto.randomUUID(),
                htm: method,
                htu: endpoint,
                iat: Math.floor(Date.now() / 1000),
            };
            const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
            const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
            const message = `${headerB64}.${payloadB64}`;
            const asn1Signature = node_crypto.sign("sha256", Buffer.from(message), privateKey);
            const rawSignature = this.derToRawSignature(asn1Signature);
            const signatureB64 = rawSignature.toString("base64url");
            return `${message}.${signatureB64}`;
        }
        catch (error) {
            throw new propertyProvider.CredentialsProviderError(`Failed to generate Dpop proof: ${error instanceof Error ? error.message : String(error)}`, { logger: this.logger, tryNextLink: false });
        }
    }
}

const fromLoginCredentials = (init) => async ({ callerClientConfig } = {}) => {
    init?.logger?.debug?.("@aws-sdk/credential-providers - fromLoginCredentials");
    const profiles = await sharedIniFileLoader.parseKnownFiles(init || {});
    const profileName = sharedIniFileLoader.getProfileName({
        profile: init?.profile ?? callerClientConfig?.profile,
    });
    const profile = profiles[profileName];
    if (!profile?.login_session) {
        throw new propertyProvider.CredentialsProviderError(`Profile ${profileName} does not contain login_session.`, {
            tryNextLink: true,
            logger: init?.logger,
        });
    }
    const fetcher = new LoginCredentialsFetcher(profile, init, callerClientConfig);
    const credentials = await fetcher.loadCredentials();
    return client.setCredentialFeature(credentials, "CREDENTIALS_LOGIN", "AD");
};

exports.fromLoginCredentials = fromLoginCredentials;
