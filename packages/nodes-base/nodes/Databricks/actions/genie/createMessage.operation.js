import { databricksApiRequest, getActiveCredentialType, getHost } from '../helpers';
export async function execute(i) {
    const credentialType = getActiveCredentialType(this, i);
    const host = await getHost(this, credentialType);
    const spaceId = this.getNodeParameter('spaceId', i);
    const conversationId = this.getNodeParameter('conversationId', i);
    const response = await databricksApiRequest(this, credentialType, {
        method: 'POST',
        url: `${host}/api/2.0/genie/spaces/${spaceId}/conversations/${conversationId}/messages`,
        body: { content: this.getNodeParameter('message', i) },
        headers: { 'Content-Type': 'application/json' },
        json: true,
    });
    return [{ json: response, pairedItem: { item: i } }];
}
//# sourceMappingURL=createMessage.operation.js.map