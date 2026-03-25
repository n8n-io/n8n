"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deleteCollection_1 = require("../deleteCollection");
const errors_1 = require("../../errors");
const setupMocks = (deleteResponse, listCollectionResponse = () => Promise.resolve([])) => {
    const fakeDeleteCollection = jest.fn().mockImplementation(deleteResponse);
    const fakeListCollections = jest
        .fn()
        .mockImplementation(listCollectionResponse);
    const IOA = {
        deleteCollection: fakeDeleteCollection,
        listCollections: fakeListCollections,
    };
    return IOA;
};
describe('deleteCollection', () => {
    describe('argument validation', () => {
        test('should throw if collection name is not provided', async () => {
            const IOA = setupMocks(() => Promise.resolve(''));
            // @ts-ignore
            const expectToThrow = async () => await (0, deleteCollection_1.deleteCollection)(IOA)();
            await expect(expectToThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(expectToThrow).rejects.toThrowError('You must pass a non-empty string for `collectionName`');
        });
        test('should throw if collection name is empty string', async () => {
            const IOA = setupMocks(() => Promise.resolve(''));
            // @ts-ignore
            const expectToThrow = async () => await (0, deleteCollection_1.deleteCollection)(IOA)('');
            await expect(expectToThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(expectToThrow).rejects.toThrowError('You must pass a non-empty string for `collectionName`');
        });
    });
});
//# sourceMappingURL=deleteCollection.test.js.map