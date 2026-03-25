"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const abort_controller_x_1 = require("abort-controller-x");
const nice_grpc_1 = require("nice-grpc");
const errors_js_1 = require("../errors.js");
const tenants_js_1 = require("../proto/v1/tenants.js");
const base_js_1 = __importDefault(require("./base.js"));
const retry_js_1 = require("./retry.js");
class TenantsManager extends base_js_1.default {
    constructor() {
        super(...arguments);
        this.withGet = (args) => this.call(tenants_js_1.TenantsGetRequest.fromPartial({ names: args.names ? { values: args.names } : undefined }));
    }
    static use(connection, collection, metadata, timeout) {
        return new TenantsManager(connection, collection, metadata, timeout);
    }
    call(message) {
        return this.sendWithTimeout((signal) => this.connection
            .tenantsGet(Object.assign(Object.assign({}, message), { collection: this.collection }), Object.assign({ metadata: this.metadata, signal }, retry_js_1.retryOptions))
            .catch((err) => {
            if (err instanceof nice_grpc_1.ServerError && err.code === nice_grpc_1.Status.PERMISSION_DENIED) {
                throw new errors_js_1.WeaviateInsufficientPermissionsError(7, err.message);
            }
            if ((0, abort_controller_x_1.isAbortError)(err)) {
                throw new errors_js_1.WeaviateRequestTimeoutError(`timed out after ${this.timeout}ms`);
            }
            throw new errors_js_1.WeaviateTenantsGetError(err.message);
        }));
    }
}
exports.default = TenantsManager;
