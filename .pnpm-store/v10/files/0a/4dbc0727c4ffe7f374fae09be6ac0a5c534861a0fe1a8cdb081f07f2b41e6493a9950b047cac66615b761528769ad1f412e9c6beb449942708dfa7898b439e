"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isVectorType = exports.checkCreateCollectionCompatibility = exports.validatePartitionNumbers = exports.isInvalidMessage = exports.isInIgnoreRetryCodes = exports.checkSearchParams = exports.checkCollectionAndPartitionName = exports.checkCollectionName = exports.checkCollectionFields = void 0;
const __1 = require("../");
const grpc_js_1 = require("@grpc/grpc-js");
/**
 * when create collection, field must contain 2 Fields.
 * Type is int64 or varchar and primary_key = true
 * Type is one of float_vector and binary_vector
 * Will check fields
 * @param fields
 */
const checkCollectionFields = (fields) => {
    const int64VarCharTypes = [__1.DataType.Int64, __1.DataType.VarChar];
    let hasPrimaryKey = false;
    let hasVectorField = false;
    let partitionKeyCount = 0;
    fields.forEach(field => {
        var _a, _b;
        if (!field.hasOwnProperty('data_type')) {
            throw new Error(__1.ERROR_REASONS.CREATE_COLLECTION_MISS_DATA_TYPE);
        }
        // get data type
        const dataType = (0, __1.convertToDataType)(field.data_type);
        const isPrimaryKey = field.is_primary_key;
        const isPartitionKey = field.is_partition_key;
        if (isPrimaryKey && int64VarCharTypes.includes(dataType)) {
            hasPrimaryKey = true;
        }
        // if partition key is set, it should be set on int64 or varchar and non-primary key field
        if (isPartitionKey) {
            if (!int64VarCharTypes.includes(dataType) || isPrimaryKey) {
                throw new Error(__1.ERROR_REASONS.INVALID_PARTITION_KEY_FIELD_TYPE);
            }
        }
        // if this is the partition key field, check the limit
        if (isPartitionKey) {
            partitionKeyCount++;
        }
        // if this is the vector field, check dimension
        const isVectorField = (0, exports.isVectorType)(dataType);
        const typeParams = field.type_params;
        if (isVectorField) {
            const dim = Number((_a = typeParams === null || typeParams === void 0 ? void 0 : typeParams.dim) !== null && _a !== void 0 ? _a : field.dim);
            if (!dim && dataType !== __1.DataType.SparseFloatVector) {
                throw new Error(__1.ERROR_REASONS.CREATE_COLLECTION_CHECK_MISS_DIM);
            }
            if (dataType === __1.DataType.BinaryVector && dim % 8 !== 0) {
                throw new Error(__1.ERROR_REASONS.CREATE_COLLECTION_CHECK_BINARY_DIM);
            }
            hasVectorField = true;
        }
        // if this is a varchar field, check max_length
        if (dataType === __1.DataType.VarChar) {
            const maxLength = (_b = typeParams === null || typeParams === void 0 ? void 0 : typeParams.max_length) !== null && _b !== void 0 ? _b : field.max_length;
            if (!maxLength) {
                throw new Error(__1.ERROR_REASONS.CREATE_COLLECTION_CHECK_MISS_MAX_LENGTH);
            }
        }
    });
    // if no primary key field is found, throw error
    if (!hasPrimaryKey) {
        throw new Error(__1.ERROR_REASONS.CREATE_COLLECTION_CHECK_PRIMARY_KEY);
    }
    // if no vector field is found, throw error
    if (!hasVectorField) {
        throw new Error(__1.ERROR_REASONS.CREATE_COLLECTION_CHECK_VECTOR_FIELD_EXIST);
    }
    if (partitionKeyCount > __1.MAX_PARTITION_KEY_FIELD_COUNT) {
        throw new Error(__1.ERROR_REASONS.PARTITION_KEY_FIELD_MAXED_OUT);
    }
    return true;
};
exports.checkCollectionFields = checkCollectionFields;
/**
 * check if the request contains collection_name
 * otherwise throw an error
 * @param data
 */
const checkCollectionName = (data) => {
    if (!data || !data.collection_name) {
        throw new Error(__1.ERROR_REASONS.COLLECTION_NAME_IS_REQUIRED);
    }
};
exports.checkCollectionName = checkCollectionName;
/**
 * check if the request contains collection_name and partition_name
 * otherwise throw an error
 * @param data
 */
