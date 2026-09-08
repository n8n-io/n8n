import { verifySignature } from '../FigmaTriggerHelpers';
describe('FigmaTriggerHelpers', () => {
    describe('verifySignature', () => {
        let mockWebhookFunctions;
        beforeEach(() => {
            mockWebhookFunctions = {
                getBodyData: vi.fn(),
                getWorkflowStaticData: vi.fn(),
            };
        });
        it('should return true when no passcode is stored (backward compatibility)', () => {
            mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({});
            mockWebhookFunctions.getBodyData.mockReturnValue({
                event_type: 'FILE_UPDATE',
                passcode: 'whatever',
            });
            const result = verifySignature.call(mockWebhookFunctions);
            expect(result).toBe(true);
        });
        it('should return true when stored passcode is empty (backward compatibility)', () => {
            mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
                webhookSecret: '',
            });
            mockWebhookFunctions.getBodyData.mockReturnValue({
                event_type: 'FILE_UPDATE',
                passcode: 'whatever',
            });
            const result = verifySignature.call(mockWebhookFunctions);
            expect(result).toBe(true);
        });
        it('should return true when passcode in body matches stored passcode', () => {
            const passcode = 'a1b2c3d4e5f6';
            mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
                webhookSecret: passcode,
            });
            mockWebhookFunctions.getBodyData.mockReturnValue({
                event_type: 'FILE_UPDATE',
                passcode,
            });
            const result = verifySignature.call(mockWebhookFunctions);
            expect(result).toBe(true);
        });
        it('should return false when passcode in body does not match (same length)', () => {
            mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
                webhookSecret: 'correct-passcode',
            });
            mockWebhookFunctions.getBodyData.mockReturnValue({
                event_type: 'FILE_UPDATE',
                passcode: 'wrongone-passcode',
            });
            const result = verifySignature.call(mockWebhookFunctions);
            expect(result).toBe(false);
        });
        it('should return false when passcode in body does not match (different length)', () => {
            mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
                webhookSecret: 'correct-passcode',
            });
            mockWebhookFunctions.getBodyData.mockReturnValue({
                event_type: 'FILE_UPDATE',
                passcode: 'wrong',
            });
            const result = verifySignature.call(mockWebhookFunctions);
            expect(result).toBe(false);
        });
        it('should return false when passcode is missing from body', () => {
            mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
                webhookSecret: 'expected-passcode',
            });
            mockWebhookFunctions.getBodyData.mockReturnValue({
                event_type: 'FILE_UPDATE',
            });
            const result = verifySignature.call(mockWebhookFunctions);
            expect(result).toBe(false);
        });
        it('should return false when passcode in body is not a string', () => {
            mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
                webhookSecret: 'expected-passcode',
            });
            mockWebhookFunctions.getBodyData.mockReturnValue({
                event_type: 'FILE_UPDATE',
                passcode: 12345,
            });
            const result = verifySignature.call(mockWebhookFunctions);
            expect(result).toBe(false);
        });
        it('should return false when passcode in body is empty string', () => {
            mockWebhookFunctions.getWorkflowStaticData.mockReturnValue({
                webhookSecret: 'expected-passcode',
            });
            mockWebhookFunctions.getBodyData.mockReturnValue({
                event_type: 'FILE_UPDATE',
                passcode: '',
            });
            const result = verifySignature.call(mockWebhookFunctions);
            expect(result).toBe(false);
        });
    });
});
//# sourceMappingURL=FigmaTriggerHelpers.test.js.map