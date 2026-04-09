"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRequestMetadata = exports.getValidDataArray = exports.getSparseDim = exports.getPKFieldExpr = exports.getQueryIteratorExpr = exports.sleep = exports.findKeyValue = exports.promisify = exports.setPoolFailoverHandler = exports.FAILOVER_HANDLER_KEY = void 0;
const __1 = require("../");
const logger_1 = require("./logger");
const grpc_js_1 = require("@grpc/grpc-js");
/** Well-known property key for attaching a failover handler to a pool. */
exports.FAILOVER_HANDLER_KEY = '__failoverHandler';
/**
 * Attach a failover handler to a pool for global cluster support.
 */
function setPoolFailoverHandler(pool, handler) {
    pool[exports.FAILOVER_HANDLER_KEY] = handler;
}
exports.setPoolFailoverHandler = setPoolFailoverHandler;
/**
 * Check if an error is a gRPC UNAVAILABLE error.
 */
function isUnavailableError(err) {
    return err && err.code === grpc_js_1.status.UNAVAILABLE;
}
/**
 * Execute a single gRPC call via the pool.
 */
function executeCall(pool, target, params, timeout, requestMetadata) {
    const t = timeout === 0 ? 1000 * 60 * 60 * 24 : timeout;
    return (() => __awaiter(this, void 0, void 0, function* () {
        const client = yield pool.acquire();
        let finalRequestMetadata = requestMetadata;
        if (!finalRequestMetadata && params) {
            finalRequestMetadata = (0, exports.extractRequestMetadata)(params);
        }
        const metadata = finalRequestMetadata ? new grpc_js_1.Metadata() : undefined;
        if (metadata && finalRequestMetadata) {
            const clientRequestId = getClientRequestId(finalRequestMetadata);
            if (clientRequestId) {
                metadata.add(__1.METADATA.CLIENT_REQUEST_ID, String(clientRequestId));
            }
        }
        return new Promise((resolve, reject) => {
            try {
                const callOptions = { deadline: new Date(Date.now() + t) };
                if (metadata) {
                    callOptions.metadata = metadata;
                }
                client[target](params, callOptions, (err, result) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(result);
                    }
                    if (client) {
                        pool.release(client);
                    }
                });
            }
            catch (e) {
                reject(e);
                if (client) {
                    pool.release(client);
                }
            }
        });
    }))();
}
/**
 * Promisify a function call with optional timeout, metadata, and global cluster failover.
 * @param pool - The pool of gRPC clients
 * @param target - The name of the target function to call
 * @param params - The parameters to pass to the target function (may contain client_request_id or client-request-id)
 * @param timeout - Optional timeout in milliseconds
 * @param requestMetadata - Optional metadata to include in the request (e.g., client-request-id). If not provided, will be extracted from params automatically.
 * @returns A Promise that resolves with the result of the target function call
 */
function promisify(pool, target, params, timeout, requestMetadata) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield executeCall(pool, target, params, timeout, requestMetadata);
        }
        catch (error) {
            // Check for global cluster failover handler
            const handler = pool[exports.FAILOVER_HANDLER_KEY];
            if (handler && isUnavailableError(error)) {
                logger_1.logger.debug(`\x1b[36m[Global]\x1b[0m UNAVAILABLE error on \x1b[1m${target}\x1b[0m, triggering failover handler`);
                const newPool = yield handler(error);
                if (newPool) {
                    logger_1.logger.debug(`\x1b[36m[Global]\x1b[0m Failover complete, retrying \x1b[1m${target}\x1b[0m with new pool`);
                    // Retry once with the new pool (after failover)
                    return yield executeCall(newPool, target, params, timeout, requestMetadata);
                }
            }
            throw error;
        }
    });
}
exports.promisify = promisify;
const findKeyValue = (obj, key) => { var _a; return (_a = obj.find(v => v.key === key)) === null || _a === void 0 ? void 0 : _a.value; };
exports.findKeyValue = findKeyValue;
const sleep = (time) => {
    return new Promise(resolve => setTimeout(resolve, time));
};
exports.sleep = sleep;
/**
 * Returns the query iterator expression based on the provided parameters.
 *
 * @param params - The parameters for generating the query iterator expression.
 * @param params.expr - The expression to be combined with the iterator expression.
 * @param params.pkField - The primary key field schema.
 * @param params.page - The current page number.
 * @param params.pageCache - The cache of previous pages.
 * @returns The query iterator expression.
 */
const getQueryIteratorExpr = (params) => {
    // get params
    const { expr, lastPKId, pkField } = params;
    // If cache does not exist, return expression based on primaryKey type
    let compareValue = '';
    if (!lastPKId) {
        // get default value
        compareValue =
            (pkField === null || pkField === void 0 ? void 0 : pkField.data_type) === __1.DataTypeStringEnum.VarChar
                ? ''
                : `${__1.DEFAULT_MIN_INT64}`;
    }
    else {
        compareValue = lastPKId;
    }
    // return expr combined with iteratorExpr
    return (0, exports.getPKFieldExpr)({
        pkField,
        value: compareValue,
        expr,
        condition: '>',
    });
};
exports.getQueryIteratorExpr = getQueryIteratorExpr;
// return pk filed != expression based on pk field type, if pk field is string, return pk field != ''
const getPKFieldExpr = (data) => {
    const { pkField, value, condition = '!=', expr = '' } = data;
    const pkValue = (pkField === null || pkField === void 0 ? void 0 : pkField.data_type) === __1.DataTypeStringEnum.VarChar
        ? `'${value}'`
        : `${value}`;
    return `${pkField === null || pkField === void 0 ? void 0 : pkField.name} ${condition} ${pkValue}${expr ? ` && ${expr}` : ''}`;
};
exports.getPKFieldExpr = getPKFieldExpr;
// get biggest size of sparse vector array
const getSparseDim = (data) => {
    let dim = 0;
    for (const row of data) {
        const indices = Object.keys(row).map(Number);
        if (indices.length > dim) {
            dim = indices.length;
        }
    }
    return dim;
};
exports.getSparseDim = getSparseDim;
// get valid data
// create a length array with valid data, if the data is undefined or null, return false, otherwise return true
const getValidDataArray = (data, length) => {
    return Array.from({ length }).map((_, i) => {
        return data[i] !== undefined && data[i] !== null;
    });
};
exports.getValidDataArray = getValidDataArray;
/**
 * Extracts client request ID from metadata object with priority handling.
 * Priority: client_request_id > client-request-id (JavaScript/TypeScript convention)
 * @param metadata - Metadata object that may contain traceid
 * @returns Client request ID as string or undefined if not found
 */
const getClientRequestId = (metadata) => {
    if (!metadata) {
        return undefined;
    }
    // Priority: client_request_id > client-request-id (JavaScript/TypeScript convention)
    return metadata.client_request_id || metadata['client-request-id'];
};
/**
 * Extracts request metadata (traceid) from request data.
 * Supports both client_request_id and client-request-id formats.
 * Priority: client_request_id > client-request-id (JavaScript/TypeScript convention)
 * @param data - Request data that may contain traceid
 * @returns Request metadata object or undefined if no traceid provided
 */
const extractRequestMetadata = (data) => {
    const clientRequestId = getClientRequestId(data);
    return clientRequestId
        ? { 'client-request-id': String(clientRequestId) }
        : undefined;
};
exports.extractRequestMetadata = extractRequestMetadata;
//# sourceMappingURL=Function.js.map