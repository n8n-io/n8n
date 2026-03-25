"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReuniteApi = exports.ReuniteApiError = void 0;
exports.streamToBuffer = streamToBuffer;
const colorette_1 = require("colorette");
const fetch_with_timeout_1 = require("../../utils/fetch-with-timeout");
class ReuniteApiError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
exports.ReuniteApiError = ReuniteApiError;
class ReuniteApiClient {
    constructor(version, command) {
        this.version = version;
        this.command = command;
        this.sunsetWarnings = [];
    }
    async request(url, options) {
        const headers = {
            ...options.headers,
            'user-agent': `redocly-cli/${this.version.trim()} ${this.command}`,
        };
        const response = await (0, fetch_with_timeout_1.default)(url, {
            ...options,
            headers,
        });
        this.collectSunsetWarning(response);
        return response;
    }
    collectSunsetWarning(response) {
        const sunsetTime = this.getSunsetDate(response);
        if (!sunsetTime)
            return;
        const sunsetDate = new Date(sunsetTime);
        if (sunsetTime > Date.now()) {
            this.sunsetWarnings.push({
                sunsetDate,
                isSunsetExpired: false,
            });
        }
        else {
            this.sunsetWarnings.push({
                sunsetDate,
                isSunsetExpired: true,
            });
        }
    }
    getSunsetDate(response) {
        const { headers } = response;
        if (!headers) {
            return;
        }
        const sunsetDate = headers.get('sunset') || headers.get('Sunset');
        if (!sunsetDate) {
            return;
        }
        return Date.parse(sunsetDate);
    }
}
class RemotesApi {
    constructor(client, domain, apiKey) {
        this.client = client;
        this.domain = domain;
        this.apiKey = apiKey;
    }
    async getParsedResponse(response) {
        const responseBody = await response.json();
        if (response.ok) {
            return responseBody;
        }
        throw new ReuniteApiError(`${responseBody.title || response.statusText || 'Unknown error'}.`, response.status);
    }
    async getDefaultBranch(organizationId, projectId) {
        try {
            const response = await this.client.request(`${this.domain}/api/orgs/${organizationId}/projects/${projectId}/source`, {
                timeout: fetch_with_timeout_1.DEFAULT_FETCH_TIMEOUT,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
            });
            const source = await this.getParsedResponse(response);
            return source.branchName;
        }
        catch (err) {
            const message = `Failed to fetch default branch. ${err.message}`;
            if (err instanceof ReuniteApiError) {
                throw new ReuniteApiError(message, err.status);
            }
            throw new Error(message);
        }
    }
    async upsert(organizationId, projectId, remote) {
        try {
            const response = await this.client.request(`${this.domain}/api/orgs/${organizationId}/projects/${projectId}/remotes`, {
                timeout: fetch_with_timeout_1.DEFAULT_FETCH_TIMEOUT,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    mountPath: remote.mountPath,
                    mountBranchName: remote.mountBranchName,
                    type: 'CICD',
                    autoMerge: true,
                }),
            });
            return await this.getParsedResponse(response);
        }
        catch (err) {
            const message = `Failed to upsert remote. ${err.message}`;
            if (err instanceof ReuniteApiError) {
                throw new ReuniteApiError(message, err.status);
            }
            throw new Error(message);
        }
    }
    async push(organizationId, projectId, payload, files) {
        const formData = new globalThis.FormData();
        formData.append('remoteId', payload.remoteId);
        formData.append('commit[message]', payload.commit.message);
        formData.append('commit[author][name]', payload.commit.author.name);
        formData.append('commit[author][email]', payload.commit.author.email);
        formData.append('commit[branchName]', payload.commit.branchName);
        payload.commit.url && formData.append('commit[url]', payload.commit.url);
        payload.commit.namespace && formData.append('commit[namespaceId]', payload.commit.namespace);
        payload.commit.sha && formData.append('commit[sha]', payload.commit.sha);
        payload.commit.repository && formData.append('commit[repositoryId]', payload.commit.repository);
        payload.commit.createdAt && formData.append('commit[createdAt]', payload.commit.createdAt);
        for (const file of files) {
            const blob = Buffer.isBuffer(file.stream)
                ? new Blob([file.stream])
                : new Blob([await streamToBuffer(file.stream)]);
            formData.append(`files[${file.path}]`, blob, file.path);
        }
        payload.isMainBranch && formData.append('isMainBranch', 'true');
        try {
            const response = await this.client.request(`${this.domain}/api/orgs/${organizationId}/projects/${projectId}/pushes`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: formData,
            });
            return await this.getParsedResponse(response);
        }
        catch (err) {
            const message = `Failed to push. ${err.message}`;
            if (err instanceof ReuniteApiError) {
                throw new ReuniteApiError(message, err.status);
            }
            throw new Error(message);
        }
    }
    async getRemotesList({ organizationId, projectId, mountPath, }) {
        try {
            const response = await this.client.request(`${this.domain}/api/orgs/${organizationId}/projects/${projectId}/remotes?filter=mountPath:/${mountPath}/`, {
                timeout: fetch_with_timeout_1.DEFAULT_FETCH_TIMEOUT,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
            });
            return await this.getParsedResponse(response);
        }
        catch (err) {
            const message = `Failed to get remote list. ${err.message}`;
            if (err instanceof ReuniteApiError) {
                throw new ReuniteApiError(message, err.status);
            }
            throw new Error(message);
        }
    }
    async getPush({ organizationId, projectId, pushId, }) {
        try {
            const response = await this.client.request(`${this.domain}/api/orgs/${organizationId}/projects/${projectId}/pushes/${pushId}`, {
                timeout: fetch_with_timeout_1.DEFAULT_FETCH_TIMEOUT,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
            });
            return await this.getParsedResponse(response);
        }
        catch (err) {
            const message = `Failed to get push status. ${err.message}`;
            if (err instanceof ReuniteApiError) {
                throw new ReuniteApiError(message, err.status);
            }
            throw new Error(message);
        }
    }
}
class ReuniteApi {
    constructor({ domain, apiKey, version, command, }) {
        this.command = command;
        this.version = version;
        this.apiClient = new ReuniteApiClient(this.version, this.command);
        this.remotes = new RemotesApi(this.apiClient, domain, apiKey);
    }
    reportSunsetWarnings() {
        const sunsetWarnings = this.apiClient.sunsetWarnings;
        if (sunsetWarnings.length) {
            const [{ isSunsetExpired, sunsetDate }] = sunsetWarnings.sort((a, b) => {
                // First, prioritize by expiration status
                if (a.isSunsetExpired !== b.isSunsetExpired) {
                    return a.isSunsetExpired ? -1 : 1;
                }
                // If both are either expired or not, sort by sunset date
                return a.sunsetDate > b.sunsetDate ? 1 : -1;
            });
            const updateVersionMessage = `Update to the latest version by running "npm install @redocly/cli@latest".`;
            if (isSunsetExpired) {
                process.stdout.write((0, colorette_1.red)(`The "${this.command}" command is not compatible with your version of Redocly CLI. ${updateVersionMessage}\n\n`));
            }
            else {
                process.stdout.write((0, colorette_1.yellow)(`The "${this.command}" command will be incompatible with your version of Redocly CLI after ${sunsetDate.toLocaleString()}. ${updateVersionMessage}\n\n`));
            }
        }
    }
}
exports.ReuniteApi = ReuniteApi;
async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}
