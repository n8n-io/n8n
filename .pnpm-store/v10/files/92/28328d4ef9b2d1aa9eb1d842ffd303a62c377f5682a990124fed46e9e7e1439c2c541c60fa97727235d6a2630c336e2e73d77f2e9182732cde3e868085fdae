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
exports.formatExprValues = exports.formatSearchData = exports.formatSearchResult = exports.buildSearchRequest = exports.convertRerankParams = exports.WeightedRanker = exports.RRFRanker = exports.buildSearchParams = exports.buildFieldData = exports.getAuthString = exports.buildFieldDataMap = exports.buildDynamicRow = exports.formatDescribedCol = exports.formatCollectionSchema = exports.cloneObj = exports.convertToDataType = exports.extractMethodName = exports.parseTimeToken = exports.assignTypeParams = exports.formatAddress = exports.stringToBase64 = exports.datetimeToHybrids = exports.unixtimeToHybridts = exports.hybridtsToUnixtime = exports.checkTimeParam = exports.formatNumberPrecision = exports.parseToKeyValue = exports.formatKeyValueData = void 0;
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
        ? Object.keys(data).reduce((pre, cur) => [
            ...pre,
            { key: cur, value: valueToString ? String(data[cur]) : data[cur] },
        ], [])
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
    return address.replace(/(http|https)*:\/\//, '');
};
exports.formatAddress = formatAddress;
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
    'mmap.enabled',
]) => {
    var _a;
    const newField = (0, exports.cloneObj)(field);
    // Initialize `type_params` if undefined
    (_a = newField.type_params) !== null && _a !== void 0 ? _a : (newField.type_params = {});
    typeParamKeys.forEach(key => {
        if (key in newField) {
            const value = newField[key];
            // Convert the value to a string, JSON-stringify if it’s an object
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
    throw new Error(__1.ERROR_REASONS.FIELD_TYPE_IS_NOT_SUPPORT);
};
exports.convertToDataType = convertToDataType;
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
 * Formats the input data into a request payload for creating a collection.
 *
 * @param {CreateCollectionReq} data - The input data for creating a collection.
 * @param {Type} schemaType - The schema type for the collection.
 * @returns {Object} The formatted request payload.
 */
const formatCollectionSchema = (data, schemaTypes) => {
    const { collection_name, description, enable_dynamic_field, enableDynamicField, partition_key_field, functions, clustring_key_field, } = data;
    let fields = data.fields;
    if (data.schema) {
        fields = data.schema;
    }
    let payload = {};
    const functionOutputFields = [];
    // if functions is set, parse its params to key-value pairs, and delete inputs and outputs
    if (functions) {
        payload.functions = functions.map((func) => {
            const { input_field_names, output_field_names } = func, rest = __rest(func, ["input_field_names", "output_field_names"]);
            functionOutputFields.push(...output_field_names);
            return schemaTypes.functionSchemaType.create(Object.assign(Object.assign({}, rest), { inputFieldNames: input_field_names, outputFieldNames: output_field_names, params: (0, exports.parseToKeyValue)(func.params, true) }));
        });
    }
    payload = Object.assign({ name: collection_name, description: description || '', enableDynamicField: !!enableDynamicField || !!enable_dynamic_field, fields: fields.map(field => {
            // Assign the typeParams property to the result of parseToKeyValue(type_params).
            const _a = (0, exports.assignTypeParams)(field), { type_params, data_type, element_type, is_function_output, is_partition_key, is_primary_key } = _a, rest = __rest(_a, ["type_params", "data_type", "element_type", "is_function_output", "is_partition_key", "is_primary_key"]);
            const dataType = (0, exports.convertToDataType)(field.data_type);
            const createObj = Object.assign(Object.assign({}, rest), { typeParams: (0, exports.parseToKeyValue)(type_params), data_type,
                dataType, isPrimaryKey: !!is_primary_key, isPartitionKey: !!is_partition_key || field.name === partition_key_field, isFunctionOutput: !!is_function_output || functionOutputFields.includes(field.name), isClusteringKey: !!field.is_clustering_key || field.name === clustring_key_field });
            // if element type exist and
            if (dataType === __1.DataType.Array && typeof element_type !== 'undefined') {
                createObj.elementType = (0, exports.convertToDataType)(element_type);
                createObj.element_type = element_type; // compatibility with old version
            }
            if (typeof field.default_value !== 'undefined') {
                const dataKey = (0, __1.getDataKey)(createObj.dataType, true);
                createObj.defaultValue = {
                    [dataKey]: field.default_value,
                };
            }
            return schemaTypes.fieldSchemaType.create(createObj);
        }) }, payload);
    return payload;
};
exports.formatCollectionSchema = formatCollectionSchema;
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
    // add a dataType property which indicate datatype number
    (_b = (_a = newData.schema) === null || _a === void 0 ? void 0 : _a.fields) === null || _b === void 0 ? void 0 : _b.forEach(f => {
        f.dataType = __1.DataTypeMap[f.data_type];
        // if default_value is set, parse it to the correct format
        if (f.default_value) {
            const defaultValue = f.default_value;
            f.default_value = defaultValue[defaultValue.data];
        }
        // extract type params(key value pair = {key: 'xxx', value: any}), and assign it to the field object(key)
        if (f.type_params && f.type_params.length > 0) {
            f.type_params.forEach(keyValuePair => {
                f[keyValuePair.key] = keyValuePair.value;
            });
        }
    });
    return newData;
};
exports.formatDescribedCol = formatDescribedCol;
/**
 * Builds a dynamic row object by separating the input data into non-dynamic fields and a dynamic field.
 *
 * @param {RowData} rowData - The input data object.
 * @param {Map<string, Field>} fieldMap - A map of field names to field objects.
 * @param {string} dynamicFieldName - The name of the dynamic field.
 * @returns {RowData} The generated dynamic row object.
 */
const buildDynamicRow = (rowData, fieldMap, dynamicFieldName, functionOutputFields) => {
    const originRow = (0, exports.cloneObj)(rowData);
    const row = {};
    // iterate through each key in the input data object
    for (let key in originRow) {
        row[dynamicFieldName] = row[dynamicFieldName] || {}; // initialize the dynamic field object
        if (fieldMap.has(key)) {
            // if the key is in the fieldMap, add it to the non-dynamic fields
            row[key] = originRow[key];
        }
        else {
            if (!functionOutputFields.includes(key)) {
                const obj = row[dynamicFieldName];
                // otherwise, add it to the dynamic field
                obj[key] = originRow[key];
            }
        }
    }
    return row; // return the generated dynamic row object
};
exports.buildDynamicRow = buildDynamicRow;
/**
 * create a data map for each fields, resolve grpc data format
 * If the field is a vector, split the data into chunks of the appropriate size.
 * If the field is a scalar, decode the JSON/array data if necessary.
 */
const buildFieldDataMap = (fields_data, transformers) => {
    const fieldsDataMap = new Map();
    fields_data.forEach((item, i) => {
        var _a;
        // field data
        let field_data;
        // parse vector data
        if (item.field === 'vectors') {
            const dataKey = item.vectors.data;
            switch (dataKey) {
                case 'float_vector':
                case 'binary_vector':
                    const vectorValue = dataKey === 'float_vector'
                        ? item.vectors[dataKey].data
                        : item.vectors[dataKey].toJSON().data;
                    // if binary vector , need use dim / 8 to split vector data
                    const dim = ((_a = item.vectors) === null || _a === void 0 ? void 0 : _a.data) === 'float_vector'
                        ? Number(item.vectors.dim)
                        : Number(item.vectors.dim) / 8;
                    field_data = [];
                    // parse number[] to number[][] by dim
                    vectorValue.forEach((v, i) => {
                        const index = Math.floor(i / dim);
                        if (!field_data[index]) {
                            field_data[index] = [];
                        }
                        field_data[index].push(v);
                    });
                    break;
                case 'float16_vector':
                case 'bfloat16_vector':
                    field_data = [];
                    const f16Dim = Number(item.vectors.dim) * 2; // float16 is 2 bytes, so we need to multiply dim with 2 = one element length
                    const f16Bytes = item.vectors[dataKey];
                    // split buffer data to float16 vector(bytes)
                    for (let i = 0; i < f16Bytes.byteLength; i += f16Dim) {
                        const slice = f16Bytes.slice(i, i + f16Dim);
                        const isFloat16 = dataKey === 'float16_vector';
                        let dataType;
                        dataType = isFloat16
                            ? __1.DataType.Float16Vector
                            : __1.DataType.BFloat16Vector;
                        const localTransformers = transformers || {
                            [__1.DataType.BFloat16Vector]: __1.bf16BytesToF32Array,
                            [__1.DataType.Float16Vector]: __1.f16BytesToF32Array,
                        };
                        field_data.push(localTransformers[dataType](slice));
                    }
                    break;
                case 'sparse_float_vector':
                    const sparseVectorValue = item.vectors[dataKey].contents;
                    field_data = [];
                    sparseVectorValue.forEach((buffer, i) => {
                        field_data[i] = (0, __1.bytesToSparseRow)(buffer);
                    });
                    break;
                default:
                    break;
            }
        }
        else {
            // parse scalar data
            const dataKey = item.scalars.data;
            field_data = item.scalars[dataKey].data;
            // we need to handle array element specifically here
            if (dataKey === 'array_data') {
                field_data = field_data.map((f) => {
                    const dataKey = f.data;
                    return dataKey ? f[dataKey].data : [];
                });
            }
            switch (dataKey) {
                // decode json
                case 'json_data':
                    field_data.forEach((buffer, i) => {
                        field_data[i] = buffer.length
                            ? JSON.parse(buffer.toString())
                            : null;
                    });
                    break;
                default:
                    break;
            }
            // set the field data with null if item.valid_data is not empty array, it the item in valid_data is false, set the field data with null
            if (item.valid_data && item.valid_data.length) {
                item.valid_data.forEach((v, i) => {
                    if (!v) {
                        field_data[i] = null;
                    }
                });
            }
        }
        // Add the parsed data to the fieldsDataMap
        fieldsDataMap.set(item.field_name, field_data);
    });
    return fieldsDataMap;
};
exports.buildFieldDataMap = buildFieldDataMap;
/**
 * Generates an authentication string based on the provided credentials.
 *
 * @param {Object} data - An object containing the authentication credentials.
 * @param {string} [data.username] - The username to use for authentication.
 * @param {string} [data.password] - The password to use for authentication.
 * @param {string} [data.token] - The token to use for authentication.
 * @returns {string} The authentication string.
 */
const getAuthString = (data) => {
    const { username, password, token } = data;
    // build auth string
    const authString = token ? token : `${username}:${password}`;
    // Encode the username and password as a base64 string.
    let auth = Buffer.from(authString, 'utf-8').toString('base64');
    // if we need to create auth interceptors
    const needAuth = (!!username && !!password) || !!token;
    return needAuth ? auth : '';
};
exports.getAuthString = getAuthString;
/**
 * Builds the field data for a given row and column.
 *
 * @param {RowData} rowData - The data for the row.
 * @param {Field} column - The column information.
 * @returns {FieldData} The field data for the row and column.
 */
const buildFieldData = (rowData, field, transformers) => {
    const { type, elementType, name } = field;
    const isFloat32 = Array.isArray(rowData[name]);
    switch (__1.DataTypeMap[type]) {
        case __1.DataType.BinaryVector:
        case __1.DataType.FloatVector:
            return rowData[name];
        case __1.DataType.BFloat16Vector:
            const bf16Transformer = (transformers === null || transformers === void 0 ? void 0 : transformers[__1.DataType.BFloat16Vector]) || __1.f32ArrayToBf16Bytes;
            return isFloat32
                ? bf16Transformer(rowData[name])
                : rowData[name];
        case __1.DataType.Float16Vector:
            const f16Transformer = (transformers === null || transformers === void 0 ? void 0 : transformers[__1.DataType.Float16Vector]) || __1.f32ArrayToF16Bytes;
            return isFloat32
                ? f16Transformer(rowData[name])
                : rowData[name];
        case __1.DataType.JSON:
            return rowData[name]
                ? Buffer.from(JSON.stringify(rowData[name] || {}))
                : Buffer.alloc(0);
        case __1.DataType.Array:
            const elementField = Object.assign(Object.assign({}, field), { type: elementType });
            return rowData[name] === null
                ? undefined
                : (0, exports.buildFieldData)(rowData, elementField, transformers);
        default:
            return rowData[name] === null ? undefined : rowData[name];
    }
};
exports.buildFieldData = buildFieldData;
/**
 * Builds search parameters based on the provided data.
 * @param data - The data object containing search parameters.
 * @returns The search parameters in key-value format.
 */
const buildSearchParams = (data, anns_field) => {
    var _a, _b, _c, _d, _e, _f;
    // create search params
    const search_params = {
        anns_field: data.anns_field || anns_field,
        params: JSON.stringify((_a = data.params) !== null && _a !== void 0 ? _a : {}),
        topk: (_c = (_b = data.limit) !== null && _b !== void 0 ? _b : data.topk) !== null && _c !== void 0 ? _c : __1.DEFAULT_TOPK,
        offset: (_d = data.offset) !== null && _d !== void 0 ? _d : 0,
        metric_type: (_e = data.metric_type) !== null && _e !== void 0 ? _e : '',
        ignore_growing: (_f = data.ignore_growing) !== null && _f !== void 0 ? _f : false,
    };
    // if group_by_field is set
    // reminder: never add this kind of key again, just put params in the params object
    if (data.group_by_field) {
        search_params.group_by_field = data.group_by_field;
    }
    if (data.strict_group_size) {
        search_params.strict_group_size = data.strict_group_size;
    }
    if (data.group_size) {
        search_params.group_size = data.group_size;
    }
    if (data.hints) {
        search_params.hints = data.hints;
    }
    // data.params -> search_params
    for (let key in data.params) {
        search_params[key] = data.params[key];
    }
    return search_params;
};
exports.buildSearchParams = buildSearchParams;
/**
 * Creates a RRFRanker object with the specified value of k.
 * @param k - The value of k used in the RRFRanker strategy.
 * @returns An object representing the RRFRanker strategy with the specified value of k.
 */
const RRFRanker = (k = 60) => {
    return {
        strategy: __1.RANKER_TYPE.RRF,
        params: {
            k,
        },
    };
};
exports.RRFRanker = RRFRanker;
/**
 * Creates a weighted ranker object.
 * @param weights - An array of numbers representing the weights.
 * @returns The weighted ranker object.
 */
const WeightedRanker = (weights) => {
    return {
        strategy: __1.RANKER_TYPE.WEIGHTED,
        params: {
            weights,
        },
    };
};
exports.WeightedRanker = WeightedRanker;
/**
 * Converts the rerank parameters object to a format suitable for API requests.
 * @param rerank - The rerank parameters object.
 * @returns The converted rerank parameters object.
 */
const convertRerankParams = (rerank) => {
    const r = (0, exports.cloneObj)(rerank);
    r.params = JSON.stringify(r.params);
    return r;
};
exports.convertRerankParams = convertRerankParams;
/**
 * This method is used to build search request for a given data.
 * It first fetches the collection info and then constructs the search request based on the data type.
 * It also creates search vectors and a placeholder group for the search.
 *
 * @param {SearchReq | SearchSimpleReq | HybridSearchReq} data - The data for which to build the search request.
 * @param {DescribeCollectionResponse} collectionInfo - The collection information.
 * @param {Root} milvusProto - The milvus protocol object.
 * @returns {Object} An object containing the search requests and search vectors.
 * @returns {Object} return.params - The search requests used in the operation.
 * @returns {string} return.params.collection_name - The name of the collection.
 * @returns {string[]} return.params.partition_names - The partition names.
 * @returns {string[]} return.params.output_fields - The output fields.
 * @returns {number} return.params.nq - The number of query vectors.
 * @returns {string} return.params.dsl - The domain specific language.
 * @returns {string} return.params.dsl_type - The type of the domain specific language.
 * @returns {Uint8Array} return.params.placeholder_group - The placeholder group.
 * @returns {Object} return.params.search_params - The search parameters.
 * @returns {string} return.params.consistency_level - The consistency level.
 * @returns {Number[][]} return.searchVectors - The search vectors used in the operation.
 * @returns {number} return.round_decimal - The score precision.
 */
const buildSearchRequest = (data, collectionInfo, milvusProto) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    // type cast
    const searchReq = data;
    const searchHybridReq = data;
    const searchSimpleReq = data;
    // Initialize requests array
    const requests = [];
    // detect if the request is hybrid search request
    const isHybridSearch = !!(searchHybridReq.data &&
        searchHybridReq.data.length &&
        typeof searchHybridReq.data[0] === 'object' &&
        searchHybridReq.data[0].anns_field);
    // output fields(reference fields)
    const default_output_fields = ['*'];
    // Iterate through collection fields, create search request
    for (let i = 0; i < collectionInfo.schema.fields.length; i++) {
        const field = collectionInfo.schema.fields[i];
        const { name, dataType } = field;
        // if field  type is vector, build the request
        if ((0, __1.isVectorType)(dataType)) {
            let req = data;
            if (isHybridSearch) {
                const singleReq = searchHybridReq.data.find(d => d.anns_field === name);
                // if it is hybrid search and no request target is not found, skip
                if (!singleReq) {
                    continue;
                }
                // merge single request with hybrid request
                req = Object.assign((0, exports.cloneObj)(data), singleReq);
            }
            else {
                // if it is not hybrid search, and we have built one request
                // or user has specified an anns_field to search and is not matching
                //  skip
                const skip = requests.length === 1 ||
                    (typeof req.anns_field !== 'undefined' && req.anns_field !== name);
                if (skip) {
                    continue;
                }
            }
            // get search data
            let searchData = isHybridSearch
                ? req.data
                : searchReq.vectors ||
                    searchSimpleReq.vectors ||
                    searchSimpleReq.vector ||
                    searchSimpleReq.data;
            // format searching data
            searchData = (0, exports.formatSearchData)(searchData, field);
            // create search request
            const request = {
                collection_name: req.collection_name,
                partition_names: req.partition_names || [],
                output_fields: req.output_fields || default_output_fields,
                nq: searchReq.nq || searchData.length,
                dsl: req.expr || searchReq.expr || searchSimpleReq.filter || '',
                dsl_type: __1.DslType.BoolExprV1,
                placeholder_group: (0, __1.buildPlaceholderGroupBytes)(milvusProto, searchData, field),
                search_params: (0, exports.parseToKeyValue)(searchReq.search_params || (0, exports.buildSearchParams)(req, name)),
                consistency_level: req.consistency_level || collectionInfo.consistency_level,
            };
            // if exprValues is set, add it to the request(inner)
            if (req.exprValues) {
                request.expr_template_values = (0, exports.formatExprValues)(req.exprValues);
            }
            requests.push(request);
        }
    }
    /**
     *  It will decide the score precision.
     *  If round_decimal is 3, need return like 3.142
     *  And if Milvus return like 3.142, Node will add more number after this like 3.142000047683716.
     *  So the score need to slice by round_decimal
     */
    const round_decimal = (_d = (_b = (_a = searchReq.search_params) === null || _a === void 0 ? void 0 : _a.round_decimal) !== null && _b !== void 0 ? _b : (_c = searchSimpleReq.params) === null || _c === void 0 ? void 0 : _c.round_decimal) !== null && _d !== void 0 ? _d : -1;
    // outter expr_template_values
    const expr_template_values = searchSimpleReq.exprValues
        ? (0, exports.formatExprValues)(searchSimpleReq.exprValues)
        : undefined;
    // if no anns_field found in search request, throw error
    if (requests.length === 0) {
        throw new Error(__1.ERROR_REASONS.NO_ANNS_FEILD_FOUND_IN_SEARCH);
    }
    return {
        isHybridSearch: isHybridSearch,
        request: isHybridSearch
            ? {
                collection_name: data.collection_name,
                partition_names: data.partition_names,
                requests: requests,
                rank_params: [
                    ...(0, exports.parseToKeyValue)((0, exports.convertRerankParams)(searchHybridReq.rerank || (0, exports.RRFRanker)())),
                    { key: 'round_decimal', value: round_decimal },
                    {
                        key: 'limit',
                        value: (_f = (_e = searchSimpleReq.limit) !== null && _e !== void 0 ? _e : searchSimpleReq.topk) !== null && _f !== void 0 ? _f : __1.DEFAULT_TOPK,
                    },
                ],
                output_fields: (_g = requests[0]) === null || _g === void 0 ? void 0 : _g.output_fields,
                consistency_level: (_h = requests[0]) === null || _h === void 0 ? void 0 : _h.consistency_level,
            }
            : requests[0],
        nq: requests[0].nq,
        round_decimal,
        expr_template_values,
    };
};
exports.buildSearchRequest = buildSearchRequest;
/**
 * Formats the search results returned by Milvus into row data for easier use.
 *
 * @param {SearchRes} searchRes - The search results returned by Milvus.
 * @param {Object} options - The options for formatting the search results.
 * @param {number} options.round_decimal - The number of decimal places to which to round the scores.
 *
 * @returns {any[]} The formatted search results.
 *
 */
const formatSearchResult = (searchRes, options) => {
    var _a;
    const { round_decimal } = options;
    // build final results array
    const results = [];
    const { topks, scores, fields_data, ids } = searchRes.results;
    // build fields data map
    const fieldsDataMap = (0, exports.buildFieldDataMap)(fields_data, options.transformers);
    // build output name array
    const output_fields = [
        ...(!!((_a = searchRes.results.output_fields) === null || _a === void 0 ? void 0 : _a.length)
            ? searchRes.results.output_fields
            : fields_data.map(f => f.field_name)),
    ];
    // fieldsDataMap.set('score', scores); TODO: fieldDataMap to support formatter
    /**
     * This code block formats the search results returned by Milvus into row data for easier use.
     * Milvus supports multiple queries to search and returns all columns data, so we need to splice the data for each search result using the `topk` variable.
     * The `topk` variable is the key we use to splice data for every search result.
     * The `scores` array is spliced using the `topk` value, and the resulting scores are formatted to the specified precision using the `formatNumberPrecision` function. The resulting row data is then pushed to the `results` array.
     */
    topks.forEach((v, index) => {
        const topk = Number(v);
        // if topk is 0, we need to return empty array
        if (topk === 0) {
            results[index] = [];
            return;
        }
        // slice scores, offset is used to get the correct index
        let offset = 0;
        scores.splice(0, topk).forEach((score, scoreIndex) => {
            // get correct index
            const i = offset + scoreIndex;
            // fix round_decimal
            const fixedScore = typeof round_decimal === 'undefined' || round_decimal === -1
                ? score
                : (0, exports.formatNumberPrecision)(score, round_decimal);
            // init result object
            const result = { score: fixedScore };
            // build result,
            output_fields.forEach(field_name => {
                // Check if the field_name exists in the fieldsDataMap
                const isFixedSchema = fieldsDataMap.has(field_name);
                // Get the data for the field_name from the fieldsDataMap
                // If the field_name is not in the fieldsDataMap, use the DEFAULT_DYNAMIC_FIELD
                const data = fieldsDataMap.get(isFixedSchema ? field_name : __1.DEFAULT_DYNAMIC_FIELD);
                // make dynamic data[i] safe
                data[i] = isFixedSchema ? data[i] : data[i] || {};
                // extract dynamic info from dynamic field if necessary
                result[field_name] = isFixedSchema ? data[i] : data[i][field_name];
            });
            // init result slot
            results[index] = results[index] || [];
            // push result data
            results[index].push(result);
        });
        // next offset
        offset += topk;
    });
    return results;
};
exports.formatSearchResult = formatSearchResult;
/**
 * Formats the search vector to match a specific data type.
 * @param {SearchDataType[]} searchVector - The search vector or array of vectors to be formatted.
 * @param {DataType} dataType - The specified data type.
 * @returns {VectorTypes[]} The formatted search vector or array of vectors.
 */
const formatSearchData = (searchData, field) => {
    const { dataType, is_function_output } = field;
    if (is_function_output) {
        return (Array.isArray(searchData) ? searchData : [searchData]);
    }
    switch (dataType) {
        case __1.DataType.FloatVector:
        case __1.DataType.BinaryVector:
        case __1.DataType.Float16Vector:
        case __1.DataType.BFloat16Vector:
            if (!Array.isArray(searchData)) {
                return [searchData];
            }
        case __1.DataType.SparseFloatVector:
            const type = (0, __1.getSparseFloatVectorType)(searchData);
            if (type !== 'unknown') {
                return [searchData];
            }
        default:
            return searchData;
    }
};
exports.formatSearchData = formatSearchData;
const formatExprValues = (exprValues) => {
    const result = {};
    for (const [key, value] of Object.entries(exprValues)) {
        if (Array.isArray(value)) {
            // Handle arrays
            result[key] = { array_val: convertArray(value) };
        }
        else {
            // Handle primitive types
            if (typeof value === 'boolean') {
                result[key] = { bool_val: value };
            }
            else if (typeof value === 'number') {
                result[key] = Number.isInteger(value)
                    ? { int64_val: value }
                    : { float_val: value };
            }
            else if (typeof value === 'string') {
                result[key] = { string_val: value };
            }
        }
    }
    return result;
};
exports.formatExprValues = formatExprValues;
const convertArray = (arr) => {
    const first = arr[0];
    switch (typeof first) {
        case 'boolean':
            return {
                bool_data: {
                    data: arr,
                },
            };
        case 'number':
            if (Number.isInteger(first)) {
                return {
                    long_data: {
                        data: arr,
                    },
                };
            }
            else {
                return {
                    double_data: {
                        data: arr,
                    },
                };
            }
        case 'string':
            return {
                string_data: {
                    data: arr,
                },
            };
        case 'object':
            if (Array.isArray(first)) {
                return {
                    array_data: {
                        data: arr.map(convertArray),
                    },
                };
            }
            else {
                return {
                    json_data: {
                        data: arr,
                    },
                };
            }
        default:
            return {
                string_data: {
                    data: arr,
                },
            };
    }
};
//# sourceMappingURL=Format.js.map