import { isAbortError } from 'abort-controller-x';
import { ServerError, Status } from 'nice-grpc';
import { WeaviateInsufficientPermissionsError, WeaviateRequestTimeoutError, WeaviateTenantsGetError, } from '../errors.js';
import { TenantsGetRequest } from '../proto/v1/tenants.js';
import Base from './base.js';
import { retryOptions } from './retry.js';
export default class TenantsManager extends Base {
    constructor() {
        super(...arguments);
        this.withGet = (args) => this.call(TenantsGetRequest.fromPartial({ names: args.names ? { values: args.names } : undefined }));
    }
    static use(connection, collection, metadata, timeout) {
        return new TenantsManager(connection, collection, metadata, timeout);
    }
    call(message) {
        return this.sendWithTimeout((signal) => this.connection
            .tenantsGet(Object.assign(Object.assign({}, message), { collection: this.collection }), Object.assign({ metadata: this.metadata, signal }, retryOptions))
            .catch((err) => {
            if (err instanceof ServerError && err.code === Status.PERMISSION_DENIED) {
                throw new WeaviateInsufficientPermissionsError(7, err.message);
            }
            if (isAbortError(err)) {
                throw new WeaviateRequestTimeoutError(`timed out after ${this.timeout}ms`);
            }
            throw new WeaviateTenantsGetError(err.message);
        }));
    }
}
