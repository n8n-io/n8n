import { NodeApiError, NodeOperationError } from 'n8n-workflow';
const ALLOWED_LOGO_HOSTNAME_SUFFIXES = ['.brandfetch.io', '.brandfetch.com'];
function assertSafeLogoUrl(rawUrl) {
    if (typeof rawUrl !== 'string' || rawUrl.length === 0) {
        throw new NodeOperationError(this.getNode(), 'Logo source URL is missing or invalid');
    }
    let parsed;
    try {
        parsed = new URL(rawUrl);
    }
    catch {
        throw new NodeOperationError(this.getNode(), `Logo source URL is not a valid URL: ${rawUrl}`);
    }
    if (parsed.protocol !== 'https:') {
        throw new NodeOperationError(this.getNode(), `Logo source URL must use https (got ${parsed.protocol})`);
    }
    const hostname = parsed.hostname.toLowerCase();
    const isAllowedHost = ALLOWED_LOGO_HOSTNAME_SUFFIXES.some((suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix));
    if (!isAllowedHost) {
        throw new NodeOperationError(this.getNode(), `Refusing to download logo from untrusted host: ${hostname}`);
    }
    return parsed.toString();
}
export async function brandfetchApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    try {
        let options = {
            method,
            qs,
            body,
            url: uri || `https://api.brandfetch.io/v2${resource}`,
            json: true,
        };
        options = Object.assign({}, options, option);
        if (!Object.keys(body).length) {
            delete options.body;
        }
        if (!Object.keys(qs).length) {
            delete options.qs;
        }
        const response = await this.helpers.requestWithAuthentication.call(this, 'brandfetchApi', options);
        if (response?.statusCode && response.statusCode !== 200) {
            throw new NodeApiError(this.getNode(), response);
        }
        return response;
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function fetchAndPrepareBinaryData(imageType, imageFormat, logoFormat, identifier, newItem, binaryKeySuffix = '') {
    const safeUrl = assertSafeLogoUrl.call(this, logoFormat.src);
    const data = (await this.helpers.httpRequest({
        method: 'GET',
        url: safeUrl,
        encoding: 'arraybuffer',
        json: false,
        returnFullResponse: false,
        disableFollowRedirect: true,
    }));
    const safeIdentifier = identifier.replace(/[^a-zA-Z0-9._-]/g, '_');
    const binaryKey = `${imageType}_${imageFormat}${binaryKeySuffix}`;
    newItem.binary[binaryKey] = await this.helpers.prepareBinaryData(Buffer.from(data), `${imageType}_${safeIdentifier}.${imageFormat}`);
}
//# sourceMappingURL=GenericFunctions.js.map