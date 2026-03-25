import { ServerError, Status } from 'nice-grpc';
import { AggregateRequest, } from '../proto/v1/aggregate.js';
import { isAbortError } from 'abort-controller-x';
import { WeaviateInsufficientPermissionsError, WeaviateQueryError, WeaviateRequestTimeoutError, } from '../errors.js';
import Base from './base.js';
import { retryOptions } from './retry.js';
export default class Aggregator extends Base {
    constructor() {
        super(...arguments);
        this.withFetch = (args) => this.call(AggregateRequest.fromPartial(args));
        this.withHybrid = (args) => this.call(AggregateRequest.fromPartial(args));
        this.withNearAudio = (args) => this.call(AggregateRequest.fromPartial(args));
        this.withNearDepth = (args) => this.call(AggregateRequest.fromPartial(args));
        this.withNearImage = (args) => this.call(AggregateRequest.fromPartial(args));
        this.withNearIMU = (args) => this.call(AggregateRequest.fromPartial(args));
        this.withNearObject = (args) => this.call(AggregateRequest.fromPartial(args));
        this.withNearText = (args) => this.call(AggregateRequest.fromPartial(args));
        this.withNearThermal = (args) => this.call(AggregateRequest.fromPartial(args));
        this.withNearVector = (args) => this.call(AggregateRequest.fromPartial(args));
        this.withNearVideo = (args) => this.call(AggregateRequest.fromPartial(args));
        this.call = (message) => this.sendWithTimeout((signal) => this.connection
            .aggregate(Object.assign(Object.assign({}, message), { collection: this.collection, tenant: this.tenant, objectsCount: true }), Object.assign({ metadata: this.metadata, signal }, retryOptions))
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
        return new Aggregator(connection, collection, metadata, timeout, consistencyLevel, tenant);
    }
}
