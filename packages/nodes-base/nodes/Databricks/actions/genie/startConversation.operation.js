import { databricksApiRequest, getActiveCredentialType, getHost } from '../helpers';
export async function execute(i) {
    const credentialType = getActiveCredentialType(this, i);
    const host = await getHost(this, credentialType);
    const spaceId = this.getNodeParameter('spaceId', i);
    const response = await databricksApiRequest(this, credentialType, {
        method: 'POST',
        url: `${host}/api/2.0/genie/spaces/${spaceId}/start-conversation`,
        body: { content: this.getNodeParameter('initialMessage', i) },
        headers: { 'Content-Type': 'application/json' },
        json: true,
    });
    return [{ json: response, pairedItem: { item: i } }];
}
//# sourceMappingURL=startConversation.operation.js.map