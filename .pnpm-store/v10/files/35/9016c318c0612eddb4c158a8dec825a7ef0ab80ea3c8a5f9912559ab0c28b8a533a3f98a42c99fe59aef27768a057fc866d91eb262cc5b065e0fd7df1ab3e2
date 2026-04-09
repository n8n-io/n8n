"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedoclyOAuthDeviceFlow = void 0;
const colorette_1 = require("colorette");
const childProcess = require("child_process");
const api_client_1 = require("../reunite/api/api-client");
class RedoclyOAuthDeviceFlow {
    constructor(baseUrl, clientName, version) {
        this.baseUrl = baseUrl;
        this.clientName = clientName;
        this.version = version;
        this.apiClient = new api_client_1.ReuniteApiClient(this.version, 'login');
    }
    async run() {
        const code = await this.getDeviceCode();
        process.stdout.write('Attempting to automatically open the SSO authorization page in your default browser.\n');
        process.stdout.write('If the browser does not open or you wish to use a different device to authorize this request, open the following URL:\n\n');
        process.stdout.write((0, colorette_1.blue)(code.verificationUri));
        process.stdout.write(`\n\n`);
        process.stdout.write(`Then enter the code:\n\n`);
        process.stdout.write((0, colorette_1.blue)(code.userCode));
        process.stdout.write(`\n\n`);
        this.openBrowser(code.verificationUriComplete);
        const accessToken = await this.pollingAccessToken(code.deviceCode, code.interval, code.expiresIn);
        process.stdout.write((0, colorette_1.green)('✅ Logged in\n\n'));
        return accessToken;
    }
    openBrowser(url) {
        try {
            const cmd = process.platform === 'win32'
                ? `start ${url}`
                : process.platform === 'darwin'
                    ? `open ${url}`
                    : `xdg-open ${url}`;
            childProcess.execSync(cmd);
        }
        catch {
            // silently fail if browser cannot be opened
        }
    }
    async verifyToken(accessToken) {
        try {
            const response = await this.sendRequest('/session', 'GET', undefined, {
                Cookie: `accessToken=${accessToken};`,
            });
            return !!response.user;
        }
        catch {
            return false;
        }
    }
    async verifyApiKey(apiKey) {
        try {
            const response = await this.sendRequest('/api-keys-verify', 'POST', {
                apiKey,
            });
            return !!response.success;
        }
        catch {
            return false;
        }
    }
    async refreshToken(refreshToken) {
        const response = await this.sendRequest(`/device-rotate-token`, 'POST', {
            grant_type: 'refresh_token',
            client_name: this.clientName,
            refresh_token: refreshToken,
        });
        if (!response.access_token) {
            throw new Error('Failed to refresh token');
        }
        return {
            access_token: response.access_token,
            refresh_token: response.refresh_token,
            expires_in: response.expires_in,
        };
    }
    async pollingAccessToken(deviceCode, interval, expiresIn) {
        return new Promise((resolve, reject) => {
            const intervalId = setInterval(async () => {
                const response = await this.getAccessToken(deviceCode);
                if (response.access_token) {
                    clearInterval(intervalId);
                    clearTimeout(timeoutId);
                    resolve(response);
                }
                if (response.error && response.error !== 'authorization_pending') {
                    clearInterval(intervalId);
                    clearTimeout(timeoutId);
                    reject(response.error_description);
                }
            }, interval * 1000);
            const timeoutId = setTimeout(async () => {
                clearInterval(intervalId);
                clearTimeout(timeoutId);
                reject('Authorization has expired. Please try again.');
            }, expiresIn * 1000);
        });
    }
    async getAccessToken(deviceCode) {
        return await this.sendRequest('/device-token', 'POST', {
            client_name: this.clientName,
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        });
    }
    async getDeviceCode() {
        const { device_code: deviceCode, user_code: userCode, verification_uri: verificationUri, verification_uri_complete: verificationUriComplete, interval = 10, expires_in: expiresIn = 300, } = await this.sendRequest('/device-authorize', 'POST', {
            client_name: this.clientName,
        });
        return {
            deviceCode,
            userCode,
            verificationUri,
            verificationUriComplete,
            interval,
            expiresIn,
        };
    }
    async sendRequest(url, method = 'GET', body = undefined, headers = {}) {
        url = `${this.baseUrl}${url}`;
        const response = await this.apiClient.request(url, {
            body: body ? JSON.stringify(body) : body,
            method,
            headers: { 'Content-Type': 'application/json', ...headers },
        });
        if (response.status === 204) {
            return { success: true };
        }
        return await response.json();
    }
}
exports.RedoclyOAuthDeviceFlow = RedoclyOAuthDeviceFlow;
