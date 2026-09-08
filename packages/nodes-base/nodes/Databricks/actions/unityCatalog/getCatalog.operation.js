import { databricksApiRequest, extractResourceLocatorValue, getActiveCredentialType, getHost, } from '../helpers';
export async function execute(i) {
    const credentialType = getActiveCredentialType(this, i);
    const host = await getHost(this, credentialType);
    const catalogName = extractResourceLocatorValue(this.getNodeParameter('catalogName', i));
    const response = await databricksApiRequest(this, credentialType, {
        method: 'GET',
        url: `${host}/api/2.1/unity-catalog/catalogs/${catalogName}`,
        json: true,
    });
    return [{ json: response, pairedItem: { item: i } }];
}
//# sourceMappingURL=getCatalog.operation.js.map