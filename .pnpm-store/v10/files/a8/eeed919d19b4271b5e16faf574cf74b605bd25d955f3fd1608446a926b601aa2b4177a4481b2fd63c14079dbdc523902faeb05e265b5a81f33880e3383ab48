"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deleteAll_1 = require("../../vectors/deleteAll");
const deleteOne_test_1 = require("./deleteOne.test");
describe('deleteAll', () => {
    test('calls the openapi delete endpoint, passing deleteAll with target namespace', async () => {
        const { VectorProvider, VOA } = (0, deleteOne_test_1.setupDeleteSuccess)(undefined);
        const deleteAllFn = (0, deleteAll_1.deleteAll)(VectorProvider, 'namespace');
        const returned = await deleteAllFn();
        expect(returned).toBe(void 0);
        expect(VOA.deleteVectors).toHaveBeenCalledWith({
            deleteRequest: { deleteAll: true, namespace: 'namespace' },
        });
    });
});
//# sourceMappingURL=deleteAll.test.js.map