"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDescribedCol = exports.cloneObj = exports.extractMethodName = exports.parseTimeToken = exports.formatAddress = exports.stringToBase64 = exports.datetimeToHybrids = exports.unixtimeToHybridts = exports.hybridtsToUnixtime = exports.checkTimeParam = exports.formatNumberPrecision = exports.parseToKeyValue = exports.formatKeyValueData = void 0;
const __1 = require("../");
/**
 * Formats key-value data based on the provided keys.
 * @param {KeyValuePair[]} data - The array of key-value pairs.
 * @param {string[]} keys - The keys to include in the formatted result.
 * @returns {Object} - The formatted key-value data as an object.
 */
const formatKeyValueData = (data, keys) => {
    const result = {};
    keys.forEach(k => {
        const value = (0, __1.findKeyValue)(data, k);
        result[k] = value;
    });
    return result;
};
exports.formatKeyValueData = formatKeyValueData;
/**
 * parse {row_count:4} to [{key:"row_count",value:"4"}]
 * @param data Object
 * @returns {KeyValuePair[]}
 */
const parseToKeyValue = (data, valueToString) => {
    return data
        ? Object.keys(data).reduce((pre, cur) => {
            let value = data[cur];
            if (valueToString) {
                // Handle complex data types like objects and arrays
                if (value && typeof value === 'object') {
                    value = JSON.stringify(value);
                }
                else {
                    value = String(value);
                }
            }
            return [...pre, { key: cur, value }];
        }, [])
        : [];
};
exports.parseToKeyValue = parseToKeyValue;
/**
 *
 * @param number Number like 3.1738998889923096
 * @param precision The precision you want, if is 3 will return 3.173 and If is 2 will return 3.17
 * @returns
 */
const formatNumberPrecision = (number, precision) => {
    return Number(number
        .toString()
        .split('.')
        .map((v, i) => {
        if (i === 1) {
            return v.slice(0, precision);
        }
        return v;
    })
        .join('.'));
};
exports.formatNumberPrecision = formatNumberPrecision;
const LOGICAL_BITS = BigInt(18);
// const LOGICAL_BITS_MASK = (1 << LOGICAL_BITS) - 1;
/**
 * Checks if the given time parameter is valid.
 *
 * @param ts - The time parameter to be checked.
 * @returns A boolean value indicating whether the time parameter is valid or not.
 */
const checkTimeParam = (ts) => {
    switch (typeof ts) {
        case 'bigint':
            return true;
        case 'string':
            return isNaN(Number(ts)) ? false : true;
        default:
            return false;
    }
};
exports.checkTimeParam = checkTimeParam;
/**
 * Converts a hybrid timestamp to Unix time.
 * @param hybridts - The hybrid timestamp to convert.
 * @returns The Unix time representation of the hybrid timestamp.
 * @throws An error if the hybridts parameter fails the time parameter check.
 */
const hybridtsToUnixtime = (hybridts) => {
    if (!(0, exports.checkTimeParam)(hybridts)) {
        throw new Error(`hybridts ${__1.ERROR_REASONS.TIMESTAMP_PARAM_CHECK}`);
    }
    const timestamp = typeof hybridts === 'bigint' ? hybridts : BigInt(hybridts);
    const physical = timestamp >> LOGICAL_BITS;
    return (physical / BigInt(1000)).toString();
};
exports.hybridtsToUnixtime = hybridtsToUnixtime;
/**
 * Converts a Unix timestamp to a hybrid timestamp.
 * @param unixtime - The Unix timestamp to convert.
 * @returns The hybrid timestamp as a string.
 * @throws An error if the unixtime parameter fails the check.
 */
const unixtimeToHybridts = (unixtime) => {
    if (!(0, exports.checkTimeParam)(unixtime)) {
        throw new Error(`hybridts ${__1.ERROR_REASONS.TIMESTAMP_PARAM_CHECK}`);
    }
    const timestamp = typeof unixtime === 'bigint' ? unixtime : BigInt(unixtime);
    const physical = (timestamp * BigInt(1000)) << LOGICAL_BITS;
    return physical.toString();
};
exports.unixtimeToHybridts = unixtimeToHybridts;
/**
 * Converts a JavaScript Date object to a hybridts timestamp.
 * @param datetime - The JavaScript Date object to be converted.
 * @returns The hybridts timestamp.
 * @throws An error if the input is not a valid Date object.
 */
