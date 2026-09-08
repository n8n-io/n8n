import { mock } from 'vitest-mock-extended';
import { FacebookTrigger } from '../FacebookTrigger.node';
describe('FacebookTrigger', () => {
    let node;
    let mockWebhookFunctions;
    beforeEach(() => {
        node = new FacebookTrigger();
        mockWebhookFunctions = mock();
        vi.clearAllMocks();
    });
    describe('webhook', () => {
        const createMockResponse = () => ({
            status: vi.fn().mockReturnThis(),
            type: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis(),
            end: vi.fn(),
        });
        it('should respond to verification challenge as text/plain when the verify token matches', async () => {
            const mockResponse = createMockResponse();
            mockWebhookFunctions.getNode.mockReturnValue({ id: 'test-token' });
            mockWebhookFunctions.getWebhookName.mockReturnValue('setup');
            mockWebhookFunctions.getQueryData.mockReturnValue({
                'hub.challenge': 'test-challenge',
                'hub.verify_token': 'test-token',
            });
            mockWebhookFunctions.getBodyData.mockReturnValue({});
            mockWebhookFunctions.getHeaderData.mockReturnValue({});
            mockWebhookFunctions.getRequestObject.mockReturnValue({ rawBody: Buffer.from('') });
            mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
            mockWebhookFunctions.getNodeParameter.mockReturnValue('accessToken');
            mockWebhookFunctions.getCredentials.mockResolvedValue({ appSecret: '' });
            const result = await node.webhook.call(mockWebhookFunctions);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.type).toHaveBeenCalledWith('text/plain');
            expect(mockResponse.send).toHaveBeenCalledWith('test-challenge');
            expect(mockResponse.end).toHaveBeenCalled();
            expect(result).toEqual({ noWebhookResponse: true });
        });
        it('should reject the verification challenge when the verify token does not match', async () => {
            const mockResponse = createMockResponse();
            mockWebhookFunctions.getNode.mockReturnValue({ id: 'expected-token' });
            mockWebhookFunctions.getWebhookName.mockReturnValue('setup');
            mockWebhookFunctions.getQueryData.mockReturnValue({
                'hub.challenge': 'test-challenge',
                'hub.verify_token': 'attacker-supplied-token',
            });
            mockWebhookFunctions.getBodyData.mockReturnValue({});
            mockWebhookFunctions.getHeaderData.mockReturnValue({});
            mockWebhookFunctions.getRequestObject.mockReturnValue({ rawBody: Buffer.from('') });
            mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
            mockWebhookFunctions.getNodeParameter.mockReturnValue('accessToken');
            mockWebhookFunctions.getCredentials.mockResolvedValue({ appSecret: '' });
            const result = await node.webhook.call(mockWebhookFunctions);
            expect(mockResponse.send).not.toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(result).toEqual({});
        });
    });
});
//# sourceMappingURL=FacebookTrigger.node.test.js.map