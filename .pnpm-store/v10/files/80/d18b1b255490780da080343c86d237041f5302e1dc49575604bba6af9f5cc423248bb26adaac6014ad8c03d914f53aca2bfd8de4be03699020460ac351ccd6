import { backup } from './client.js';
export const backupCollection = (connection, name) => {
    const handler = backup(connection);
    return {
        create: (args) => handler.create(Object.assign(Object.assign({}, args), { includeCollections: [name] })),
        getCreateStatus: handler.getCreateStatus,
        getRestoreStatus: handler.getRestoreStatus,
        restore: (args) => handler.restore(Object.assign(Object.assign({}, args), { includeCollections: [name] })),
    };
};
