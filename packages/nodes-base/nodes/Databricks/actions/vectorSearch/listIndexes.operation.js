import { databricksApiRequest, getActiveCredentialType, getHost } from '../helpers';
export async function execute(i) {
    const credentialType = getActiveCredentialType(this, i);
    const host = await getHost(this, credentialType);
    const endpointName = this.getNodeParameter('endpointName', i);
    const response = await databricksApiRequest(this, credentialType, {
        method: 'GET',
        url: `${host}/api/2.0/vector-search/indexes`,
        qs: { endpoint_name: endpointName },
        json: true,
    });
    return [{ json: response, pairedItem: { item: i } }];
}
//# sourceMappingURL=listIndexes.operation.js.map