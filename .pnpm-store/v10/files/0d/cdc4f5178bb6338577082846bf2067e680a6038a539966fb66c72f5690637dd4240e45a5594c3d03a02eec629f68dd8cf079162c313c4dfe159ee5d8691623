"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCollectionSchema = exports.formatStructArrayFieldSchema = exports.formatFunctionSchema = exports.formatFieldSchema = exports.convertToDataType = exports.assignTypeParams = exports.getDataKey = exports.buildDefaultSchema = void 0;
const __1 = require("../");
function convertToCamelCase(str) {
    return str.replace(/_(.)/g, function (match, letter) {
        return letter.toUpperCase();
    });
}
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
        case __1.DataType.Int8Vector:
            dataKey = 'int8_vector';
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
        case __1.DataType.Geometry:
            dataKey = 'geometry_wkt_data';
            break;
        case __1.DataType.Timestamptz:
            dataKey = 'timestamptz_data';
            break;
        case 106: // Internal: ArrayOfVector
            dataKey = 'vector_array';
            break;
        case __1.DataType.None:
        case __1.DataType.Struct:
            dataKey = 'none';
            break;
        default:
            throw new Error(`${__1.ERROR_REASONS.INSERT_CHECK_WRONG_DATA_TYPE} "${type}."`);
    }
    return camelCase ? convertToCamelCase(dataKey) : dataKey;
};
exports.getDataKey = getDataKey;
/**
 * Assigns specified properties from the `field` object to `type_params` within the `FieldType` object.
 * Converts properties to strings, serializing objects as JSON strings if needed, then removes them from `field`.
 *
 * @param field - The `FieldType` object to modify.
 * @param typeParamKeys - Keys to assign to `type_params` if present in `field`.
 * @returns The modified `FieldType` object.
 */
const assignTypeParams = (field, typeParamKeys = [
    'dim',
    'max_length',
    'max_capacity',
    'enable_match',
    'enable_analyzer',
    'analyzer_params',
    'multi_analyzer_params',
    'mmap.enabled',
]) => {
    var _a;
    const newField = (0, __1.cloneObj)(field);
    // Initialize `type_params` if undefined
    (_a = newField.type_params) !== null && _a !== void 0 ? _a : (newField.type_params = {});
    typeParamKeys.forEach(key => {
        if (key in newField) {
            const value = newField[key];
            // Convert the value to a string, JSON-stringify if it's an object
            newField.type_params[key] =
                typeof value === 'object' ? JSON.stringify(value) : String(value !== null && value !== void 0 ? value : '');
            delete newField[key];
        }
    });
    // delete type_params if it's empty
    if (!Object.keys(newField.type_params).length) {
        delete newField.type_params;
    }
    return newField;
};
exports.assignTypeParams = assignTypeParams;
/**
 * Converts a `key` of type `keyof typeof DataTypeMap | DataType` to a `DataType`.
 *
 * @param {keyof typeof DataTypeMap | DataType} key - The key to convert.
 * @returns {DataType} The converted `DataType`.
 */
const convertToDataType = (key) => {
    if (typeof key === 'string' && key in __1.DataTypeMap) {
        return __1.DataType[key];
    }
    else if (typeof key === 'number' && Object.values(__1.DataType).includes(key)) {
        return key;
    }
    else if (typeof key === 'number') {
        return key; // for internal data type like ArrayOfVector 106
    }
    throw new Error(__1.ERROR_REASONS.FIELD_TYPE_IS_NOT_SUPPORT);
};
exports.convertToDataType = convertToDataType;
/**
 * Formats a field schema by converting its properties to the appropriate types and adding additional properties.
 *
 * @param {FieldType} field - The field to format.
 * @param {Record<string, Type>} schemaTypes - The schema types to use for formatting.
 * @param {Object} [override] - Optional override object for additional properties.
 * @returns {Object} The formatted field schema.
 */
const formatFieldSchema = (field, schemaTypes, override) => {
    const { partition_key_field, functionOutputFields = [], clustering_key_field, } = override || {};
    // Assign the typeParams property to the result of parseToKeyValue(type_params).
    const _a = (0, exports.assignTypeParams)(field), { type_params, data_type, element_type, is_function_output, is_partition_key, is_primary_key } = _a, rest = __rest(_a, ["type_params", "data_type", "element_type", "is_function_output", "is_partition_key", "is_primary_key"]);
    const dataType = (0, exports.convertToDataType)(field.data_type);
    const createObj = Object.assign(Object.assign({}, rest), { typeParams: (0, __1.parseToKeyValue)(type_params), data_type,
        dataType, isPrimaryKey: !!is_primary_key, isPartitionKey: !!is_partition_key || field.name === partition_key_field, isFunctionOutput: !!is_function_output || functionOutputFields.includes(field.name), isClusteringKey: !!field.is_clustering_key || field.name === clustering_key_field });
    // if element type exist and
    if ((dataType === __1.DataType.Array || dataType === 106) &&
        typeof element_type !== 'undefined') {
        createObj.elementType = (0, exports.convertToDataType)(element_type);
        createObj.element_type = element_type; // compatibility with old version
    }
    if (typeof field.default_value !== 'undefined') {
        const dataKey = (0, exports.getDataKey)(createObj.dataType, true);
        // Convert TIMESTAMPTZ default value to UTC microseconds (int64)
        // Milvus stores TIMESTAMPTZ default values internally as int64 (UTC microsecond)
        // Users can pass either a string (RFC3339 format) or a number (microseconds)
        if (createObj.dataType === __1.DataType.Timestamptz) {
            if (typeof field.default_value === 'string') {
                // Convert RFC3339 string to UTC microseconds
                const date = new Date(field.default_value);
                field.default_value = (date.getTime() * 1000).toString();
            }
            else if (typeof field.default_value === 'number') {
                // If already a number, assume it's microseconds (or milliseconds if < 1e12)
                // Convert to microseconds if it looks like milliseconds (< year 2286)
                const value = field.default_value < 1e12
                    ? field.default_value * 1000
                    : field.default_value;
                field.default_value = Math.floor(value).toString();
            }
        }
        createObj.defaultValue = {
            [dataKey]: field.default_value,
        };
    }
    return schemaTypes.fieldSchemaType.create(createObj);
};
exports.formatFieldSchema = formatFieldSchema;
/**
 * Formats a FunctionObject into a FunctionSchema payload for gRPC.
 * Returns a plain object with snake_case field names matching the proto definition
 * in milvus.ts (used by @grpc/proto-loader).
 *
 * @param {FunctionObject} func - The function object to format.
 * @returns {Object} The formatted function schema payload (plain object).
 */
