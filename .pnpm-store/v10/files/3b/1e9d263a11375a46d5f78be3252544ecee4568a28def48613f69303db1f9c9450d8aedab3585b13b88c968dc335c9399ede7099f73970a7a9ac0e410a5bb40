"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const describeIndex_1 = require("../describeIndex");
const errors_1 = require("../../errors");
describe('describeIndex', () => {
    let responseData;
    const setupSuccessResponse = () => {
        return {
            describeIndex: jest
                .fn()
                .mockImplementation(() => Promise.resolve(responseData)),
        };
    };
    beforeEach(() => {
        responseData = Object.freeze({
            database: {
                name: 'test-index',
                dimensions: undefined,
                indexType: undefined,
                metric: 'cosine',
                pods: 1,
                replicas: 1,
                shards: 1,
                podType: 'p1.x1',
                indexConfig: undefined,
                metadataConfig: undefined,
            },
            status: { ready: true, state: 'Ready' },
        });
    });
    test('should remove undefined fields from response', async () => {
        const IOA = setupSuccessResponse();
        // @ts-ignore
        const returned = await (0, describeIndex_1.describeIndex)(IOA)('index-name');
        expect(returned).toEqual({
            database: {
                name: 'test-index',
                metric: 'cosine',
                pods: 1,
                replicas: 1,
                shards: 1,
                podType: 'p1.x1',
            },
            status: { ready: true, state: 'Ready' },
        });
    });
    describe('argument validation', () => {
        test('should throw if index name is not provided', async () => {
            const IOA = setupSuccessResponse();
            // @ts-ignore
            const expectToThrow = async () => await (0, describeIndex_1.describeIndex)(IOA)();
            await expect(expectToThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(expectToThrow).rejects.toThrowError('You must pass a non-empty string for `name` in order to describe an index');
        });
        test('should throw if index name is empty string', async () => {
            const IOA = setupSuccessResponse();
            // @ts-ignore
            const expectToThrow = async () => await (0, describeIndex_1.describeIndex)(IOA)('');
            await expect(expectToThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(expectToThrow).rejects.toThrowError('You must pass a non-empty string for `name` in order to describe an index');
        });
    });
});
//# sourceMappingURL=describeIndex.test.js.map