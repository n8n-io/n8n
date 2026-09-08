import { NodeOperationError } from 'n8n-workflow';
import { databricksApiRequest, extractResourceLocatorValue, getActiveCredentialType, getHost, } from '../helpers';
export async function execute(i) {
    const credentialType = getActiveCredentialType(this, i);
    const host = await getHost(this, credentialType);
    const catalogName = extractResourceLocatorValue(this.getNodeParameter('catalogName', i));
    const schemaName = extractResourceLocatorValue(this.getNodeParameter('schemaName', i));
    const volumeName = this.getNodeParameter('volumeName', i);
    const volumeType = this.getNodeParameter('volumeType', i);
    const additionalFields = this.getNodeParameter('additionalFields', i, {});
    const body = {
        catalog_name: catalogName,
        schema_name: schemaName,
        name: volumeName,
        volume_type: volumeType,
    };
    if (volumeType === 'EXTERNAL' && !additionalFields.storage_location) {
        throw new NodeOperationError(this.getNode(), 'Storage Location is required for EXTERNAL volumes', { itemIndex: i });
    }
    if (additionalFields.comment)
        body.comment = additionalFields.comment;
    if (additionalFields.storage_location)
        body.storage_location = additionalFields.storage_location;
    const response = await databricksApiRequest(this, credentialType, {
        method: 'POST',
        url: `${host}/api/2.1/unity-catalog/volumes`,
        body,
        headers: { 'Content-Type': 'application/json' },
        json: true,
    });
    return [{ json: response, pairedItem: { item: i } }];
}
//# sourceMappingURL=createVolume.operation.js.map