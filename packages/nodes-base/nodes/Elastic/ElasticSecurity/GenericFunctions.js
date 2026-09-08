import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { toPathSegment } from '@utils/url';
import { removeTrailingSlash } from '@utils/utilities';
export async function elasticSecurityApiRequest(method, endpoint, body = {}, qs = {}) {
    const { baseUrl: rawBaseUrl } = await this.getCredentials('elasticSecurityApi');
    const baseUrl = removeTrailingSlash(rawBaseUrl);
    const options = {
        method,
        body,
        qs,
        uri: `${baseUrl}/api${endpoint}`,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    if (!Object.keys(qs).length) {
        delete options.qs;
    }
    try {
        return await this.helpers.requestWithAuthentication.call(this, 'elasticSecurityApi', options);
    }
    catch (error) {
        if (error?.error?.error === 'Not Acceptable' && error?.error?.message) {
            error.error.error = `${error.error.error}: ${error.error.message}`;
        }
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function elasticSecurityApiRequestAllItems(method, endpoint, body = {}, qs = {}) {
    let _page = 1;
    const returnData = [];
    let responseData;
    const resource = this.getNodeParameter('resource', 0);
    do {
        responseData = await elasticSecurityApiRequest.call(this, method, endpoint, body, qs);
        _page++;
        const items = resource === 'case' ? responseData.cases : responseData;
        returnData.push(...items);
    } while (returnData.length < responseData.total);
    return returnData;
}
export async function handleListing(method, endpoint, body = {}, qs = {}) {
    const returnAll = this.getNodeParameter('returnAll', 0);
    if (returnAll) {
        return await elasticSecurityApiRequestAllItems.call(this, method, endpoint, body, qs);
    }
    const responseData = await elasticSecurityApiRequestAllItems.call(this, method, endpoint, body, qs);
    const limit = this.getNodeParameter('limit', 0);
    return responseData.slice(0, limit);
}
/**
 * Retrieve a connector name and type from a connector ID.
 *
 * https://www.elastic.co/guide/en/kibana/master/get-connector-api.html
 */
export async function getConnector(connectorId) {
    const endpoint = `/actions/connector/${toPathSegment(connectorId)}`;
    const { id, name, connector_type_id: type, } = (await elasticSecurityApiRequest.call(this, 'GET', endpoint));
    return { id, name, type };
}
export function throwOnEmptyUpdate(resource) {
    throw new NodeOperationError(this.getNode(), `Please enter at least one field to update for the ${resource}`);
}
export async function getVersion(endpoint) {
    const { version } = (await elasticSecurityApiRequest.call(this, 'GET', endpoint));
    if (!version) {
        throw new NodeOperationError(this.getNode(), 'Cannot retrieve version for resource');
    }
    return version;
}
//# sourceMappingURL=GenericFunctions.js.map