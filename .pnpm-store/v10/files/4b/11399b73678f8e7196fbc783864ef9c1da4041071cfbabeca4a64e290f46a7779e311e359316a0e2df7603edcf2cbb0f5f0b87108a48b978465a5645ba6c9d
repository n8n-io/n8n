"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPlaceholderGroupBytes = exports.bytesToSparseRow = exports.sparseRowsToBytes = exports.sparseToBytes = exports.getSparseFloatVectorType = exports.bf16BytesToF32Array = exports.f32ArrayToBf16Bytes = exports.f16BytesToF32Array = exports.f32ArrayToF16Bytes = exports.f32ArrayToBinaryBytes = exports.f32ArrayToF32Bytes = void 0;
const float16_1 = require("@petamoriken/float16");
const __1 = require("..");
/**
 * Converts a float vector into bytes format.
 *
 * @param {FloatVector} array - The float vector to convert.
 * @returns {Buffer} Bytes representing the float vector.
 */
const f32ArrayToF32Bytes = (array) => {
    // create array buffer
    const a = new Float32Array(array);
    // need return bytes to milvus proto
    return Buffer.from(a.buffer);
};
exports.f32ArrayToF32Bytes = f32ArrayToF32Bytes;
/**
 * Converts a binary vector into bytes format.
 *
 * @param {BinaryVector} array - The binary vector to convert.
 * @returns {Buffer} Bytes representing the binary vector.
 */
const f32ArrayToBinaryBytes = (array) => {
    const a = new Uint8Array(array);
    // need return bytes to milvus proto
    return Buffer.from(a.buffer);
};
exports.f32ArrayToBinaryBytes = f32ArrayToBinaryBytes;
/**
 * Converts a float16 vector into bytes format.
 *
 * @param {Float16Vector} array - The float16 vector(f32 format) to convert.
 * @returns {Buffer} Bytes representing the float16 vector.
 */
const f32ArrayToF16Bytes = (array) => {
    const float16Bytes = new float16_1.Float16Array(array);
    return Buffer.from(float16Bytes.buffer);
};
exports.f32ArrayToF16Bytes = f32ArrayToF16Bytes;
/**
 * Convert float16 bytes to float32 array.
 * @param {Uint8Array} f16Bytes - The float16 bytes to convert.
 * @returns {Array} The float32 array.
 */
const f16BytesToF32Array = (f16Bytes) => {
    const buffer = new ArrayBuffer(f16Bytes.length);
    const view = new Uint8Array(buffer);
    view.set(f16Bytes);
    const f16Array = new float16_1.Float16Array(buffer);
    return Array.from(f16Array);
};
exports.f16BytesToF32Array = f16BytesToF32Array;
/**
 *  Convert float32 array to BFloat16 bytes, not a real conversion, just take the last 2 bytes of float32.
 * @param {BFloat16Vector} array - The float32 array to convert.
 * @returns {Buffer} The BFloat16 bytes.
 */
const f32ArrayToBf16Bytes = (array) => {
    const totalBytesNeeded = array.length * 2; // 2 bytes per float32
    const buffer = new ArrayBuffer(totalBytesNeeded);
    const bfloatView = new Uint8Array(buffer);
    let byteIndex = 0;
    array.forEach(float32 => {
        const floatBuffer = new ArrayBuffer(4);
        const floatView = new Float32Array(floatBuffer);
        const bfloatViewSingle = new Uint8Array(floatBuffer);
        floatView[0] = float32;
        bfloatView.set(bfloatViewSingle.subarray(2, 4), byteIndex);
        byteIndex += 2;
    });
    return Buffer.from(bfloatView);
};
exports.f32ArrayToBf16Bytes = f32ArrayToBf16Bytes;
/**
 * Convert BFloat16 bytes to Float32 array.
 * @param {Uint8Array} bf16Bytes - The BFloat16 bytes to convert.
 * @returns {Array} The Float32 array.
 */
const bf16BytesToF32Array = (bf16Bytes) => {
    const float32Array = [];
    const totalFloats = bf16Bytes.length / 2;
    for (let i = 0; i < totalFloats; i++) {
        const floatBuffer = new ArrayBuffer(4);
        const floatView = new Float32Array(floatBuffer);
        const bfloatView = new Uint8Array(floatBuffer);
        bfloatView.set(bf16Bytes.subarray(i * 2, i * 2 + 2), 2);
        float32Array.push(floatView[0]);
    }
    return float32Array;
};
exports.bf16BytesToF32Array = bf16BytesToF32Array;
/**
 * Get SparseVector type.
 * @param {SparseFloatVector} vector - The sparse float vector to convert.
 *
 * @returns string, 'array' | 'coo' | 'csr' | 'dict'
 */
const getSparseFloatVectorType = (vector) => {
    if (Array.isArray(vector)) {
        if (vector.length === 0) {
            return 'array';
        }
        if (typeof vector[0] === 'number' || typeof vector[0] === 'undefined') {
            return 'array';
        }
        else if (vector.every(item => typeof item === 'object' && 'index' in item && 'value' in item)) {
            return 'coo';
        }
        else {
            return 'unknown';
        }
    }
    else if (typeof vector === 'object' &&
        'indices' in vector &&
        'values' in vector) {
        return 'csr';
    }
    else if (typeof vector === 'object' &&
        Object.keys(vector).every(key => typeof vector[key] === 'number')) {
        return 'dict';
    }
    else {
        return 'unknown';
    }
};
exports.getSparseFloatVectorType = getSparseFloatVectorType;
/**
 * Converts a sparse float vector into bytes format.
 *
 * @param {SparseFloatVector} data - The sparse float vector to convert, support 'array' | 'coo' | 'csr' | 'dict'.
 *
 * @returns {Uint8Array} Bytes representing the sparse float vector.
 * @throws {Error} If the length of indices and values is not the same, or if the index is not within the valid range, or if the value is NaN.
 */
