import { NodeOperationError } from 'n8n-workflow';
import { databricksApiRequest, getActiveCredentialType, getHost } from '../helpers';
export async function execute(i) {
    const credentialType = getActiveCredentialType(this, i);
    const host = await getHost(this, credentialType);
    const dataFieldName = this.getNodeParameter('dataFieldName', i);
    const volumePath = this.getNodeParameter('volumePath', i);
    const filePath = this.getNodeParameter('filePath', i);
    const parts = volumePath.split('.');
    if (parts.length !== 3) {
        throw new NodeOperationError(this.getNode(), 'Volume path must be in format: catalog.schema.volume (e.g., main.default.my_volume)');
    }
    const [catalog, schema, volume] = parts;
    const binaryData = await this.helpers.getBinaryDataBuffer(i, dataFieldName);
    const items = this.getInputData();
    await databricksApiRequest(this, credentialType, {
        method: 'PUT',
        url: `${host}/api/2.0/fs/files/Volumes/${catalog}/${schema}/${volume}/${filePath}`,
        body: binaryData,
        headers: {
            'Content-Type': items[i].binary?.[dataFieldName]?.mimeType || 'application/octet-stream',
        },
        encoding: 'arraybuffer',
    });
    return [
        {
            json: { success: true, message: `File uploaded successfully to ${filePath}` },
            pairedItem: { item: i },
        },
    ];
}
//# sourceMappingURL=uploadFile.operation.js.map