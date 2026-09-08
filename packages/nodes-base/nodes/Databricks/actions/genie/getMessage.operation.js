import { databricksApiRequest, getActiveCredentialType, getHost } from '../helpers';
export async function execute(i) {
    const credentialType = getActiveCredentialType(this, i);
    const host = await getHost(this, credentialType);
    const spaceId = this.getNodeParameter('spaceId', i);
    const conversationId = this.getNodeParameter('conversationId', i);
    const messageId = this.getNodeParameter('messageId', i);
    const response = await databricksApiRequest(this, credentialType, {
        method: 'GET',
        url: `${host}/api/2.0/genie/spaces/${spaceId}/conversations/${conversationId}/messages/${messageId}`,
        headers: { 'Content-Type': 'application/json' },
        json: true,
    });
    return [{ json: response, pairedItem: { item: i } }];
}
//# sourceMappingURL=getMessage.operation.js.map