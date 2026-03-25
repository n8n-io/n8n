var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { BackupCreateStatusGetter, BackupCreator, BackupRestoreStatusGetter, BackupRestorer, } from '../../backup/index.js';
import { validateBackend, validateBackupId } from '../../backup/validation.js';
import { WeaviateBackupCanceled, WeaviateBackupCancellationError, WeaviateBackupFailed, WeaviateInvalidInputError, WeaviateUnexpectedResponseError, WeaviateUnexpectedStatusCodeError, } from '../../errors.js';
export const backup = (connection) => {
    const parseStatus = (res) => {
        if (res.id === undefined) {
            throw new WeaviateUnexpectedResponseError('Backup ID is undefined in response');
        }
        if (res.path === undefined) {
            throw new WeaviateUnexpectedResponseError('Backup path is undefined in response');
        }
        if (res.status === undefined) {
            throw new WeaviateUnexpectedResponseError('Backup status is undefined in response');
        }
        return {
            id: res.id,
            error: res.error,
            path: res.path,
            status: res.status,
        };
    };
    const parseResponse = (res) => {
        if (res.id === undefined) {
            throw new WeaviateUnexpectedResponseError('Backup ID is undefined in response');
        }
        if (res.backend === undefined) {
            throw new WeaviateUnexpectedResponseError('Backup backend is undefined in response');
        }
        if (res.path === undefined) {
            throw new WeaviateUnexpectedResponseError('Backup path is undefined in response');
        }
        if (res.status === undefined) {
            throw new WeaviateUnexpectedResponseError('Backup status is undefined in response');
        }
        return {
            id: res.id,
            backend: res.backend,
            collections: res.classes ? res.classes : [],
            error: res.error,
            path: res.path,
            status: res.status,
        };
    };
    const getCreateStatus = (args) => {
        return new BackupCreateStatusGetter(connection)
            .withBackupId(args.backupId)
            .withBackend(args.backend)
            .do()
            .then(parseStatus);
    };
    const getRestoreStatus = (args) => {
        return new BackupRestoreStatusGetter(connection)
            .withBackupId(args.backupId)
            .withBackend(args.backend)
            .do()
            .then(parseStatus);
    };
    return {
        cancel: (args) => __awaiter(void 0, void 0, void 0, function* () {
            let errors = [];
            errors = errors.concat(validateBackupId(args.backupId)).concat(validateBackend(args.backend));
            if (errors.length > 0) {
                throw new WeaviateInvalidInputError(errors.join(', '));
            }
            try {
                yield connection.delete(`/backups/${args.backend}/${args.backupId}`, undefined, false);
            }
            catch (err) {
                if (err instanceof WeaviateUnexpectedStatusCodeError) {
                    if (err.code === 404) {
                        return false;
                    }
                    throw new WeaviateBackupCancellationError(err.message);
                }
            }
            return true;
        }),
        create: (args) => __awaiter(void 0, void 0, void 0, function* () {
            let builder = new BackupCreator(connection, new BackupCreateStatusGetter(connection))
                .withBackupId(args.backupId)
                .withBackend(args.backend);
            if (args.includeCollections) {
                builder = builder.withIncludeClassNames(...args.includeCollections);
            }
            if (args.excludeCollections) {
                builder = builder.withExcludeClassNames(...args.excludeCollections);
            }
            if (args.config) {
                builder = builder.withConfig({
                    ChunkSize: args.config.chunkSize,
                    CompressionLevel: args.config.compressionLevel,
                    CPUPercentage: args.config.cpuPercentage,
                });
            }
            let res;
            try {
                res = yield builder.do();
            }
            catch (err) {
                throw new WeaviateBackupFailed(`Backup creation failed: ${err}`, 'creation');
            }
            if (res.status === 'FAILED') {
                throw new WeaviateBackupFailed(`Backup creation failed: ${res.error}`, 'creation');
            }
            let status;
            if (args.waitForCompletion) {
                let wait = true;
                while (wait) {
                    const ret = yield getCreateStatus(args); // eslint-disable-line no-await-in-loop
                    if (ret.status === 'SUCCESS') {
                        wait = false;
                        status = ret;
                    }
                    if (ret.status === 'FAILED') {
                        throw new WeaviateBackupFailed(ret.error ? ret.error : '<unknown>', 'creation');
                    }
                    if (ret.status === 'CANCELED') {
                        throw new WeaviateBackupCanceled('creation');
                    }
                    yield new Promise((resolve) => setTimeout(resolve, 1000)); // eslint-disable-line no-await-in-loop
                }
            }
            return status ? Object.assign(Object.assign({}, parseResponse(res)), status) : parseResponse(res);
        }),
        getCreateStatus: getCreateStatus,
        getRestoreStatus: getRestoreStatus,
        restore: (args) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            let builder = new BackupRestorer(connection, new BackupRestoreStatusGetter(connection))
                .withBackupId(args.backupId)
                .withBackend(args.backend);
            if (args.includeCollections) {
                builder = builder.withIncludeClassNames(...args.includeCollections);
            }
            if (args.excludeCollections) {
                builder = builder.withExcludeClassNames(...args.excludeCollections);
            }
            if ((_a = args.config) === null || _a === void 0 ? void 0 : _a.overwriteAlias) {
                builder = builder.withOverwriteAlias((_b = args.config) === null || _b === void 0 ? void 0 : _b.overwriteAlias);
            }
            if (args.config) {
                builder = builder.withConfig({
                    CPUPercentage: args.config.cpuPercentage,
                });
            }
            let res;
            try {
                res = yield builder.do();
            }
            catch (err) {
                throw new WeaviateBackupFailed(`Backup restoration failed: ${err}`, 'restoration');
            }
            if (res.status === 'FAILED') {
                throw new WeaviateBackupFailed(`Backup restoration failed: ${res.error}`, 'restoration');
            }
            let status;
            if (args.waitForCompletion) {
                let wait = true;
                while (wait) {
                    const ret = yield getRestoreStatus(args); // eslint-disable-line no-await-in-loop
                    if (ret.status === 'SUCCESS') {
                        wait = false;
                        status = ret;
                    }
                    if (ret.status === 'FAILED') {
                        throw new WeaviateBackupFailed(ret.error ? ret.error : '<unknown>', 'restoration');
                    }
                    if (ret.status === 'CANCELED') {
                        throw new WeaviateBackupCanceled('restoration');
                    }
                    yield new Promise((resolve) => setTimeout(resolve, 1000)); // eslint-disable-line no-await-in-loop
                }
            }
            return status
                ? Object.assign(Object.assign({}, parseResponse(res)), status) : parseResponse(res);
        }),
        list: (backend) => {
            return connection.get(`/backups/${backend}`);
        },
    };
};