const sparseToBytes = (data) => {
    // detect the format of the sparse vector
    const type = (0, exports.getSparseFloatVectorType)(data);
    let indices = [];
    let values = [];
    switch (type) {
        case 'array':
            for (let i = 0; i < data.length; i++) {
                const element = data[i];
                if (element !== undefined && !isNaN(element)) {
                    indices.push(i);
                    values.push(element);
                }
            }
            break;
        case 'coo':
            indices = Object.values(data.map((item) => item.index));
            values = Object.values(data.map((item) => item.value));
            break;
        case 'csr':
            indices = data.indices;
            values = data.values;
            break;
        case 'dict':
            indices = Object.keys(data).map(Number);
            values = Object.values(data);
            break;
    }
    // create a buffer to store the bytes
    const bytes = new Uint8Array(8 * indices.length);
    // loop through the indices and values and add them to the buffer
    for (let i = 0; i < indices.length; i++) {
        const index = indices[i];
        const value = values[i];
        if (!(index >= 0 && index < Math.pow(2, 32) - 1)) {
            throw new Error(`Sparse vector index must be positive and less than 2^32-1: ${index}`);
        }
        const indexBytes = new Uint32Array([index]);
        const valueBytes = new Float32Array([value]);
        bytes.set(new Uint8Array(indexBytes.buffer), i * 8);
        bytes.set(new Uint8Array(valueBytes.buffer), i * 8 + 4);
    }
    return bytes;
};
exports.sparseToBytes = sparseToBytes;
/**
 * Converts an array of sparse float vectors into an array of bytes format.
 *
 * @param {SparseFloatVector[]} data - The array of sparse float vectors to convert.
 *
 * @returns {Uint8Array[]} An array of bytes representing the sparse float vectors.
 */
const sparseRowsToBytes = (data) => {
    const result = [];
    for (const row of data) {
        result.push((0, exports.sparseToBytes)(row));
    }
    return result;
};
exports.sparseRowsToBytes = sparseRowsToBytes;
/**
 * Parses the provided buffer data into a sparse row representation.
 *
 * @param {Buffer} bufferData - The buffer data to parse.
 *
 * @returns {SparseFloatVector} The parsed sparse float vectors.
 */
const bytesToSparseRow = (bufferData) => {
    const result = {};
    for (let i = 0; i < bufferData.length; i += 8) {
        const key = bufferData.readUInt32LE(i).toString();
        const value = bufferData.readFloatLE(i + 4);
        if (value) {
            result[key] = value;
        }
    }
    return result;
};
exports.bytesToSparseRow = bytesToSparseRow;
/**
 * This function builds a placeholder group in bytes format for Milvus.
 *
 * @param {Root} milvusProto - The root object of the Milvus protocol.
 * @param {SearchMultipleDataType[]} data - An array of search vectors.
 * @param {DataType} vectorDataType - The data type of the vectors.
 *
 * @returns {Uint8Array} The placeholder group in bytes format.
 */
const buildPlaceholderGroupBytes = (milvusProto, data, field) => {
    const { dataType, is_function_output } = field;
    // create placeholder_group value
    let bytes;
    if (is_function_output) {
        // parse text to bytes
        bytes = data.map(d => new TextEncoder().encode(String(d)));
    }
    else {
        // parse vectors to bytes
        switch (dataType) {
            case __1.DataType.FloatVector:
                bytes = data.map(v => (0, exports.f32ArrayToF32Bytes)(v));
                break;
            case __1.DataType.BinaryVector:
                bytes = data.map(v => (0, exports.f32ArrayToBinaryBytes)(v));
                break;
            case __1.DataType.BFloat16Vector:
                bytes = data.map(v => Array.isArray(v) ? (0, exports.f32ArrayToBf16Bytes)(v) : v);
                break;
            case __1.DataType.Float16Vector:
                bytes = data.map(v => Array.isArray(v) ? (0, exports.f32ArrayToF16Bytes)(v) : v);
                break;
            case __1.DataType.SparseFloatVector:
                bytes = data.map(v => (0, exports.sparseToBytes)(v));
                break;
        }
    }
    // create placeholder_group
    const PlaceholderGroup = milvusProto.lookupType('milvus.proto.common.PlaceholderGroup');
    // tag $0 is hard code in milvus, when dsltype is expr
    const placeholderGroupBytes = PlaceholderGroup.encode(PlaceholderGroup.create({
        placeholders: [
            {
                tag: '$0',
                type: is_function_output ? __1.DataType.VarChar : dataType,
                values: bytes,
            },
        ],
    })).finish();
    return placeholderGroupBytes;
};
exports.buildPlaceholderGroupBytes = buildPlaceholderGroupBytes;
//# sourceMappingURL=Bytes.js.map