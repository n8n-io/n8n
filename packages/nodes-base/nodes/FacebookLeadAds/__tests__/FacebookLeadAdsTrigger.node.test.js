import { mock } from 'vitest-mock-extended';
import { FacebookLeadAdsTrigger } from '../FacebookLeadAdsTrigger.node';
describe('FacebookLeadAdsTrigger', () => {
    let node;
    let mockWebhookFunctions;
    beforeEach(() => {
        node = new FacebookLeadAdsTrigger();
        mockWebhookFunctions = mock();
        vi.clearAllMocks();
    });
    describe('webhook', () => {
        it('should respond to verification challenge as text/plain', async () => {
            const mockResponse = {
                status: vi.fn().mockReturnThis(),
                type: vi.fn().mockReturnThis(),
                send: vi.fn().mockReturnThis(),
                end: vi.fn(),
            };
            mockWebhookFunctions.getWebhookName.mockReturnValue('setup');
            mockWebhookFunctions.getQueryData.mockReturnValue({
                'hub.challenge': 'test-challenge',
                'hub.verify_token': 'test-node-id',
            });
            mockWebhookFunctions.getBodyData.mockReturnValue({});
            mockWebhookFunctions.getHeaderData.mockReturnValue({});
            mockWebhookFunctions.getRequestObject.mockReturnValue({ rawBody: Buffer.from('') });
            mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
            mockWebhookFunctions.getCredentials.mockResolvedValue({ clientSecret: 'secret' });
            mockWebhookFunctions.getNodeParameter.mockReturnValue('');
            mockWebhookFunctions.getNode.mockReturnValue(mock({ id: 'test-node-id' }));
            const result = await node.webhook.call(mockWebhookFunctions);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.type).toHaveBeenCalledWith('text/plain');
            expect(mockResponse.send).toHaveBeenCalledWith('test-challenge');
            expect(mockResponse.end).toHaveBeenCalled();
            expect(result).toEqual({ noWebhookResponse: true });
        });
    });
});
//# sourceMappingURL=FacebookLeadAdsTrigger.node.test.js.map