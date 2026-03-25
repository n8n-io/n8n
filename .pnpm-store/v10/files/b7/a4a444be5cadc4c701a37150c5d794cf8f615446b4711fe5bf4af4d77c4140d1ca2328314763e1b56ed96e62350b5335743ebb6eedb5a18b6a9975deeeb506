"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fetch_1 = require("../fetch");
const errors_1 = require("../../errors");
describe('getFetch', () => {
    afterEach(() => {
        // Reset global.fetch after each test to avoid affecting other tests
        delete global.fetch;
    });
    test('should return the user-provided fetch implementation if provided', () => {
        const customFetch = jest.fn();
        const config = {
            apiKey: 'some-api-key',
            fetchApi: customFetch,
        };
        const fetchFn = (0, fetch_1.getFetch)(config);
        expect(fetchFn).toBe(customFetch);
    });
    test('should return the global fetch implementation if user-provided fetch is not present', () => {
        const globalFetch = jest.fn();
        global.fetch = globalFetch;
        const config = {
            apiKey: 'some-api-key',
            fetchApi: undefined,
        };
        const fetchFn = (0, fetch_1.getFetch)(config);
        expect(fetchFn).toBe(globalFetch);
    });
    test('should throw a PineconeConfigurationError if no fetch implementation is found', () => {
        const config = {
            apiKey: 'some-api-key',
            fetchApi: undefined,
        };
        expect(() => (0, fetch_1.getFetch)(config)).toThrow(errors_1.PineconeConfigurationError);
        expect(() => (0, fetch_1.getFetch)(config)).toThrow('No global or user-provided fetch implementations found. Please supply a fetch implementation.');
    });
});
//# sourceMappingURL=fetch.test.js.map