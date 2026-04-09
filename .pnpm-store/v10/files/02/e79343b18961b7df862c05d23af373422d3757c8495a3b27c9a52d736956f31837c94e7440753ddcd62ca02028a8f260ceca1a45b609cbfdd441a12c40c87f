"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const device_flow_1 = require("../device-flow");
jest.mock('child_process');
describe('RedoclyOAuthDeviceFlow', () => {
    const mockBaseUrl = 'https://test.redocly.com';
    const mockClientName = 'test-client';
    const mockVersion = '1.0.0';
    let flow;
    beforeEach(() => {
        flow = new device_flow_1.RedoclyOAuthDeviceFlow(mockBaseUrl, mockClientName, mockVersion);
        jest.resetAllMocks();
    });
    describe('verifyToken', () => {
        it('returns true for valid token', async () => {
            jest.spyOn(flow['apiClient'], 'request').mockResolvedValue({
                json: () => Promise.resolve({ user: { id: '123' } }),
            });
            const result = await flow.verifyToken('valid-token');
            expect(result).toBe(true);
        });
        it('returns false for invalid token', async () => {
            jest.spyOn(flow['apiClient'], 'request').mockRejectedValue(new Error('Invalid token'));
            const result = await flow.verifyToken('invalid-token');
            expect(result).toBe(false);
        });
    });
    describe('verifyApiKey', () => {
        it('returns true for valid API key', async () => {
            jest.spyOn(flow['apiClient'], 'request').mockResolvedValue({
                json: () => Promise.resolve({ success: true }),
            });
            const result = await flow.verifyApiKey('valid-key');
            expect(result).toBe(true);
        });
        it('returns false for invalid API key', async () => {
            jest.spyOn(flow['apiClient'], 'request').mockRejectedValue(new Error('Invalid API key'));
            const result = await flow.verifyApiKey('invalid-key');
            expect(result).toBe(false);
        });
    });
    describe('refreshToken', () => {
        it('successfully refreshes token', async () => {
            const mockResponse = {
                access_token: 'new-token',
                refresh_token: 'new-refresh',
                expires_in: 3600,
            };
            jest.spyOn(flow['apiClient'], 'request').mockResolvedValue({
                json: () => Promise.resolve(mockResponse),
            });
            const result = await flow.refreshToken('old-refresh-token');
            expect(result).toEqual(mockResponse);
        });
        it('throws error when refresh fails', async () => {
            jest.spyOn(flow['apiClient'], 'request').mockResolvedValue({
                json: () => Promise.resolve({}),
            });
            await expect(flow.refreshToken('invalid-refresh')).rejects.toThrow('Failed to refresh token');
        });
    });
});
