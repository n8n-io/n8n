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
exports.getValidDataArray = exports.getSparseDim = exports.getPKFieldExpr = exports.getQueryIteratorExpr = exports.getDataKey = exports.buildDefaultSchema = exports.sleep = exports.findKeyValue = exports.promisify = void 0;
const __1 = require("../");
/**
 * Promisify a function call with optional timeout
 * @param obj - The object containing the target function
 * @param target - The name of the target function to call
 * @param params - The parameters to pass to the target function
 * @param timeout - Optional timeout in milliseconds
 * @returns A Promise that resolves with the result of the target function call
 */
function promisify(pool, target, params, timeout) {
    return __awaiter(this, void 0, void 0, function* () {
        // Calculate the deadline for the function call
        const t = timeout === 0 ? 1000 * 60 * 60 * 24 : timeout;
        // get client
        const client = yield pool.acquire();
        // Create a new Promise that wraps the target function call
        return new Promise((resolve, reject) => {
            try {
                // Call the target function with the provided parameters and deadline
                client[target](params, { deadline: new Date(Date.now() + t) }, (err, result) => {
                    if (err) {
                        // If there was an error, reject the Promise with the error
                        reject(err);
                    }
                    else {
                        // Otherwise, resolve the Promise with the result
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
    });
}
exports.promisify = promisify;
const findKeyValue = (obj, key) => { var _a; return (_a = obj.find(v => v.key === key)) === null || _a === void 0 ? void 0 : _a.value; };
exports.findKeyValue = findKeyValue;
const sleep = (time) => {
    return new Promise(resolve => setTimeout(resolve, time));
};
exports.sleep = sleep;
// build default schema
const buildDefaultSchema = (data) => {
    return [
        {
            name: data.primary_field_name,
            data_type: data.id_type,
            is_primary_key: true,
            autoID: data.auto_id,
        },
        {
            name: data.vector_field_name,
            data_type: __1.DataType.FloatVector,
            dim: data.dimension,
        },
    ];
};
exports.buildDefaultSchema = buildDefaultSchema;
function convertToCamelCase(str) {
    return str.replace(/_(.)/g, function (match, letter) {
        return letter.toUpperCase();
    });
}
const getDataKey = (type, camelCase = false) => {
    let dataKey = '';
    switch (type) {
        case __1.DataType.FloatVector:
            dataKey = 'float_vector';
            break;
        case __1.DataType.Float16Vector:
            dataKey = 'float16_vector';
            break;
        case __1.DataType.BFloat16Vector:
            dataKey = 'bfloat16_vector';
            break;
        case __1.DataType.BinaryVector:
            dataKey = 'binary_vector';
            break;
        case __1.DataType.SparseFloatVector:
            dataKey = 'sparse_float_vector';
            break;
        case __1.DataType.Double:
            dataKey = 'double_data';
            break;
        case __1.DataType.Float:
            dataKey = 'float_data';
            break;
        case __1.DataType.Int64:
            dataKey = 'long_data';
            break;
        case __1.DataType.Int32:
        case __1.DataType.Int16:
        case __1.DataType.Int8:
            dataKey = 'int_data';
            break;
        case __1.DataType.Bool:
            dataKey = 'bool_data';
            break;
        case __1.DataType.VarChar:
            dataKey = 'string_data';
            break;
        case __1.DataType.Array:
            dataKey = 'array_data';
            break;
        case __1.DataType.JSON:
            dataKey = 'json_data';
            break;
        case __1.DataType.None:
            dataKey = 'none';
            break;
        default:
            throw new Error(`${__1.ERROR_REASONS.INSERT_CHECK_WRONG_DATA_TYPE} "${type}."`);
    }
    return camelCase ? convertToCamelCase(dataKey) : dataKey;
};
exports.getDataKey = getDataKey;
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
//# sourceMappingURL=Function.js.map