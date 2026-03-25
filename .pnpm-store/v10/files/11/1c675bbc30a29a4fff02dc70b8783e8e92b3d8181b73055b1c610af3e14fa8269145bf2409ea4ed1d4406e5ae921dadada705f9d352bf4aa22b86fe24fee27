"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deleteIndex_1 = require("../deleteIndex");
const errors_1 = require("../../errors");
describe('deleteIndex', () => {
    const setupSuccessResponse = (responseData) => {
        return {
            deleteIndex: jest
                .fn()
                .mockImplementation(() => Promise.resolve(responseData)),
        };
    };
    describe('argument validation', () => {
        test('should throw if index name is not provided', async () => {
            const IOA = setupSuccessResponse('');
            // @ts-ignore
            const expectToThrow = async () => await (0, deleteIndex_1.deleteIndex)(IOA)();
            await expect(expectToThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(expectToThrow).rejects.toThrowError('You must pass a non-empty string for `indexName` in order to delete an index');
        });
        test('should throw if index name is empty string', async () => {
            const IOA = setupSuccessResponse('');
            // @ts-ignore
            const expectToThrow = async () => await (0, deleteIndex_1.deleteIndex)(IOA)('');
            await expect(expectToThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
            await expect(expectToThrow).rejects.toThrowError('You must pass a non-empty string for `indexName` in order to delete an index');
        });
    });
});
//# sourceMappingURL=deleteIndex.test.js.map