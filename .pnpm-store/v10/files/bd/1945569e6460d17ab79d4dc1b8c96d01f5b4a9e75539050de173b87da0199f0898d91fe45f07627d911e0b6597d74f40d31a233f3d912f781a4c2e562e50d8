"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAll = void 0;
const deleteAll = (apiProvider, namespace) => {
    return async () => {
        const api = await apiProvider.provide();
        await api.deleteVectors({ deleteRequest: { deleteAll: true, namespace } });
        return;
    };
};
exports.deleteAll = deleteAll;
//# sourceMappingURL=deleteAll.js.map