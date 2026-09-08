import { databricksApiRequest, extractResourceLocatorValue, getActiveCredentialType, getHost, } from '../helpers';
export async function execute(i) {
    const credentialType = getActiveCredentialType(this, i);
    const host = await getHost(this, credentialType);
    const catalogName = extractResourceLocatorValue(this.getNodeParameter('catalogName', i));
    await databricksApiRequest(this, credentialType, {
        method: 'DELETE',
        url: `${host}/api/2.1/unity-catalog/catalogs/${catalogName}`,
        json: true,
    });
    return [
        {
            json: { success: true, message: 'Catalog deleted successfully', catalogName },
            pairedItem: { item: i },
        },
    ];
}
//# sourceMappingURL=deleteCatalog.operation.js.map