"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const retries_1 = require("../retries");
const errors_1 = require("../../errors");
describe('RetryOnServerFailure', () => {
    test("Should print 'Max retries' error stmt when response fails to succeed after maxRetries is reached", async () => {
        const fakeAsyncFn = jest
            .fn()
            .mockImplementation(() => Promise.resolve(errors_1.PineconeInternalServerError));
        const retryWrapper = new retries_1.RetryOnServerFailure(fakeAsyncFn, 2);
        const errorResult = async () => {
            await retryWrapper.execute();
        };
        await expect(errorResult).rejects.toThrowError(errors_1.PineconeMaxRetriesExceededError);
    });
    test('Should act the same as above with PineconeUnavailableError', async () => {
        const fakeAsyncFn = jest
            .fn()
            .mockImplementation(() => Promise.resolve(errors_1.PineconeUnavailableError));
        const retryWrapper = new retries_1.RetryOnServerFailure(fakeAsyncFn, 2);
        const errorResult = async () => {
            await retryWrapper.execute();
        };
        await expect(errorResult).rejects.toThrowError(errors_1.PineconeMaxRetriesExceededError);
    });
    test('Should return response if successful and status code is not 5xx', async () => {
        const fakeAsyncFn = jest
            .fn()
            .mockImplementation(() => Promise.resolve({}));
        const retryWrapper = new retries_1.RetryOnServerFailure(fakeAsyncFn, 2);
        const result = await retryWrapper.execute();
        expect(result).toEqual({});
    });
    test('If maxRetries exceeds 10, throw error', async () => {
        const fakeAsyncFn = jest
            .fn()
            .mockImplementation(() => Promise.resolve({}));
        const toThrow = async () => {
            new retries_1.RetryOnServerFailure(fakeAsyncFn, 11);
        };
        await expect(toThrow()).rejects.toThrowError('Max retries cannot exceed 10');
    });
    test('Should retry when first encounter error, then succeed when eventually get good response back', async () => {
        // Mock the async function to fail once, then succeed
        const fakeAsyncFn = jest
            .fn()
            .mockImplementationOnce(() => Promise.resolve({ name: 'PineconeInternalServerError', status: 500 })) // 1x failure to trigger a retry
            .mockImplementationOnce(() => Promise.resolve({ status: 200 })); // 1x success
        const retryWrapper = new retries_1.RetryOnServerFailure(fakeAsyncFn, 2);
        const result = await retryWrapper.execute();
        expect(result.status).toBe(200);
    });
});
describe('calculateRetryDelay', () => {
    test('Should return a number < maxDelay', () => {
        const retryWrapper = new retries_1.RetryOnServerFailure(() => Promise.resolve({ PineconeUnavailableError: errors_1.PineconeUnavailableError }));
        const result = retryWrapper.calculateRetryDelay(3);
        expect(result).toBeLessThanOrEqual(20000);
    });
    test('Should never return a negative number', () => {
        const retryWrapper = new retries_1.RetryOnServerFailure(() => Promise.resolve({ PineconeUnavailableError: errors_1.PineconeUnavailableError }));
        const result = retryWrapper.calculateRetryDelay(3);
        expect(result).toBeGreaterThan(0);
    });
});
describe('isRetryError', () => {
    test('Should return true if response is PineconeUnavailableError', () => {
        const retryWrapper = new retries_1.RetryOnServerFailure(() => Promise.resolve({ name: 'PineconeUnavailableError' }));
        const result = retryWrapper.isRetryError({
            name: 'PineconeUnavailableError',
        });
        expect(result).toBe(true);
    });
    test('Should return false if response is not PineconeUnavailableError or PineconeInternalServerError', () => {
        const retryWrapper = new retries_1.RetryOnServerFailure(() => Promise.resolve({ name: 'MadeUpName' }));
        const result = retryWrapper.isRetryError({ name: 'MadeUpName' });
        expect(result).toBe(false);
    });
    test('Should return true if response.status >= 500', () => {
        const retryWrapper = new retries_1.RetryOnServerFailure(() => Promise.resolve({ status: 500 }));
        const result = retryWrapper.isRetryError({ status: 500 });
        expect(result).toBe(true);
    });
});
describe('shouldStopRetrying', () => {
    test('Should return true for non-retryable status code', () => {
        const retryWrapper = new retries_1.RetryOnServerFailure(() => Promise.resolve({}));
        const result = retryWrapper['shouldStopRetrying']({ status: 400 });
        expect(result).toBe(true);
    });
    test('Should return true for non-retryable error name', () => {
        const retryWrapper = new retries_1.RetryOnServerFailure(() => Promise.resolve({}));
        const result = retryWrapper['shouldStopRetrying']({
            name: 'SomeOtherError',
        });
        expect(result).toBe(true);
    });
    test('Should return false for retryable error name PineconeUnavailableError', () => {
        const retryWrapper = new retries_1.RetryOnServerFailure(() => Promise.resolve({}));
        const result = retryWrapper['shouldStopRetrying']({
            name: 'PineconeUnavailableError',
        });
        expect(result).toBe(false);
    });
    test('Should return false for retryable error name PineconeInternalServerError', () => {
        const retryWrapper = new retries_1.RetryOnServerFailure(() => Promise.resolve({}));
        const result = retryWrapper['shouldStopRetrying']({
            name: 'PineconeInternalServerError',
        });
        expect(result).toBe(false);
    });
    test('Should return false for retryable status code', () => {
        const retryWrapper = new retries_1.RetryOnServerFailure(() => Promise.resolve({}));
        const result = retryWrapper['shouldStopRetrying']({ status: 500 });
        expect(result).toBe(false);
    });
});
//# sourceMappingURL=retries.test.js.map