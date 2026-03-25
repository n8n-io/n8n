"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupCollection = void 0;
const client_js_1 = require("./client.js");
const backupCollection = (connection, name) => {
    const handler = (0, client_js_1.backup)(connection);
    return {
        create: (args) => handler.create(Object.assign(Object.assign({}, args), { includeCollections: [name] })),
        getCreateStatus: handler.getCreateStatus,
        getRestoreStatus: handler.getRestoreStatus,
        restore: (args) => handler.restore(Object.assign(Object.assign({}, args), { includeCollections: [name] })),
    };
};
exports.backupCollection = backupCollection;
