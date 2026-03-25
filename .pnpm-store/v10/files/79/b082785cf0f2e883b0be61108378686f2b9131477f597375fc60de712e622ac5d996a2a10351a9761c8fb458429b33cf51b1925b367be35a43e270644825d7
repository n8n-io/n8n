import { FieldType, DataType, CreateColReq, CreateCollectionReq, CreateColWithSchemaAndIndexParamsReq } from '../';
/**
 * when create collection, field must contain 2 Fields.
 * Type is int64 or varchar and primary_key = true
 * Type is one of float_vector and binary_vector
 * Will check fields
 * @param fields
 */
export declare const checkCollectionFields: (fields: FieldType[]) => boolean;
/**
 * check if the request contains collection_name
 * otherwise throw an error
 * @param data
 */
export declare const checkCollectionName: (data: any) => void;
/**
 * check if the request contains collection_name and partition_name
 * otherwise throw an error
 * @param data
 */
export declare const checkCollectionAndPartitionName: (data: any) => void;
/**
 * Checks the validity of search parameters.
 * @param {Object} data - The search parameters to be checked.
 * @throws {Error} Throws an error if any of the search parameters are invalid.
 */
export declare const checkSearchParams: (data: any) => void;
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
export declare const isInIgnoreRetryCodes: (code: number, codesToCheck?: number[]) => boolean;
/**
 * Checks if a milvus status message is valid.
 */
export declare const isInvalidMessage: (message: {
    code: number;
    status?: {
        code: number;
    };
}, codesToCheck?: number[]) => boolean;
/**
 * Validates the number of partitions.
 * @param {number} num_partitions - The number of partitions to validate.
 * @throws {Error} Throws an error if the number of partitions is invalid.
 */
export declare const validatePartitionNumbers: (num_partitions: number) => void;
/**
 * Checks if the provided data is compatible with the current version of the SDK and server.
 * @param {CreateColReq | CreateCollectionReq} data - The data to check for compatibility.
 * @throws {Error} Throws an error if the SDK and server are incompatible.
 */
export declare const checkCreateCollectionCompatibility: (data: CreateColReq | CreateColWithSchemaAndIndexParamsReq | CreateCollectionReq) => void;
/**
 * Checks if the given data type is a vector type.
 * @param {DataType} type - The data type to check.
 * @returns {Boolean} True if the data type is a vector type, false otherwise.
 */
export declare const isVectorType: (type: DataType) => boolean;
