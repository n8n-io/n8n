import { databricksApiRequest, extractResourceLocatorValue, getActiveCredentialType, getHost, } from '../helpers';
export async function execute(i) {
    const credentialType = getActiveCredentialType(this, i);
    const host = await getHost(this, credentialType);
    const catalogName = extractResourceLocatorValue(this.getNodeParameter('catalogName', i, ''));
    const schemaName = extractResourceLocatorValue(this.getNodeParameter('schemaName', i, ''));
    const qs = {};
    if (catalogName)
        qs.catalog_name = catalogName;
    if (schemaName)
        qs.schema_name = schemaName;
    const response = await databricksApiRequest(this, credentialType, {
        method: 'GET',
        url: `${host}/api/2.1/unity-catalog/volumes`,
        qs,
        json: true,
    });
    return [{ json: response, pairedItem: { item: i } }];
}
//# sourceMappingURL=listVolumes.operation.js.map