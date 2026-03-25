import { ServerError, Status } from 'nice-grpc';
import { BatchObjectsRequest } from '../proto/v1/batch.js';
import { WeaviateBatchError, WeaviateDeleteManyError, WeaviateInsufficientPermissionsError, WeaviateRequestTimeoutError, } from '../errors.js';
import { BatchDeleteRequest } from '../proto/v1/batch_delete.js';
import Base from './base.js';
import { isAbortError } from 'abort-controller-x';
import { retryOptions } from './retry.js';
export default class Batcher extends Base {
    constructor() {
        super(...arguments);
        this.withDelete = (args) => this.callDelete(BatchDeleteRequest.fromPartial(args));
        this.withObjects = (args) => this.callObjects(BatchObjectsRequest.fromPartial(args));
    }
    static use(connection, collection, metadata, timeout, consistencyLevel, tenant) {
        return new Batcher(connection, collection, metadata, timeout, consistencyLevel, tenant);
    }
    callDelete(message) {
        return this.sendWithTimeout((signal) => this.connection.batchDelete(Object.assign(Object.assign({}, message), { collection: this.collection, consistencyLevel: this.consistencyLevel, tenant: this.tenant }), {
            metadata: this.metadata,
            signal,
        })).catch((err) => {
            if (err instanceof ServerError && err.code === Status.PERMISSION_DENIED) {
                throw new WeaviateInsufficientPermissionsError(7, err.message);
            }
            if (isAbortError(err)) {
                throw new WeaviateRequestTimeoutError(`timed out after ${this.timeout}ms`);
            }
            throw new WeaviateDeleteManyError(err.message);
        });
    }
    callObjects(message) {
        return this.sendWithTimeout((signal) => this.connection
            .batchObjects(Object.assign(Object.assign({}, message), { consistencyLevel: this.consistencyLevel }), Object.assign({ metadata: this.metadata, signal }, retryOptions))
            .catch((err) => {
            if (err instanceof ServerError && err.code === Status.PERMISSION_DENIED) {
                throw new WeaviateInsufficientPermissionsError(7, err.message);
            }
            if (isAbortError(err)) {
                throw new WeaviateRequestTimeoutError(`timed out after ${this.timeout}ms`);
            }
            throw new WeaviateBatchError(err.message);
        }));
    }
}
