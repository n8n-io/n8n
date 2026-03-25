"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deleteMany_1 = require("../../vectors/deleteMany");
const deleteOne_test_1 = require("./deleteOne.test");
const errors_1 = require("../../../errors");
describe('deleteMany', () => {
    test('calls the openapi delete endpoint, passing ids with target namespace', async () => {
        const { VectorProvider, VOA } = (0, deleteOne_test_1.setupDeleteSuccess)(undefined);
        const deleteManyFn = (0, deleteMany_1.deleteMany)(VectorProvider, 'namespace');
        const returned = await deleteManyFn(['123', '456', '789']);
        expect(returned).toBe(void 0);
        expect(VOA.deleteVectors).toHaveBeenCalledWith({
            deleteRequest: { ids: ['123', '456', '789'], namespace: 'namespace' },
        });
    });
    test('calls the openapi delete endpoint, passing filter with target namespace', async () => {
        const { VOA, VectorProvider } = (0, deleteOne_test_1.setupDeleteSuccess)(undefined);
        const deleteManyFn = (0, deleteMany_1.deleteMany)(VectorProvider, 'namespace');
        const returned = await deleteManyFn({ genre: 'ambient' });
        expect(returned).toBe(void 0);
        expect(VOA.deleteVectors).toHaveBeenCalledWith({
            deleteRequest: { filter: { genre: 'ambient' }, namespace: 'namespace' },
        });
    });
    test('throws if pass in empty filter obj', async () => {
        const { VectorProvider } = (0, deleteOne_test_1.setupDeleteSuccess)(undefined);
        const deleteManyFn = (0, deleteMany_1.deleteMany)(VectorProvider, 'namespace');
        const toThrow = async () => {
            await deleteManyFn({ some: '' });
        };
        await expect(toThrow()).rejects.toThrowError(errors_1.PineconeArgumentError);
        await expect(toThrow()).rejects.toThrowError('`filter` property cannot be empty');
    });
    test('throws if pass no record IDs', async () => {
        const { VectorProvider } = (0, deleteOne_test_1.setupDeleteSuccess)(undefined);
        const deleteManyFn = (0, deleteMany_1.deleteMany)(VectorProvider, 'namespace');
        const toThrow = async () => {
            await deleteManyFn([]);
        };
        await expect(toThrow()).rejects.toThrowError(errors_1.PineconeArgumentError);
        await expect(toThrow()).rejects.toThrowError('Must pass in at least 1 record ID.');
    });
});
//# sourceMappingURL=deleteMany.test.js.map