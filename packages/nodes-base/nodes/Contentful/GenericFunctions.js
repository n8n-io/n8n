import { NodeApiError } from 'n8n-workflow';
export async function contentfulApiRequest(method, resource, body = {}, qs = {}, uri, _option = {}) {
    const credentials = await this.getCredentials('contentfulApi');
    const source = this.getNodeParameter('source', 0);
    const isPreview = source === 'previewApi';
    const options = {
        method,
        qs,
        body,
        uri: uri || `https://${isPreview ? 'preview' : 'cdn'}.contentful.com${resource}`,
        json: true,
    };
    if (isPreview) {
        qs.access_token = credentials.ContentPreviewaccessToken;
    }
    else {
        qs.access_token = credentials.ContentDeliveryaccessToken;
    }
    try {
        return await this.helpers.request(options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function contentfulApiRequestAllItems(propertyName, method, resource, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.limit = 100;
    query.skip = 0;
    do {
        responseData = await contentfulApiRequest.call(this, method, resource, body, query);
        query.skip = (query.skip + 1) * query.limit;
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (returnData.length < responseData.total);
    return returnData;
}
//# sourceMappingURL=GenericFunctions.js.map