const formatFunctionSchema = (func) => {
    var _a;
    const { input_field_names, output_field_names, type } = func, rest = __rest(func, ["input_field_names", "output_field_names", "type"]);
    // Ensure type is a number (enum value), not a string
    const typeValue = typeof type === 'number'
        ? type
        : (_a = __1.FunctionType[type]) !== null && _a !== void 0 ? _a : type;
    // Return a plain object with snake_case field names for gRPC
    // The @grpc/proto-loader uses milvus.ts which has snake_case field names
    return Object.assign(Object.assign({}, rest), { type: typeValue, input_field_names: input_field_names || [], output_field_names: output_field_names || [], params: (0, __1.parseToKeyValue)(func.params, true) });
};
exports.formatFunctionSchema = formatFunctionSchema;
/**
 * Formats a struct array field schema by converting its properties to the appropriate types and adding additional properties.
 *
 * @param {FieldType} field - The field to format.
 * @param {Record<string, Type>} schemaTypes - The schema types to use for formatting.
 * @returns {Object} The formatted struct array field schema.
 */
const formatStructArrayFieldSchema = (field, schemaTypes) => {
    return schemaTypes.structArrayFieldSchemaType.create({
        name: field.name,
        description: field.description,
        fields: field.fields.map((f) => {
            // convert the field to array field, and set the max capacity
            f.element_type = f.data_type;
            f.data_type = (0, __1.isVectorType)((0, exports.convertToDataType)(f.data_type))
                ? 106 // ArrayOfVector
                : __1.DataType.Array;
            f.max_capacity = field.max_capacity;
            // format schema
            return (0, exports.formatFieldSchema)(f, schemaTypes);
        }),
    });
};
exports.formatStructArrayFieldSchema = formatStructArrayFieldSchema;
/**
 * Formats the input data into a request payload for creating a collection.
 *
 * @param {CreateCollectionReq} data - The input data for creating a collection.
 * @param {Type} schemaType - The schema type for the collection.
 * @returns {Object} The formatted request payload.
 */
const formatCollectionSchema = (data, schemaTypes) => {
    const { collection_name, description, enable_dynamic_field, enableDynamicField, partition_key_field, functions, clustering_key_field, } = data;
    let fields = data.fields;
    if (data.schema) {
        fields = data.schema;
    }
    let payload = {};
    // extract function output fields
    const functionOutputFields = [];
    // if functions is set, parse its params to key-value pairs, and delete inputs and outputs
    if (functions) {
        payload.functions = functions.map((func) => {
            const { input_field_names, output_field_names } = func, rest = __rest(func, ["input_field_names", "output_field_names"]);
            functionOutputFields.push(...(output_field_names || []));
            return schemaTypes.functionSchemaType.create(Object.assign(Object.assign({}, rest), { inputFieldNames: input_field_names || [], outputFieldNames: output_field_names || [], params: (0, __1.parseToKeyValue)(func.params, true) }));
        });
    }
    // extract struct array fields and others
    const [structArrayFields, fieldsWithoutStructArray] = fields.reduce((acc, field) => {
        if (field.data_type === __1.DataType.Array &&
            field.element_type === __1.DataType.Struct) {
            acc[0].push(field);
        }
        else {
            acc[1].push(field);
        }
        return acc;
    }, [[], []]);
    // format the payload
    payload = Object.assign({ name: collection_name, description: description || '', enableDynamicField: !!enableDynamicField || !!enable_dynamic_field, fields: fieldsWithoutStructArray.map(field => (0, exports.formatFieldSchema)(field, schemaTypes, {
            partition_key_field,
            functionOutputFields,
            clustering_key_field,
        })), structArrayFields: structArrayFields.map(field => (0, exports.formatStructArrayFieldSchema)(field, schemaTypes)) }, payload);
    return payload;
};
exports.formatCollectionSchema = formatCollectionSchema;
//# sourceMappingURL=Schema.js.map