"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistryApi = void 0;
const utils_1 = require("../utils");
const domains_1 = require("./domains");
const version = require('../../package.json').version;
class RegistryApi {
    constructor(accessTokens, region) {
        this.accessTokens = accessTokens;
        this.region = region;
    }
    get accessToken() {
        return (0, utils_1.isNotEmptyObject)(this.accessTokens) && this.accessTokens[this.region];
    }
    getBaseUrl() {
        return `https://api.${(0, domains_1.getRedoclyDomain)()}/registry`;
    }
    setAccessTokens(accessTokens) {
        this.accessTokens = accessTokens;
        return this;
    }
    async request(path = '', options = {}) {
        const currentCommand = typeof process !== 'undefined' ? process.env?.REDOCLY_CLI_COMMAND || '' : '';
        const redoclyEnv = typeof process !== 'undefined' ? process.env?.REDOCLY_ENVIRONMENT || '' : '';
        const headers = Object.assign({}, options.headers || {}, {
            'x-redocly-cli-version': version,
            'user-agent': `redocly-cli / ${version} ${currentCommand} ${redoclyEnv}`,
        });
        if (!headers.hasOwnProperty('authorization')) {
            throw new Error('Unauthorized');
        }
        const requestOptions = {
            ...options,
            headers,
            agent: (0, utils_1.getProxyAgent)(),
        };
        const response = await fetch(`${this.getBaseUrl()}${path}`, requestOptions);
        if (response.status === 401) {
            throw new Error('Unauthorized');
        }
        if (response.status === 404) {
            const body = await response.json();
            throw new Error(body.code);
        }
        return response;
    }
    async authStatus(accessToken, verbose = false) {
        try {
            const response = await this.request('', { headers: { authorization: accessToken } });
            return await response.json();
        }
        catch (error) {
            if (verbose) {
                console.log(error);
            }
            throw error;
        }
    }
    async prepareFileUpload({ organizationId, name, version, filesHash, filename, isUpsert, }) {
        const response = await this.request(`/${organizationId}/${name}/${version}/prepare-file-upload`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: this.accessToken,
            },
            body: JSON.stringify({
                filesHash,
                filename,
                isUpsert,
            }),
        });
        if (response.ok) {
            return response.json();
        }
        throw new Error('Could not prepare file upload');
    }
    async pushApi({ organizationId, name, version, rootFilePath, filePaths, branch, isUpsert, isPublic, batchId, batchSize, }) {
        const response = await this.request(`/${organizationId}/${name}/${version}`, {
            method: 'PUT',
            headers: {
                'content-type': 'application/json',
                authorization: this.accessToken,
            },
            body: JSON.stringify({
                rootFilePath,
                filePaths,
                branch,
                isUpsert,
                isPublic,
                batchId,
                batchSize,
            }),
        });
        if (response.ok) {
            return;
        }
        throw new Error('Could not push api');
    }
}
exports.RegistryApi = RegistryApi;
