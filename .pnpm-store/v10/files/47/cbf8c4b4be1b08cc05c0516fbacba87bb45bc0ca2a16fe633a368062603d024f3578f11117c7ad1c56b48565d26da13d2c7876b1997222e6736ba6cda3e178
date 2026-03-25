var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export const isApiKey = (creds) => {
    return typeof creds === 'string' || creds instanceof ApiKey;
};
export const mapApiKey = (creds) => {
    return creds instanceof ApiKey ? creds : new ApiKey(creds);
};
export class OidcAuthenticator {
    constructor(http, creds) {
        this.refresh = (localConfig) => __awaiter(this, void 0, void 0, function* () {
            const config = yield this.getOpenidConfig(localConfig);
            let authenticator;
            switch (this.creds.constructor) {
                case AuthUserPasswordCredentials:
                    authenticator = new UserPasswordAuthenticator(this.http, this.creds, config);
                    break;
                case AuthAccessTokenCredentials:
                    authenticator = new AccessTokenAuthenticator(this.http, this.creds, config);
                    break;
                case AuthClientCredentials:
                    authenticator = new ClientCredentialsAuthenticator(this.http, this.creds, config);
                    break;
                default:
                    throw new Error('unsupported credential type');
            }
            return authenticator.refresh().then((resp) => {
                this.accessToken = resp.accessToken;
                this.expiresAt = resp.expiresAt;
                this.refreshToken = resp.refreshToken;
                this.startTokenRefresh(authenticator);
            });
        });
        this.getOpenidConfig = (localConfig) => {
            return this.http.externalGet(localConfig.href).then((openidProviderConfig) => {
                const scopes = localConfig.scopes || [];
                return {
                    clientId: localConfig.clientId,
                    provider: openidProviderConfig,
                    scopes: scopes,
                };
            });
        };
        this.startTokenRefresh = (authenticator) => {
            if (this.creds.silentRefresh && !this.refreshRunning && this.refreshTokenProvided()) {
                this.refreshInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                    // check every 30s if the token will expire in <= 1m,
                    // if so, refresh
                    if (this.expiresAt - Date.now() <= 60000) {
                        const resp = yield authenticator.refresh();
                        this.accessToken = resp.accessToken;
                        this.expiresAt = resp.expiresAt;
                        this.refreshToken = resp.refreshToken;
                    }
                }), 30000);
                this.refreshRunning = true;
            }
        };
        this.stopTokenRefresh = () => {
            clearInterval(this.refreshInterval);
            this.refreshRunning = false;
        };
        this.refreshTokenProvided = () => {
            return this.refreshToken && this.refreshToken != '';
        };
        this.getAccessToken = () => {
            return this.accessToken;
        };
        this.getExpiresAt = () => {
            return this.expiresAt;
        };
        this.http = http;
        this.creds = creds;
        this.accessToken = '';
        this.refreshToken = '';
        this.expiresAt = 0;
        this.refreshRunning = false;
        // If the authentication method is access token,
        // our bearer token is already available for use
        if (this.creds instanceof AuthAccessTokenCredentials) {
            this.accessToken = this.creds.accessToken;
            this.expiresAt = this.creds.expiresAt;
            this.refreshToken = this.creds.refreshToken;
        }
    }
    resetExpiresAt() {
        this.expiresAt = 0;
    }
}
export class AuthUserPasswordCredentials {
    constructor(creds) {
        this.username = creds.username;
        this.password = creds.password;
        this.scopes = creds.scopes;
        this.silentRefresh = parseSilentRefresh(creds.silentRefresh);
    }
}
class UserPasswordAuthenticator {
    constructor(http, creds, config) {
        this.refresh = () => {
            this.validateOpenidConfig();
            return this.requestAccessToken()
                .then((tokenResp) => {
                return {
                    accessToken: tokenResp.access_token,
                    expiresAt: calcExpirationEpoch(tokenResp.expires_in),
                    refreshToken: tokenResp.refresh_token,
                };
            })
                .catch((err) => {
                return Promise.reject(new Error(`failed to refresh access token: ${err}`));
            });
        };
        this.validateOpenidConfig = () => {
            if (this.openidConfig.provider.grant_types_supported !== undefined &&
                !this.openidConfig.provider.grant_types_supported.includes('password')) {
                throw new Error('grant_type password not supported');
            }
            if (this.openidConfig.provider.token_endpoint.includes('https://login.microsoftonline.com')) {
                throw new Error('microsoft/azure recommends to avoid authentication using ' +
                    'username and password, so this method is not supported by this client');
            }
            this.openidConfig.scopes.push('offline_access');
        };
        this.requestAccessToken = () => {
            const url = this.openidConfig.provider.token_endpoint;
            const params = new URLSearchParams({
                grant_type: 'password',
                client_id: this.openidConfig.clientId,
                username: this.creds.username,
                password: this.creds.password,
                scope: this.openidConfig.scopes.join(' '),
            });
            const contentType = 'application/x-www-form-urlencoded;charset=UTF-8';
            return this.http.externalPost(url, params, contentType);
        };
        this.http = http;
        this.creds = creds;
        this.openidConfig = config;
        if (creds.scopes) {
            this.openidConfig.scopes.push(creds.scopes);
        }
    }
}
export class AuthAccessTokenCredentials {
    constructor(creds) {
        this.validate = (creds) => {
            if (creds.expiresIn === undefined) {
                throw new Error('AuthAccessTokenCredentials: expiresIn is required');
            }
            if (!Number.isInteger(creds.expiresIn) || creds.expiresIn <= 0) {
                throw new Error('AuthAccessTokenCredentials: expiresIn must be int > 0');
            }
        };
        this.validate(creds);
        this.accessToken = creds.accessToken;
        this.expiresAt = calcExpirationEpoch(creds.expiresIn);
        this.refreshToken = creds.refreshToken;
        this.silentRefresh = parseSilentRefresh(creds.silentRefresh);
    }
}
class AccessTokenAuthenticator {
    constructor(http, creds, config) {
        this.refresh = () => {
            if (this.creds.refreshToken === undefined || this.creds.refreshToken == '') {
                console.warn('AuthAccessTokenCredentials not provided with refreshToken, cannot refresh');
                return Promise.resolve({
                    accessToken: this.creds.accessToken,
                    expiresAt: this.creds.expiresAt,
                });
            }
            this.validateOpenidConfig();
            return this.requestAccessToken()
                .then((tokenResp) => {
                return {
                    accessToken: tokenResp.access_token,
                    expiresAt: calcExpirationEpoch(tokenResp.expires_in),
                    refreshToken: tokenResp.refresh_token,
                };
            })
                .catch((err) => {
                return Promise.reject(new Error(`failed to refresh access token: ${err}`));
            });
        };
        this.validateOpenidConfig = () => {
            if (this.openidConfig.provider.grant_types_supported === undefined ||
                !this.openidConfig.provider.grant_types_supported.includes('refresh_token')) {
                throw new Error('grant_type refresh_token not supported');
            }
        };
        this.requestAccessToken = () => {
            const url = this.openidConfig.provider.token_endpoint;
            const params = new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: this.openidConfig.clientId,
                refresh_token: this.creds.refreshToken,
            });
            const contentType = 'application/x-www-form-urlencoded;charset=UTF-8';
            return this.http.externalPost(url, params, contentType);
        };
        this.http = http;
        this.creds = creds;
        this.openidConfig = config;
    }
}
export class AuthClientCredentials {
    constructor(creds) {
        this.clientSecret = creds.clientSecret;
        this.scopes = creds.scopes;
        this.silentRefresh = parseSilentRefresh(creds.silentRefresh);
    }
}
class ClientCredentialsAuthenticator {
    constructor(http, creds, config) {
        this.refresh = () => {
            this.validateOpenidConfig();
            return this.requestAccessToken()
                .then((tokenResp) => {
                return {
                    accessToken: tokenResp.access_token,
                    expiresAt: calcExpirationEpoch(tokenResp.expires_in),
                    refreshToken: tokenResp.refresh_token,
                };
            })
                .catch((err) => {
                return Promise.reject(new Error(`failed to refresh access token: ${err}`));
            });
        };
        this.validateOpenidConfig = () => {
            if (this.openidConfig.scopes.length > 0) {
                return;
            }
            if (this.openidConfig.provider.token_endpoint.includes('https://login.microsoftonline.com')) {
                this.openidConfig.scopes.push(this.openidConfig.clientId + '/.default');
            }
        };
        this.requestAccessToken = () => {
            const url = this.openidConfig.provider.token_endpoint;
            const params = new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: this.openidConfig.clientId,
                client_secret: this.creds.clientSecret,
                scope: this.openidConfig.scopes.join(' '),
            });
            const contentType = 'application/x-www-form-urlencoded;charset=UTF-8';
            return this.http.externalPost(url, params, contentType);
        };
        this.http = http;
        this.creds = creds;
        this.openidConfig = config;
        if (creds.scopes) {
            this.openidConfig.scopes.push(creds.scopes);
        }
    }
}
export class ApiKey {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
}
function calcExpirationEpoch(expiresIn) {
    return Date.now() + (expiresIn - 2) * 1000; // -2 for some lag
}
function parseSilentRefresh(silentRefresh) {
    // Silent token refresh by default
    if (silentRefresh === undefined) {
        return true;
    }
    else {
        return silentRefresh;
    }
}
