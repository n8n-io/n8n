"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
jest.mock('@redocly/openapi-core', () => ({
    pause: jest.requireActual('@redocly/openapi-core').pause,
}));
describe('retryUntilConditionMet()', () => {
    it('should retry until condition meet and return result', async () => {
        const operation = jest
            .fn()
            .mockResolvedValueOnce({ status: 'pending' })
            .mockResolvedValueOnce({ status: 'pending' })
            .mockResolvedValueOnce({ status: 'done' });
        const data = await (0, utils_1.retryUntilConditionMet)({
            operation,
            condition: (result) => result?.status === 'done',
            retryIntervalMs: 100,
            retryTimeoutMs: 1000,
        });
        expect(data).toEqual({ status: 'done' });
    });
    it('should throw error if condition not meet for desired timeout', async () => {
        const operation = jest.fn().mockResolvedValue({ status: 'pending' });
        await expect((0, utils_1.retryUntilConditionMet)({
            operation,
            condition: (result) => result?.status === 'done',
            retryIntervalMs: 100,
            retryTimeoutMs: 1000,
        })).rejects.toThrow('Timeout exceeded.');
    });
    it('should call "onConditionNotMet" and "onRetry" callbacks', async () => {
        const operation = jest
            .fn()
            .mockResolvedValueOnce({ status: 'pending' })
            .mockResolvedValueOnce({ status: 'pending' })
            .mockResolvedValueOnce({ status: 'done' });
        const onConditionNotMet = jest.fn();
        const onRetry = jest.fn();
        const data = await (0, utils_1.retryUntilConditionMet)({
            operation,
            condition: (result) => result?.status === 'done',
            retryIntervalMs: 100,
            retryTimeoutMs: 1000,
            onConditionNotMet,
            onRetry,
        });
        expect(data).toEqual({ status: 'done' });
        expect(onConditionNotMet).toHaveBeenCalledTimes(2);
        expect(onRetry).toHaveBeenCalledTimes(2);
    });
});