const datetimeToHybrids = (datetime) => {
    if (!(datetime instanceof Date)) {
        throw new Error(`hybridts ${__1.ERROR_REASONS.DATE_TYPE_CHECK}`);
    }
    return (0, exports.unixtimeToHybridts)((datetime.getTime() / 1000).toString());
};
exports.datetimeToHybrids = datetimeToHybrids;
/**
 * Converts a string to base64 encoding.
 * @param str The string to convert.
 * @returns The base64 encoded string.
 */
const stringToBase64 = (str) => Buffer.from(str, 'utf-8').toString('base64');
exports.stringToBase64 = stringToBase64;
/**
 * Formats the given address by removing the http or https prefix and appending the default Milvus port if necessary.
 * @param address The address to format.
 * @returns The formatted address.
 */
const formatAddress = (address) => {
    // remove http or https prefix from address
    const formatted = address.replace(/(http|https)*:\/\//, '');
    // warn if no port is specified
    if (!formatted.includes(':')) {
        __1.logger.warn(`No port specified in address "${address}". Milvus default port is 19530. If you are not using a proxy, consider specifying the port explicitly, e.g. "${formatted}:19530".`);
    }
    return formatted;
};
exports.formatAddress = formatAddress;
/**
 * Parses a time token and returns the corresponding number of milliseconds.
 *
 * @param {string} token - The time token to parse.
 * @returns {number} The number of milliseconds corresponding to the time token.
 * @throws {Error} If the time token is invalid.
 */
const parseTimeToken = (token) => {
    const num = parseInt(token.slice(0, -1));
    const unit = token.slice(-1);
    switch (unit) {
        case 's':
            return num * 1000;
        case 'm':
            return num * 60 * 1000;
        case 'h':
            return num * 60 * 60 * 1000;
        case 'd':
            return num * 24 * 60 * 60 * 1000;
        case 'w':
            return num * 7 * 24 * 60 * 60 * 1000;
        case 'M':
            return num * 30 * 24 * 60 * 60 * 1000;
        case 'Y':
            return num * 365 * 24 * 60 * 60 * 1000;
        default:
            throw new Error(`Invalid time token: ${token}`);
    }
};
exports.parseTimeToken = parseTimeToken;
/**
 * Extracts the method name from a URL path.
 *
 * @param {string} query - The URL path to extract the method name from.
 * @returns {string} The extracted method name.
 */
const extractMethodName = (query) => {
    const parts = query.split('/');
    return parts[parts.length - 1];
};
exports.extractMethodName = extractMethodName;
/**dd
 * Creates a deep copy of the provided object using JSON.parse and JSON.stringify.
 * Note that this function is not efficient and may cause performance issues if used with large or complex objects. It also does not handle cases where the object being cloned contains functions or prototype methods.
 *
 * @typeparam T The type of object being cloned.
 * @param {T} obj - The object to clone.
 * @returns {T} A new object with the same properties and values as the original.
 */
const cloneObj = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};
exports.cloneObj = cloneObj;
/**
 * Formats a `DescribeCollectionResponse` object by adding a `dataType` property to each field object in its `schema` array.
 * The `dataType` property represents the numerical value of the `data_type` property.
 *
 * @param {DescribeCollectionResponse} data - The `DescribeCollectionResponse` object to format.
 * @returns {DescribeCollectionResponse} A new `DescribeCollectionResponse` object with the updated `dataType` properties.
 */
