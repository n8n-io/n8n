"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDeleteSuccess = void 0;
const deleteOne_1 = require("../../vectors/deleteOne");
const errors_1 = require("../../../errors");
const setupDeleteResponse = (response, isSuccess) => {
    const fakeDelete = jest
        .fn()
        .mockImplementation(() => isSuccess ? Promise.resolve(response) : Promise.reject(response));
    const VOA = { deleteVectors: fakeDelete };
    const VectorProvider = {
        provide: async () => VOA,
    };
    return { VOA, VectorProvider };
};
const setupDeleteSuccess = (response) => {
    return setupDeleteResponse(response, true);
};
exports.setupDeleteSuccess = setupDeleteSuccess;
describe('deleteOne', () => {
    test('Calls the openapi delete endpoint, passing target namespace and the vector id to delete', async () => {
        const { VectorProvider, VOA } = (0, exports.setupDeleteSuccess)(undefined);
        const deleteOneFn = (0, deleteOne_1.deleteOne)(VectorProvider, 'namespace');
        const returned = await deleteOneFn('123');
        expect(returned).toBe(void 0);
        expect(VOA.deleteVectors).toHaveBeenCalledWith({
            deleteRequest: { ids: ['123'], namespace: 'namespace' },
        });
    });
    test('Throw error if pass empty string as ID', async () => {
        const { VectorProvider } = (0, exports.setupDeleteSuccess)(undefined);
        const deleteOneFn = (0, deleteOne_1.deleteOne)(VectorProvider, 'namespace');
        const toThrow = async () => {
            await deleteOneFn('');
        };
        await expect(toThrow).rejects.toThrowError(errors_1.PineconeArgumentError);
        await expect(toThrow).rejects.toThrowError('You must pass a non-empty string for `options` in order to delete a record.');
    });
});
//# sourceMappingURL=deleteOne.test.js.map