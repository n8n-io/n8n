import { NodeOperationError } from 'n8n-workflow';
import { databricksApiRequest, getActiveCredentialType, getHost } from '../helpers';
export async function execute(i) {
    const credentialType = getActiveCredentialType(this, i);
    const host = await getHost(this, credentialType);
    const volumePath = this.getNodeParameter('volumePath', i);
    const directoryPath = this.getNodeParameter('directoryPath', i);
    const parts = volumePath.split('.');
    if (parts.length !== 3) {
        throw new NodeOperationError(this.getNode(), 'Volume path must be in format: catalog.schema.volume (e.g., main.default.my_volume)');
    }
    const [catalog, schema, volume] = parts;
    await databricksApiRequest(this, credentialType, {
        method: 'DELETE',
        url: `${host}/api/2.0/fs/directories/Volumes/${catalog}/${schema}/${volume}/${directoryPath}`,
        json: true,
    });
    return [
        {
            json: {
                success: true,
                message: `Directory deleted successfully: ${directoryPath}`,
                volumePath,
                directoryPath,
            },
            pairedItem: { item: i },
        },
    ];
}
//# sourceMappingURL=deleteDirectory.operation.js.map