const formatDescribedCol = (data) => {
    var _a, _b;
    // clone object
    const newData = (0, exports.cloneObj)(data);
    // merge fields and struct_array_fields
    newData.schema.fields = [
        ...newData.schema.fields,
        ...(newData.schema.struct_array_fields || []),
    ];
    // add a dataType property which indicate datatype number
    const formatField = (field, isEmbList = false) => {
        field.dataType = __1.DataTypeMap[field.data_type];
        // if the field is a function output (e.g., OpenAI embedding, BM25),
        // the search input is text, so use VarChar placeholder type
        if (field.is_function_output) {
            field._placeholderType = __1.PlaceholderType.VarChar;
        }
        else {
            // used for search type
            switch (field.dataType) {
                case __1.DataType.FloatVector:
                    field._placeholderType = isEmbList
                        ? __1.PlaceholderType.EmbListFloatVector
                        : __1.PlaceholderType.FloatVector;
                    break;
                case __1.DataType.BinaryVector:
                    field._placeholderType = isEmbList
                        ? __1.PlaceholderType.EmbListBinaryVector
                        : __1.PlaceholderType.BinaryVector;
                    break;
                case __1.DataType.BFloat16Vector:
                    field._placeholderType = isEmbList
                        ? __1.PlaceholderType.EmbListBFloat16Vector
                        : __1.PlaceholderType.BFloat16Vector;
                    break;
                case __1.DataType.Float16Vector:
                    field._placeholderType = isEmbList
                        ? __1.PlaceholderType.EmbListFloat16Vector
                        : __1.PlaceholderType.Float16Vector;
                    break;
                case __1.DataType.Int8Vector:
                    field._placeholderType = isEmbList
                        ? __1.PlaceholderType.EmbListInt8Vector
                        : __1.PlaceholderType.Int8Vector;
                    break;
                case __1.DataType.SparseFloatVector:
                    field._placeholderType = isEmbList
                        ? __1.PlaceholderType.EmbListSparseFloatVector
                        : __1.PlaceholderType.SparseFloatVector;
                    break;
                default:
                    field._placeholderType = field.dataType;
                    break;
            }
        }
        // if default_value is set, parse it to the correct format
        if (field.default_value) {
            const defaultValue = field.default_value;
            field.default_value = defaultValue[defaultValue.data];
        }
        // extract type params(key value pair = {key: 'xxx', value: any}), and assign it to the field object(key)
        if (field.type_params && field.type_params.length > 0) {
            field.type_params.forEach((keyValuePair) => {
                field[keyValuePair.key] = keyValuePair.value;
            });
        }
        // recursively format nested fields for struct types
        if (field.fields && field.fields.length > 0) {
            field.dataType = __1.DataType.Array;
            field.data_type = 'Array';
            field.elementType = __1.DataType.Struct;
            field.element_type = 'Struct';
            field.fields.forEach((childField) => {
                childField.data_type = childField.element_type;
                delete childField.element_type;
                formatField(childField, true);
                // copy field type_params's max_capacity value to the parent field's type_params
                field.type_params = field.type_params || [];
                // if parent field's type_params already has max_capacity, don't add it again
                if (!field.type_params.find((keyValuePair) => keyValuePair.key === 'max_capacity')) {
                    field.type_params.push({
                        key: 'max_capacity',
                        value: childField.max_capacity,
                    });
                }
                field.max_capacity = childField.max_capacity;
                // delete max_capacity in type_params array
                childField.type_params = childField.type_params.filter((keyValuePair) => keyValuePair.key !== 'max_capacity');
            });
        }
    };
    const anns_fields = {};
    const scalar_fields = {};
    const function_fields = {};
    (_b = (_a = newData.schema) === null || _a === void 0 ? void 0 : _a.fields) === null || _b === void 0 ? void 0 : _b.forEach((f) => {
        formatField(f);
        // loop through every fields and struct fields
        // check if the field is the vector field
        if ((0, __1.isVectorType)(f.dataType)) {
            anns_fields[f.name] = f;
        }
        else if (f.dataType === __1.DataType.Array &&
            f.elementType === __1.DataType.Struct) {
            f.fields.forEach((childField) => {
                if ((0, __1.isVectorType)(childField.dataType)) {
                    anns_fields[`${f.name}[${childField.name}]`] = childField;
                }
                else {
                    scalar_fields[`${f.name}[${childField.name}]`] = childField;
                }
            });
        }
        else {
            scalar_fields[f.name] = f;
        }
        if (f.isFunctionOutput) {
            function_fields[f.name] = f;
        }
    });
    newData.anns_fields = anns_fields;
    newData.scalar_fields = scalar_fields;
    newData.function_fields = function_fields;
    return newData;
};
exports.formatDescribedCol = formatDescribedCol;
//# sourceMappingURL=Format.js.map