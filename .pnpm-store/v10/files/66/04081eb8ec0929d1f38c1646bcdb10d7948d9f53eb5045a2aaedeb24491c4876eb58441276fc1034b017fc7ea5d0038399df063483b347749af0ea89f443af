/// <reference types="node" />
import { Root } from 'protobufjs';
import { FloatVector, BinaryVector, SparseFloatVector, SearchMultipleDataType, Float16Vector, BFloat16Vector, FieldSchema } from '..';
/**
 * Converts a float vector into bytes format.
 *
 * @param {FloatVector} array - The float vector to convert.
 * @returns {Buffer} Bytes representing the float vector.
 */
export declare const f32ArrayToF32Bytes: (array: FloatVector) => Buffer;
/**
 * Converts a binary vector into bytes format.
 *
 * @param {BinaryVector} array - The binary vector to convert.
 * @returns {Buffer} Bytes representing the binary vector.
 */
export declare const f32ArrayToBinaryBytes: (array: BinaryVector) => Buffer;
/**
 * Converts a float16 vector into bytes format.
 *
 * @param {Float16Vector} array - The float16 vector(f32 format) to convert.
 * @returns {Buffer} Bytes representing the float16 vector.
 */
export declare const f32ArrayToF16Bytes: (array: Float16Vector) => Buffer;
/**
 * Convert float16 bytes to float32 array.
 * @param {Uint8Array} f16Bytes - The float16 bytes to convert.
 * @returns {Array} The float32 array.
 */
export declare const f16BytesToF32Array: (f16Bytes: Uint8Array) => number[];
/**
 *  Convert float32 array to BFloat16 bytes, not a real conversion, just take the last 2 bytes of float32.
 * @param {BFloat16Vector} array - The float32 array to convert.
 * @returns {Buffer} The BFloat16 bytes.
 */
export declare const f32ArrayToBf16Bytes: (array: BFloat16Vector) => Buffer;
/**
 * Convert BFloat16 bytes to Float32 array.
 * @param {Uint8Array} bf16Bytes - The BFloat16 bytes to convert.
 * @returns {Array} The Float32 array.
 */
export declare const bf16BytesToF32Array: (bf16Bytes: Uint8Array) => number[];
/**
 * Get SparseVector type.
 * @param {SparseFloatVector} vector - The sparse float vector to convert.
 *
 * @returns string, 'array' | 'coo' | 'csr' | 'dict'
 */
export declare const getSparseFloatVectorType: (vector: SparseFloatVector) => 'array' | 'coo' | 'csr' | 'dict' | 'unknown';
/**
 * Converts a sparse float vector into bytes format.
 *
 * @param {SparseFloatVector} data - The sparse float vector to convert, support 'array' | 'coo' | 'csr' | 'dict'.
 *
 * @returns {Uint8Array} Bytes representing the sparse float vector.
 * @throws {Error} If the length of indices and values is not the same, or if the index is not within the valid range, or if the value is NaN.
 */
export declare const sparseToBytes: (data: SparseFloatVector) => Uint8Array;
/**
 * Converts an array of sparse float vectors into an array of bytes format.
 *
 * @param {SparseFloatVector[]} data - The array of sparse float vectors to convert.
 *
 * @returns {Uint8Array[]} An array of bytes representing the sparse float vectors.
 */
export declare const sparseRowsToBytes: (data: SparseFloatVector[]) => Uint8Array[];
/**
 * Parses the provided buffer data into a sparse row representation.
 *
 * @param {Buffer} bufferData - The buffer data to parse.
 *
 * @returns {SparseFloatVector} The parsed sparse float vectors.
 */
export declare const bytesToSparseRow: (bufferData: Buffer) => SparseFloatVector;
/**
 * This function builds a placeholder group in bytes format for Milvus.
 *
 * @param {Root} milvusProto - The root object of the Milvus protocol.
 * @param {SearchMultipleDataType[]} data - An array of search vectors.
 * @param {DataType} vectorDataType - The data type of the vectors.
 *
 * @returns {Uint8Array} The placeholder group in bytes format.
 */
export declare const buildPlaceholderGroupBytes: (milvusProto: Root, data: SearchMultipleDataType, field: FieldSchema) => Uint8Array;
