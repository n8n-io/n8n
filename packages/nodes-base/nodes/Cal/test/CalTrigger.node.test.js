import { randomBytes } from 'crypto';
import { CalTrigger } from '../CalTrigger.node';
import { verifySignature } from '../CalTriggerHelpers';
import { calApiRequest } from '../GenericFunctions';
vi.mock('../GenericFunctions');
vi.mock('../CalTriggerHelpers');
vi.mock('crypto', async () => ({
    ...(await vi.importActual('crypto')),
    randomBytes: vi.fn(),
}));
describe('CalTrigger', () => {
    let trigger;
    let mockHookFunctions;
    let mockWebhookFunctions;
    beforeEach(() => {
        vi.clearAllMocks();
        trigger = new CalTrigger().getNodeType(2);
        mockHookFunctions = {
            getNodeWebhookUrl: vi.fn(),
            getNodeParameter: vi.fn(),
            getWorkflowStaticData: vi.fn(),
            helpers: {},
        };
        mockWebhookFunctions = {
            getRequestObject: vi.fn(),
            getResponseObject: vi.fn(),
            helpers: {
                returnJsonArray: vi.fn((data) => data),
            },
        };
    });
    describe('webhookMethods.default.create', () => {
        it('should create webhook with auto-generated secret on v2', async () => {
            const subscriberUrl = 'https://example.com/webhook';
            const events = ['BOOKING_CREATED'];
            const webhookSecret = 'a'.repeat(64);
            const webhookId = 'webhook-123';
            mockHookFunctions.getNodeWebhookUrl.mockReturnValue(subscriberUrl);
            mockHookFunctions.getNodeParameter.mockImplementation((name) => {
                if (name === 'version')
                    return 2;
                if (name === 'events')
                    return events;
                if (name === 'options')
                    return {};
                return undefined;
            });
            const webhookData = {};
            mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);
            randomBytes.mockReturnValue({
                toString: vi.fn().mockReturnValue(webhookSecret),
            });
            calApiRequest.mockResolvedValue({
                webhook: { id: webhookId },
            });
            const result = await trigger.webhookMethods.default.create.call(mockHookFunctions);
            expect(result).toBe(true);
            expect(randomBytes).toHaveBeenCalledWith(32);
            expect(calApiRequest).toHaveBeenCalledWith('POST', '/webhooks', {
                subscriberUrl,
                eventTriggers: events,
                active: true,
                secret: webhookSecret,
            });
            expect(webhookData.webhookId).toBe(webhookId);
            expect(webhookData.webhookSecret).toBe(webhookSecret);
        });
        it('should create webhook with auto-generated secret on v1', async () => {
            const subscriberUrl = 'https://example.com/webhook';
            const events = ['BOOKING_CREATED'];
            const webhookSecret = 'b'.repeat(64);
            const webhookId = 'webhook-321';
            mockHookFunctions.getNodeWebhookUrl.mockReturnValue(subscriberUrl);
            mockHookFunctions.getNodeParameter.mockImplementation((name) => {
                if (name === 'version')
                    return 1;
                if (name === 'events')
                    return events;
                if (name === 'options')
                    return {};
                return undefined;
            });
            const webhookData = {};
            mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);
            randomBytes.mockReturnValue({
                toString: vi.fn().mockReturnValue(webhookSecret),
            });
            calApiRequest.mockResolvedValue({
                webhook: { id: webhookId },
            });
            const result = await trigger.webhookMethods.default.create.call(mockHookFunctions);
            expect(result).toBe(true);
            expect(calApiRequest).toHaveBeenCalledWith('POST', '/hooks', {
                subscriberUrl,
                eventTriggers: events,
                active: true,
                secret: webhookSecret,
            });
            expect(webhookData.webhookId).toBe(webhookId);
            expect(webhookData.webhookSecret).toBe(webhookSecret);
        });
        it('should return false when API does not return a webhook id', async () => {
            mockHookFunctions.getNodeWebhookUrl.mockReturnValue('https://example.com/webhook');
            mockHookFunctions.getNodeParameter.mockImplementation((name) => {
                if (name === 'version')
                    return 2;
                if (name === 'events')
                    return ['BOOKING_CREATED'];
                if (name === 'options')
                    return {};
                return undefined;
            });
            const webhookData = {};
            mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);
            randomBytes.mockReturnValue({
                toString: vi.fn().mockReturnValue('secret'),
            });
            calApiRequest.mockResolvedValue({ webhook: {} });
            const result = await trigger.webhookMethods.default.create.call(mockHookFunctions);
            expect(result).toBe(false);
            expect(webhookData.webhookId).toBeUndefined();
            expect(webhookData.webhookSecret).toBeUndefined();
        });
    });
    describe('webhookMethods.default.delete', () => {
        it('should delete webhook and clean up secret', async () => {
            const webhookId = 'webhook-123';
            mockHookFunctions.getNodeParameter.mockReturnValue(2);
            const webhookData = {
                webhookId,
                webhookSecret: 'test-secret',
            };
            mockHookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);
            calApiRequest.mockResolvedValue({});
            const result = await trigger.webhookMethods.default.delete.call(mockHookFunctions);
            expect(result).toBe(true);
            expect(calApiRequest).toHaveBeenCalledWith('DELETE', `/webhooks/${webhookId}`);
            expect(webhookData.webhookId).toBeUndefined();
            expect(webhookData.webhookSecret).toBeUndefined();
        });
        it('should return true when no webhookId is set', async () => {
            mockHookFunctions.getNodeParameter.mockReturnValue(2);
            mockHookFunctions.getWorkflowStaticData.mockReturnValue({});
            const result = await trigger.webhookMethods.default.delete.call(mockHookFunctions);
            expect(result).toBe(true);
            expect(calApiRequest).not.toHaveBeenCalled();
        });
    });
    describe('webhook', () => {
        it('should return 401 when signature verification fails', async () => {
            const mockResponse = {
                status: vi.fn().mockReturnThis(),
                send: vi.fn().mockReturnThis(),
                end: vi.fn(),
            };
            verifySignature.mockReturnValue(false);
            mockWebhookFunctions.getResponseObject.mockReturnValue(mockResponse);
            const result = await trigger.webhook.call(mockWebhookFunctions);
            expect(verifySignature).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
            expect(result).toEqual({
                noWebhookResponse: true,
            });
        });
        it('should process webhook when signature verification passes', async () => {
            const requestBody = {
                triggerEvent: 'BOOKING_CREATED',
                createdAt: '2024-01-01T00:00:00Z',
                payload: { bookingId: 'abc-123' },
            };
            verifySignature.mockReturnValue(true);
            mockWebhookFunctions.getRequestObject.mockReturnValue({
                body: requestBody,
            });
            const result = await trigger.webhook.call(mockWebhookFunctions);
            expect(verifySignature).toHaveBeenCalled();
            expect(result.workflowData).toEqual([
                {
                    triggerEvent: 'BOOKING_CREATED',
                    createdAt: '2024-01-01T00:00:00Z',
                    bookingId: 'abc-123',
                },
            ]);
        });
    });
});
//# sourceMappingURL=CalTrigger.node.test.js.map