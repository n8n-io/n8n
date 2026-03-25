"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const describeCollection_1 = require("../describeCollection");
const errors_1 = require("../../errors");
const setupMocks = (describeResponse, listCollectionResponse) => {
    const fakeDescribeCollection = jest
        .fn()
        .mockImplementation(describeResponse);
    const fakeListCollections = jest
        .fn()
        .mockImplementation(listCollectionResponse);
    const IOA = {
        describeCollection: fakeDescribeCollection,
        listCollections: fakeListCollections,
    };
    return IOA;
};
describe('describeCollection', () => {
    describe('argument validation', () => {
        test('should throw if collection name is not provided', async () => {
            const IOA = setupMocks(() => Promise.resolve(''), () => Promise.resolve([]));
            // @ts-ignore
            const expectToThrow = async () => await (0, describeCollection_1.describeCollection)(IOA)();
            await expect(expectToThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(expectToThrow).rejects.toThrowError('You must pass a non-empty string for `name` in order to describe a collection');
        });
        test('should throw if collection name is empty string', async () => {
            const IOA = setupMocks(() => Promise.resolve(''), () => Promise.resolve([]));
            // @ts-ignore
            const expectToThrow = async () => await (0, describeCollection_1.describeCollection)(IOA)('');
            await expect(expectToThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(expectToThrow).rejects.toThrowError('You must pass a non-empty string for `name` in order to describe a collection');
        });
    });
    describe('happy path', () => {
        test('it should return the collection meta', async () => {
            const IOA = setupMocks(() => Promise.resolve({
                name: 'collection-name',
                size: 3085509,
                status: 'Ready',
                recordCount: 120,
            }), () => Promise.resolve([]));
            // @ts-ignore
            const response = await (0, describeCollection_1.describeCollection)(IOA)('collection-name');
            expect(response).toEqual({
                name: 'collection-name',
                size: 3085509,
                status: 'Ready',
                recordCount: 120,
            });
        });
    });
});
//# sourceMappingURL=describeCollection.test.js.map