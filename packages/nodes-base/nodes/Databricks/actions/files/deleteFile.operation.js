import { NodeOperationError } from 'n8n-workflow';
import { databricksApiRequest, getActiveCredentialType, getHost } from '../helpers';
export async function execute(i) {
    const credentialType = getActiveCredentialType(this, i);
    const host = await getHost(this, credentialType);
    const volumePath = this.getNodeParameter('volumePath', i);
    const filePath = this.getNodeParameter('filePath', i);
    const parts = volumePath.split('.');
    if (parts.length !== 3) {
        throw new NodeOperationError(this.getNode(), 'Volume path must be in format: catalog.schema.volume (e.g., main.default.my_volume)');
    }
    const [catalog, schema, volume] = parts;
    await databricksApiRequest(this, credentialType, {
        method: 'DELETE',
        url: `${host}/api/2.0/fs/files/Volumes/${catalog}/${schema}/${volume}/${filePath}`,
        json: true,
    });
    return [
        {
            json: {
                success: true,
                message: `File deleted successfully: ${filePath}`,
                volumePath,
                filePath,
            },
            pairedItem: { item: i },
        },
    ];
}
//# sourceMappingURL=deleteFile.operation.js.map