const checkCollectionAndPartitionName = (data) => {
    if (!data || !data.collection_name || !data.partition_name) {
        throw new Error(__1.ERROR_REASONS.COLLECTION_PARTITION_NAME_ARE_REQUIRED);
    }
};
exports.checkCollectionAndPartitionName = checkCollectionAndPartitionName;
/**
 * Checks the validity of search parameters.
 * @param {Object} data - The search parameters to be checked.
 * @throws {Error} Throws an error if any of the search parameters are invalid.
 */
const checkSearchParams = (data) => {
    (0, exports.checkCollectionName)(data);
    if (!data.vectors && !data.vector && !data.data) {
        throw new Error(__1.ERROR_REASONS.VECTORS_OR_VECTOR_IS_MISSING);
    }
};
exports.checkSearchParams = checkSearchParams;
/**
 * Checks if a gRPC status code matches any of the given codes.
 * DEADLINE_EXCEEDED means that the task wat not completed
 * UNAVAILABLE means that the service is not reachable currently
 * Reference: https://grpc.github.io/grpc/python/grpc.html#grpc-status-code
 *
 * @param {number} code - The gRPC status code to check.
 * @param {number[]} [codesToCheck=[grpcStatus.DEADLINE_EXCEEDED, grpcStatus.UNAVAILABLE]] - An array of gRPC status codes to check against.
 * @returns {boolean} Whether the gRPC status code matches any of the given codes.
 */
const isInIgnoreRetryCodes = (code, codesToCheck = [
    grpc_js_1.status.DEADLINE_EXCEEDED,
    grpc_js_1.status.PERMISSION_DENIED,
    grpc_js_1.status.UNAUTHENTICATED,
    grpc_js_1.status.INVALID_ARGUMENT,
    grpc_js_1.status.ALREADY_EXISTS,
    grpc_js_1.status.RESOURCE_EXHAUSTED,
    grpc_js_1.status.UNIMPLEMENTED,
    grpc_js_1.status.OK,
]) => {
    return codesToCheck.includes(code);
};
exports.isInIgnoreRetryCodes = isInIgnoreRetryCodes;
/**
 * Checks if a milvus status message is valid.
 */
const isInvalidMessage = (message, codesToCheck = []) => {
    return (message &&
        codesToCheck.some(code => code === message.code ||
            (message.status && code === message.status.code)));
};
exports.isInvalidMessage = isInvalidMessage;
/**
 * Validates the number of partitions.
 * @param {number} num_partitions - The number of partitions to validate.
 * @throws {Error} Throws an error if the number of partitions is invalid.
 */
const validatePartitionNumbers = (num_partitions) => {
    if (num_partitions < 1 || num_partitions > __1.MAX_PARTITIONS_NUMBER) {
        throw new Error(__1.ERROR_REASONS.INVALID_PARTITION_NUM);
    }
};
exports.validatePartitionNumbers = validatePartitionNumbers;
/**
 * Checks if the provided data is compatible with the current version of the SDK and server.
 * @param {CreateColReq | CreateCollectionReq} data - The data to check for compatibility.
 * @throws {Error} Throws an error if the SDK and server are incompatible.
 */
const checkCreateCollectionCompatibility = (data) => {
    const hasDynamicSchemaEnabled = data.enableDynamicField ||
        data.enable_dynamic_field;
    if (hasDynamicSchemaEnabled) {
        throw new Error(`Your milvus server doesn't support dynamic schema, please upgrade your server.`);
    }
    const fields = data.fields ||
        data.schema;
    if (fields.some(f => f.is_partition_key === true)) {
        throw new Error(`Your milvus server doesn't support partition key, please upgrade your server.`);
    }
    const hasJSONField = fields.some(f => f.data_type === 'JSON' || f.data_type === __1.DataType.JSON);
    if (hasJSONField) {
        throw new Error(`Your milvus server doesn't support JSON data type, please upgrade your server.`);
    }
};
exports.checkCreateCollectionCompatibility = checkCreateCollectionCompatibility;
/**
 * Checks if the given data type is a vector type.
 * @param {DataType} type - The data type to check.
 * @returns {Boolean} True if the data type is a vector type, false otherwise.
 */
const isVectorType = (type) => {
    return (type === __1.DataType.BinaryVector ||
        type === __1.DataType.FloatVector ||
        type === __1.DataType.Float16Vector ||
        type === __1.DataType.BFloat16Vector ||
        type === __1.DataType.SparseFloatVector);
};
exports.isVectorType = isVectorType;
//# sourceMappingURL=Validate.js.map