import mime from 'mime-types';
import { NodeOperationError } from 'n8n-workflow';
import { databricksApiRequest, getActiveCredentialType, getHost, makePermissionErrorLegible, } from '../helpers';
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
    const downloadUrl = `${host}/api/2.0/fs/files/Volumes/${catalog}/${schema}/${volume}/${filePath}`;
    try {
        const response = await databricksApiRequest(this, credentialType, {
            method: 'GET',
            url: downloadUrl,
            encoding: 'arraybuffer',
            returnFullResponse: true,
        });
        const fileName = filePath.split('/').pop() || 'downloaded-file';
        let contentType = response.headers['content-type'];
        if (!contentType || contentType === 'application/octet-stream') {
            const detectedType = mime.lookup(fileName);
            contentType = detectedType || 'application/octet-stream';
        }
        const buffer = Buffer.from(response.body);
        return [
            {
                json: { fileName, size: buffer.length, contentType, catalog, schema, volume, filePath },
                binary: {
                    data: { data: buffer.toString('base64'), mimeType: contentType, fileName },
                },
                pairedItem: { item: i },
            },
        ];
    }
    catch (error) {
        makePermissionErrorLegible(error);
        if (this.continueOnFail()) {
            return [
                {
                    json: { error: error.message, catalog, schema, volume, filePath },
                    pairedItem: { item: i },
                },
            ];
        }
        throw error;
    }
}
//# sourceMappingURL=downloadFile.operation.js.map