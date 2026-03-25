"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const context_1 = require("../context");
const setupApiProvider = () => {
    const fakeContextAssistant = jest
        .fn()
        .mockImplementation(() => Promise.resolve({}));
    const MAP = {
        contextAssistant: fakeContextAssistant,
    };
    const AsstDataOperationsProvider = {
        provideData: async () => MAP,
    };
    return { MAP, AsstDataOperationsProvider };
};
describe('contextClosed', () => {
    let mockApi;
    let asstOperationsProvider;
    beforeEach(() => {
        const { MAP, AsstDataOperationsProvider } = setupApiProvider();
        mockApi = MAP;
        asstOperationsProvider = AsstDataOperationsProvider;
    });
    test('creates a context function that calls the API with correct parameters', async () => {
        const assistantName = 'test-assistant';
        const contextFn = (0, context_1.context)(assistantName, asstOperationsProvider);
        const options = {
            query: 'test query',
            filter: { key: 'value' },
        };
        await contextFn(options);
        expect(mockApi.contextAssistant).toHaveBeenCalledWith({
            assistantName,
            contextRequest: {
                query: options.query,
                filter: options.filter,
            },
        });
    });
    test('throws error when query is empty', async () => {
        const contextFn = (0, context_1.context)('test-assistant', asstOperationsProvider);
        await expect(contextFn({ query: '' })).rejects.toThrow('You must pass an object with required properties (`query`, or `messages`) to retrieve context snippets.');
    });
    test('works without filter parameter', async () => {
        const assistantName = 'test-assistant';
        const contextFn = (0, context_1.context)(assistantName, asstOperationsProvider);
        const options = {
            query: 'test query',
        };
        await contextFn(options);
        expect(mockApi.contextAssistant).toHaveBeenCalledWith({
            assistantName,
            contextRequest: {
                query: options.query,
                filter: undefined,
            },
        });
    });
});
//# sourceMappingURL=context.test.js.map