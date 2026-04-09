"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFieldData = exports.buildFieldDataMap = exports.processStructArraysData = exports.processScalarData = exports.processVectorData = exports.buildDynamicRow = void 0;
const __1 = require("../");
/**
 * Builds a dynamic row object by separating the input data into non-dynamic fields and a dynamic field.
 *
 * @param {RowData} rowData - The input data object.
 * @param {Map<string, Field>} fieldMap - A map of field names to field objects.
 * @param {string} dynamicFieldName - The name of the dynamic field.
 * @returns {RowData} The generated dynamic row object.
 */
const buildDynamicRow = (rowData, fieldMap, dynamicFieldName, functionOutputFields) => {
    const originRow = (0, __1.cloneObj)(rowData);
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
 * Processes vector data from gRPC response format
 * @param item - The vector field item from gRPC response
 * @param transformers - Optional transformers for data conversion
 * @returns Processed vector data
 */
const processVectorData = (item, transformers) => {
    var _a;
    const dataKey = item.vectors.data;
    let field_data;
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
        case 'int8_vector':
            field_data = [];
            const int8Dim = Number(item.vectors.dim);
            const int8Bytes = item.vectors[dataKey];
            const localTransformers = Object.assign({ [__1.DataType.Int8Vector]: Array.from }, transformers);
            // split buffer data to int8 vector
            for (let i = 0; i < int8Bytes.byteLength; i += int8Dim) {
                const slice = int8Bytes.slice(i, i + int8Dim);
                field_data.push(localTransformers[__1.DataType.Int8Vector](slice));
            }
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
                dataType = isFloat16 ? __1.DataType.Float16Vector : __1.DataType.BFloat16Vector;
                const localTransformers = Object.assign({ [__1.DataType.BFloat16Vector]: __1.bf16BytesToF32Array, [__1.DataType.Float16Vector]: __1.f16BytesToF32Array }, transformers);
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
        case 'vector_array':
            field_data = [];
            const vectorArrayValue = item.vectors[dataKey].data;
            vectorArrayValue.forEach((vector) => {
                field_data.push((0, exports.processVectorData)({
                    vectors: Object.assign({}, vector),
                }));
            });
            break;
        default:
            break;
    }
    return field_data;
};
exports.processVectorData = processVectorData;
/**
 * Processes scalar data from gRPC response format
 * @param item - The scalar field item from gRPC response
 * @returns Processed scalar data
 */
const processScalarData = (item) => {
    // parse scalar data
    const dataKey = item.scalars.data;
    let field_data = item.scalars[dataKey].data;
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
                field_data[i] = buffer.length ? JSON.parse(buffer.toString()) : null;
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
    return field_data;
};
exports.processScalarData = processScalarData;
/**
 * Processes struct arrays data from gRPC response format
 * @param item - The struct arrays field item from gRPC response
 * @returns Processed struct arrays data as array of objects
 */
const processStructArraysData = (item) => {
    const structArrays = item.struct_arrays;
    const fields = structArrays.fields;
    // Process each field using the existing processScalarData function
    const processedFields = fields.map((field) => {
        return {
            fieldName: field.field_name,
            fieldData: field.scalars
                ? (0, exports.processScalarData)(field)
                : (0, exports.processVectorData)(field),
        };
    });
    // Get the number of rows from the first processed field
    const rowCount = processedFields[0].fieldData.length;
    // Initialize result array
    const result = [];
    // Process each row
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
        // Get the length of arrays in this row (assuming all fields have same array length)
        const firstFieldArray = processedFields[0].fieldData[rowIndex];
        const arrayLength = firstFieldArray.length;
        // Create an array of struct objects for this row
        const rowArray = [];
        for (let arrayIndex = 0; arrayIndex < arrayLength; arrayIndex++) {
            const structObject = {};
            // Process each field in the struct
            processedFields.forEach(({ fieldName, fieldData }) => {
                const fieldArray = fieldData[rowIndex];
                structObject[fieldName] = fieldArray[arrayIndex];
            });
            rowArray.push(structObject);
        }
        result.push(rowArray);
    }
    // Apply valid_data filtering if present
    if (item.valid_data && item.valid_data.length) {
        item.valid_data.forEach((v, i) => {
            if (!v) {
                result[i] = null;
            }
        });
    }
    return result;
};
exports.processStructArraysData = processStructArraysData;
/**
 * create a data map for each fields, resolve grpc data format
 * If the field is a vector, split the data into chunks of the appropriate size.
 * If the field is a scalar, decode the JSON/array data if necessary.
 */
const buildFieldDataMap = (fields_data, transformers) => {
    const fieldsDataMap = new Map();
    fields_data.forEach((item, i) => {
        // field data
        let field_data;
        // parse data based on field type
        if (item.vectors) {
            field_data = (0, exports.processVectorData)(item, transformers);
        }
        else if (item.scalars) {
            field_data = (0, exports.processScalarData)(item);
        }
        else if (item.struct_arrays) {
            field_data = (0, exports.processStructArraysData)(item);
        }
        // Add the parsed data to the fieldsDataMap
        fieldsDataMap.set(item.field_name, field_data);
    });
    return fieldsDataMap;
};
exports.buildFieldDataMap = buildFieldDataMap;
/**
 * Builds the field data for a given row and column.
 *
 * @param {RowData} rowData - The data for the row.
 * @param {Field} column - The column information.
 * @returns {FieldData} The field data for the row and column.
 */
const buildFieldData = (rowData, field, transformers, rowIndex) => {
    const { type, elementType, name, fieldMap } = field;
    const isFloat32 = Array.isArray(rowData[name]);
    switch (type) {
        case __1.DataType.BinaryVector:
        case __1.DataType.FloatVector:
        case __1.DataType.Int8Vector:
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
            const elementField = Object.assign(Object.assign({}, field), { type: elementType, fieldMap: fieldMap });
            // Special handling for struct types
            if (elementType == __1.DataType.Struct) {
                // Process each struct element as if it were fields_data
                rowData[name].forEach((structElement, elementIndex) => {
                    // get field names
                    const fieldNames = Object.keys(structElement);
                    // loop through each field name
                    fieldNames.forEach(fieldName => {
                        const structField = fieldMap.get(fieldName);
                        if (!structField) {
                            throw new Error(`${__1.ERROR_REASONS.INSERT_CHECK_WRONG_FIELD} in struct at index ${elementIndex}`);
                        }
                        // Build field data for the struct field
                        const fieldData = (0, exports.buildFieldData)({ [fieldName]: structElement[fieldName] }, structField, transformers, rowIndex);
                        // Special handling for binary and float vector types
                        const dataArray = structField.data[rowIndex] || [];
                        structField.data[rowIndex] = dataArray;
                        const isVectorType = structField.elementType === __1.DataType.BinaryVector ||
                            structField.elementType === __1.DataType.FloatVector;
                        if (isVectorType) {
                            dataArray.push(...(Array.isArray(fieldData) ? fieldData : [fieldData]));
                        }
                        else {
                            dataArray.push(fieldData);
                        }
                    });
                });
                // Return the original data for Array of Struct
                return rowData[name];
            }
            else {
                // Regular array field
                return rowData[name] === null
                    ? undefined
                    : (0, exports.buildFieldData)(rowData, elementField, transformers, rowIndex);
            }
        default:
            return rowData[name] === null ? undefined : rowData[name];
    }
};
exports.buildFieldData = buildFieldData;
//# sourceMappingURL=Data.js.map