import { NodeApiError, jsonParse } from 'n8n-workflow';
import { getCredentialsType, handleRateLimitHeaders, requestApi } from './helpers';
export async function discordApiRequest(method, endpoint, body, qs, headers = {}) {
    const authentication = this.getNodeParameter('authentication', 0, 'webhook');
    const credentialType = getCredentialsType(authentication);
    const options = {
        headers,
        method,
        qs,
        body,
        url: `https://discord.com/api/v10${endpoint}`,
        json: true,
    };
    if (credentialType === 'discordWebhookApi') {
        const credentials = await this.getCredentials('discordWebhookApi');
        options.url = credentials.webhookUri;
    }
    try {
        const response = await requestApi.call(this, options, credentialType, endpoint);
        await handleRateLimitHeaders(response.headers);
        return response.body || { success: true };
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function discordApiMultiPartRequest(method, endpoint, formData) {
    const headers = {
        'content-type': 'multipart/form-data; charset=utf-8',
    };
    const authentication = this.getNodeParameter('authentication', 0, 'webhook');
    const credentialType = getCredentialsType(authentication);
    const options = {
        headers,
        method,
        formData,
        url: `https://discord.com/api/v10${endpoint}`,
    };
    if (credentialType === 'discordWebhookApi') {
        const credentials = await this.getCredentials('discordWebhookApi');
        options.url = credentials.webhookUri;
    }
    try {
        const response = await requestApi.call(this, options, credentialType, endpoint);
        await handleRateLimitHeaders(response.headers);
        return jsonParse(response.body);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=discord.api.js.map