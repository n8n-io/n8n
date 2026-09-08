import { databricksApiRequest, extractResourceLocatorValue, getActiveCredentialType, getHost, } from '../helpers';
export async function execute(i) {
    const credentialType = getActiveCredentialType(this, i);
    const host = await getHost(this, credentialType);
    const fullName = extractResourceLocatorValue(this.getNodeParameter('fullName', i));
    const response = await databricksApiRequest(this, credentialType, {
        method: 'GET',
        url: `${host}/api/2.1/unity-catalog/functions/${fullName}`,
        json: true,
    });
    return [{ json: response, pairedItem: { item: i } }];
}
//# sourceMappingURL=getFunction.operation.js.map