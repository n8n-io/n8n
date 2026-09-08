import { databricksApiRequest, getActiveCredentialType, getHost } from '../helpers';
export async function execute(i) {
    const credentialType = getActiveCredentialType(this, i);
    const host = await getHost(this, credentialType);
    const spaceId = this.getNodeParameter('spaceId', i);
    const response = await databricksApiRequest(this, credentialType, {
        method: 'GET',
        url: `${host}/api/2.0/genie/spaces/${spaceId}`,
        headers: { 'Content-Type': 'application/json' },
        json: true,
    });
    return [{ json: response, pairedItem: { item: i } }];
}
//# sourceMappingURL=getSpace.operation.js.map