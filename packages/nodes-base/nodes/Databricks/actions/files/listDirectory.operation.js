import { NodeOperationError } from 'n8n-workflow';
import { databricksApiRequest, getActiveCredentialType, getHost } from '../helpers';
export async function execute(i) {
    const credentialType = getActiveCredentialType(this, i);
    const host = await getHost(this, credentialType);
    const volumePath = this.getNodeParameter('volumePath', i);
    const directoryPath = this.getNodeParameter('directoryPath', i);
    const additionalFields = this.getNodeParameter('additionalFields', i, {});
    const parts = volumePath.split('.');
    if (parts.length !== 3) {
        throw new NodeOperationError(this.getNode(), 'Volume path must be in format: catalog.schema.volume (e.g., main.default.my_volume)');
    }
    const [catalog, schema, volume] = parts;
    const queryParams = {};
    if (additionalFields.pageSize !== undefined)
        queryParams.page_size = additionalFields.pageSize;
    if (additionalFields.pageToken)
        queryParams.page_token = additionalFields.pageToken;
    const response = await databricksApiRequest(this, credentialType, {
        method: 'GET',
        url: directoryPath
            ? `${host}/api/2.0/fs/directories/Volumes/${catalog}/${schema}/${volume}/${directoryPath}`
            : `${host}/api/2.0/fs/directories/Volumes/${catalog}/${schema}/${volume}`,
        qs: queryParams,
        json: true,
    });
    return [{ json: response, pairedItem: { item: i } }];
}
//# sourceMappingURL=listDirectory.operation.js.map