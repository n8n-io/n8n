import { ServerError, Status } from 'nice-grpc';
import { SearchRequest, } from '../proto/v1/search_get.js';
import { isAbortError } from 'abort-controller-x';
import { WeaviateInsufficientPermissionsError, WeaviateQueryError, WeaviateRequestTimeoutError, } from '../errors.js';
import Base from './base.js';
import { retryOptions } from './retry.js';
export default class Searcher extends Base {
    constructor() {
        super(...arguments);
        this.withFetch = (args) => this.call(SearchRequest.fromPartial(args));
        this.withBm25 = (args) => this.call(SearchRequest.fromPartial(args));
        this.withHybrid = (args) => this.call(SearchRequest.fromPartial(args));
        this.withNearAudio = (args) => this.call(SearchRequest.fromPartial(args));
        this.withNearDepth = (args) => this.call(SearchRequest.fromPartial(args));
        this.withNearImage = (args) => this.call(SearchRequest.fromPartial(args));
        this.withNearIMU = (args) => this.call(SearchRequest.fromPartial(args));
        this.withNearObject = (args) => this.call(SearchRequest.fromPartial(args));
        this.withNearText = (args) => this.call(SearchRequest.fromPartial(args));
        this.withNearThermal = (args) => this.call(SearchRequest.fromPartial(args));
        this.withNearVector = (args) => this.call(SearchRequest.fromPartial(args));
        this.withNearVideo = (args) => this.call(SearchRequest.fromPartial(args));
        this.call = (message) => this.sendWithTimeout((signal) => this.connection
            .search(Object.assign(Object.assign({}, message), { collection: this.collection, consistencyLevel: this.consistencyLevel, tenant: this.tenant, uses123Api: true, uses125Api: true, uses127Api: true }), Object.assign({ metadata: this.metadata, signal }, retryOptions))
            .catch((err) => {
            if (err instanceof ServerError && err.code === Status.PERMISSION_DENIED) {
                throw new WeaviateInsufficientPermissionsError(7, err.message);
            }
            if (isAbortError(err)) {
                throw new WeaviateRequestTimeoutError(`timed out after ${this.timeout}ms`);
            }
            throw new WeaviateQueryError(err.message, 'gRPC');
        }));
    }
    static use(connection, collection, metadata, timeout, consistencyLevel, tenant) {
        return new Searcher(connection, collection, metadata, timeout, consistencyLevel, tenant);
    }
}
