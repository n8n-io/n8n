// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as base64 from "./base64.js";
import { XML_ATTRKEY, XML_CHARKEY, } from "./interfaces.js";
import { isDuration, isValidUuid } from "./utils.js";
class SerializerImpl {
    constructor(modelMappers = {}, isXML = false) {
        this.modelMappers = modelMappers;
        this.isXML = isXML;
    }
    /**
     * @deprecated Removing the constraints validation on client side.
     */
    validateConstraints(mapper, value, objectName) {
        const failValidation = (constraintName, constraintValue) => {
            throw new Error(`"${objectName}" with value "${value}" should satisfy the constraint "${constraintName}": ${constraintValue}.`);
        };
        if (mapper.constraints && value !== undefined && value !== null) {
            const { ExclusiveMaximum, ExclusiveMinimum, InclusiveMaximum, InclusiveMinimum, MaxItems, MaxLength, MinItems, MinLength, MultipleOf, Pattern, UniqueItems, } = mapper.constraints;
            if (ExclusiveMaximum !== undefined && value >= ExclusiveMaximum) {
                failValidation("ExclusiveMaximum", ExclusiveMaximum);
            }
            if (ExclusiveMinimum !== undefined && value <= ExclusiveMinimum) {
                failValidation("ExclusiveMinimum", ExclusiveMinimum);
            }
            if (InclusiveMaximum !== undefined && value > InclusiveMaximum) {
                failValidation("InclusiveMaximum", InclusiveMaximum);
            }
            if (InclusiveMinimum !== undefined && value < InclusiveMinimum) {
                failValidation("InclusiveMinimum", InclusiveMinimum);
            }
            if (MaxItems !== undefined && value.length > MaxItems) {
                failValidation("MaxItems", MaxItems);
            }
            if (MaxLength !== undefined && value.length > MaxLength) {
                failValidation("MaxLength", MaxLength);
            }
            if (MinItems !== undefined && value.length < MinItems) {
                failValidation("MinItems", MinItems);
            }
            if (MinLength !== undefined && value.length < MinLength) {
                failValidation("MinLength", MinLength);
            }
            if (MultipleOf !== undefined && value % MultipleOf !== 0) {
                failValidation("MultipleOf", MultipleOf);
            }
            if (Pattern) {
                const pattern = typeof Pattern === "string" ? new RegExp(Pattern) : Pattern;
                if (typeof value !== "string" || value.match(pattern) === null) {
                    failValidation("Pattern", Pattern);
                }
            }
            if (UniqueItems &&
                value.some((item, i, ar) => ar.indexOf(item) !== i)) {
                failValidation("UniqueItems", UniqueItems);
            }
        }
    }
    /**
     * Serialize the given object based on its metadata defined in the mapper
     *
     * @param mapper - The mapper which defines the metadata of the serializable object
     *
     * @param object - A valid Javascript object to be serialized
     *
     * @param objectName - Name of the serialized object
     *
     * @param options - additional options to serialization
     *
     * @returns A valid serialized Javascript object
     */
    serialize(mapper, object, objectName, options = { xml: {} }) {
        var _a, _b, _c;
        const updatedOptions = {
            xml: {
                rootName: (_a = options.xml.rootName) !== null && _a !== void 0 ? _a : "",
                includeRoot: (_b = options.xml.includeRoot) !== null && _b !== void 0 ? _b : false,
                xmlCharKey: (_c = options.xml.xmlCharKey) !== null && _c !== void 0 ? _c : XML_CHARKEY,
            },
        };
        let payload = {};
        const mapperType = mapper.type.name;
        if (!objectName) {
            objectName = mapper.serializedName;
        }
        if (mapperType.match(/^Sequence$/i) !== null) {
            payload = [];
        }
        if (mapper.isConstant) {
            object = mapper.defaultValue;
        }
        // This table of allowed values should help explain
        // the mapper.required and mapper.nullable properties.
        // X means "neither undefined or null are allowed".
        //           || required
        //           || true      | false
        //  nullable || ==========================
        //      true || null      | undefined/null
        //     false || X         | undefined
        // undefined || X         | undefined/null
        const { required, nullable } = mapper;
        if (required && nullable && object === undefined) {
            throw new Error(`${objectName} cannot be undefined.`);
        }
        if (required && !nullable && (object === undefined || object === null)) {
            throw new Error(`${objectName} cannot be null or undefined.`);
        }
        if (!required && nullable === false && object === null) {
            throw new Error(`${objectName} cannot be null.`);
        }
        if (object === undefined || object === null) {
            payload = object;
        }
        else {
            if (mapperType.match(/^any$/i) !== null) {
                payload = object;
            }
            else if (mapperType.match(/^(Number|String|Boolean|Object|Stream|Uuid)$/i) !== null) {
                payload = serializeBasicTypes(mapperType, objectName, object);
            }
            else if (mapperType.match(/^Enum$/i) !== null) {
                const enumMapper = mapper;
                payload = serializeEnumType(objectName, enumMapper.type.allowedValues, object);
            }
            else if (mapperType.match(/^(Date|DateTime|TimeSpan|DateTimeRfc1123|UnixTime)$/i) !== null) {
                payload = serializeDateTypes(mapperType, object, objectName);
            }
            else if (mapperType.match(/^ByteArray$/i) !== null) {
                payload = serializeByteArrayType(objectName, object);
            }
            else if (mapperType.match(/^Base64Url$/i) !== null) {
                payload = serializeBase64UrlType(objectName, object);
            }
            else if (mapperType.match(/^Sequence$/i) !== null) {
                payload = serializeSequenceType(this, mapper, object, objectName, Boolean(this.isXML), updatedOptions);
            }
            else if (mapperType.match(/^Dictionary$/i) !== null) {
                payload = serializeDictionaryType(this, mapper, object, objectName, Boolean(this.isXML), updatedOptions);
            }
            else if (mapperType.match(/^Composite$/i) !== null) {
                payload = serializeCompositeType(this, mapper, object, objectName, Boolean(this.isXML), updatedOptions);
            }
        }
        return payload;
    }
    /**
     * Deserialize the given object based on its metadata defined in the mapper
     *
     * @param mapper - The mapper which defines the metadata of the serializable object
     *
     * @param responseBody - A valid Javascript entity to be deserialized
     *
     * @param objectName - Name of the deserialized object
     *
     * @param options - Controls behavior of XML parser and builder.
     *
     * @returns A valid deserialized Javascript object
     */
    deserialize(mapper, responseBody, objectName, options = { xml: {} }) {
        var _a, _b, _c, _d;
        const updatedOptions = {
            xml: {
                rootName: (_a = options.xml.rootName) !== null && _a !== void 0 ? _a : "",
                includeRoot: (_b = options.xml.includeRoot) !== null && _b !== void 0 ? _b : false,
                xmlCharKey: (_c = options.xml.xmlCharKey) !== null && _c !== void 0 ? _c : XML_CHARKEY,
            },
            ignoreUnknownProperties: (_d = options.ignoreUnknownProperties) !== null && _d !== void 0 ? _d : false,
        };
        if (responseBody === undefined || responseBody === null) {
            if (this.isXML && mapper.type.name === "Sequence" && !mapper.xmlIsWrapped) {
                // Edge case for empty XML non-wrapped lists. xml2js can't distinguish
                // between the list being empty versus being missing,
                // so let's do the more user-friendly thing and return an empty list.
                responseBody = [];
            }
            // specifically check for undefined as default value can be a falsey value `0, "", false, null`
            if (mapper.defaultValue !== undefined) {
                responseBody = mapper.defaultValue;
            }
            return responseBody;
        }
        let payload;
        const mapperType = mapper.type.name;
        if (!objectName) {
            objectName = mapper.serializedName;
        }
        if (mapperType.match(/^Composite$/i) !== null) {
            payload = deserializeCompositeType(this, mapper, responseBody, objectName, updatedOptions);
        }
        else {
            if (this.isXML) {
                const xmlCharKey = updatedOptions.xml.xmlCharKey;
                /**
                 * If the mapper specifies this as a non-composite type value but the responseBody contains
                 * both header ("$" i.e., XML_ATTRKEY) and body ("#" i.e., XML_CHARKEY) properties,
                 * then just reduce the responseBody value to the body ("#" i.e., XML_CHARKEY) property.
                 */
                if (responseBody[XML_ATTRKEY] !== undefined && responseBody[xmlCharKey] !== undefined) {
                    responseBody = responseBody[xmlCharKey];
                }
            }
            if (mapperType.match(/^Number$/i) !== null) {
                payload = parseFloat(responseBody);
                if (isNaN(payload)) {
                    payload = responseBody;
                }
            }
            else if (mapperType.match(/^Boolean$/i) !== null) {
                if (responseBody === "true") {
                    payload = true;
                }
                else if (responseBody === "false") {
                    payload = false;
                }
                else {
                    payload = responseBody;
                }
            }
            else if (mapperType.match(/^(String|Enum|Object|Stream|Uuid|TimeSpan|any)$/i) !== null) {
                payload = responseBody;
            }
            else if (mapperType.match(/^(Date|DateTime|DateTimeRfc1123)$/i) !== null) {
                payload = new Date(responseBody);
            }
            else if (mapperType.match(/^UnixTime$/i) !== null) {
                payload = unixTimeToDate(responseBody);
            }
            else if (mapperType.match(/^ByteArray$/i) !== null) {
                payload = base64.decodeString(responseBody);
            }
            else if (mapperType.match(/^Base64Url$/i) !== null) {
                payload = base64UrlToByteArray(responseBody);
            }
            else if (mapperType.match(/^Sequence$/i) !== null) {
                payload = deserializeSequenceType(this, mapper, responseBody, objectName, updatedOptions);
            }
            else if (mapperType.match(/^Dictionary$/i) !== null) {
                payload = deserializeDictionaryType(this, mapper, responseBody, objectName, updatedOptions);
            }
        }
        if (mapper.isConstant) {
            payload = mapper.defaultValue;
        }
        return payload;
    }
}
/**
 * Method that creates and returns a Serializer.
 * @param modelMappers - Known models to map
 * @param isXML - If XML should be supported
 */
export function createSerializer(modelMappers = {}, isXML = false) {
    return new SerializerImpl(modelMappers, isXML);
}
function trimEnd(str, ch) {
    let len = str.length;
    while (len - 1 >= 0 && str[len - 1] === ch) {
        --len;
    }
    return str.substr(0, len);
}
function bufferToBase64Url(buffer) {
    if (!buffer) {
        return undefined;
    }
    if (!(buffer instanceof Uint8Array)) {
        throw new Error(`Please provide an input of type Uint8Array for converting to Base64Url.`);
    }
    // Uint8Array to Base64.
    const str = base64.encodeByteArray(buffer);
    // Base64 to Base64Url.
    return trimEnd(str, "=").replace(/\+/g, "-").replace(/\//g, "_");
}
function base64UrlToByteArray(str) {
    if (!str) {
        return undefined;
    }
    if (str && typeof str.valueOf() !== "string") {
        throw new Error("Please provide an input of type string for converting to Uint8Array");
    }
    // Base64Url to Base64.
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    // Base64 to Uint8Array.
    return base64.decodeString(str);
}
function splitSerializeName(prop) {
    const classes = [];
    let partialclass = "";
    if (prop) {
        const subwords = prop.split(".");
        for (const item of subwords) {
            if (item.charAt(item.length - 1) === "\\") {
                partialclass += item.substr(0, item.length - 1) + ".";
            }
            else {
                partialclass += item;
                classes.push(partialclass);
                partialclass = "";
            }
        }
    }
    return classes;
}
function dateToUnixTime(d) {
    if (!d) {
        return undefined;
    }
    if (typeof d.valueOf() === "string") {
        d = new Date(d);
    }
    return Math.floor(d.getTime() / 1000);
}
function unixTimeToDate(n) {
    if (!n) {
        return undefined;
    }
    return new Date(n * 1000);
}
function serializeBasicTypes(typeName, objectName, value) {
    if (value !== null && value !== undefined) {
        if (typeName.match(/^Number$/i) !== null) {
            if (typeof value !== "number") {
                throw new Error(`${objectName} with value ${value} must be of type number.`);
            }
        }
        else if (typeName.match(/^String$/i) !== null) {
            if (typeof value.valueOf() !== "string") {
                throw new Error(`${objectName} with value "${value}" must be of type string.`);
            }
        }
        else if (typeName.match(/^Uuid$/i) !== null) {
            if (!(typeof value.valueOf() === "string" && isValidUuid(value))) {
                throw new Error(`${objectName} with value "${value}" must be of type string and a valid uuid.`);
            }
        }
        else if (typeName.match(/^Boolean$/i) !== null) {
            if (typeof value !== "boolean") {
                throw new Error(`${objectName} with value ${value} must be of type boolean.`);
            }
        }
        else if (typeName.match(/^Stream$/i) !== null) {
            const objectType = typeof value;
            if (objectType !== "string" &&
                typeof value.pipe !== "function" && // NodeJS.ReadableStream
                typeof value.tee !== "function" && // browser ReadableStream
                !(value instanceof ArrayBuffer) &&
                !ArrayBuffer.isView(value) &&
                // File objects count as a type of Blob, so we want to use instanceof explicitly
                !((typeof Blob === "function" || typeof Blob === "object") && value instanceof Blob) &&
                objectType !== "function") {
                throw new Error(`${objectName} must be a string, Blob, ArrayBuffer, ArrayBufferView, ReadableStream, or () => ReadableStream.`);
            }
        }
    }
    return value;
}
function serializeEnumType(objectName, allowedValues, value) {
    if (!allowedValues) {
        throw new Error(`Please provide a set of allowedValues to validate ${objectName} as an Enum Type.`);
    }
    const isPresent = allowedValues.some((item) => {
        if (typeof item.valueOf() === "string") {
            return item.toLowerCase() === value.toLowerCase();
        }
        return item === value;
    });
    if (!isPresent) {
        throw new Error(`${value} is not a valid value for ${objectName}. The valid values are: ${JSON.stringify(allowedValues)}.`);
    }
    return value;
}
function serializeByteArrayType(objectName, value) {
    if (value !== undefined && value !== null) {
        if (!(value instanceof Uint8Array)) {
            throw new Error(`${objectName} must be of type Uint8Array.`);
        }
        value = base64.encodeByteArray(value);
    }
    return value;
}
function serializeBase64UrlType(objectName, value) {
    if (value !== undefined && value !== null) {
        if (!(value instanceof Uint8Array)) {
            throw new Error(`${objectName} must be of type Uint8Array.`);
        }
        value = bufferToBase64Url(value);
    }
    return value;
}
function serializeDateTypes(typeName, value, objectName) {
    if (value !== undefined && value !== null) {
        if (typeName.match(/^Date$/i) !== null) {
            if (!(value instanceof Date ||
                (typeof value.valueOf() === "string" && !isNaN(Date.parse(value))))) {
                throw new Error(`${objectName} must be an instanceof Date or a string in ISO8601 format.`);
            }
            value =
                value instanceof Date
                    ? value.toISOString().substring(0, 10)
                    : new Date(value).toISOString().substring(0, 10);
        }
        else if (typeName.match(/^DateTime$/i) !== null) {
            if (!(value instanceof Date ||
                (typeof value.valueOf() === "string" && !isNaN(Date.parse(value))))) {
                throw new Error(`${objectName} must be an instanceof Date or a string in ISO8601 format.`);
            }
            value = value instanceof Date ? value.toISOString() : new Date(value).toISOString();
        }
        else if (typeName.match(/^DateTimeRfc1123$/i) !== null) {
            if (!(value instanceof Date ||
                (typeof value.valueOf() === "string" && !isNaN(Date.parse(value))))) {
                throw new Error(`${objectName} must be an instanceof Date or a string in RFC-1123 format.`);
            }
            value = value instanceof Date ? value.toUTCString() : new Date(value).toUTCString();
        }
        else if (typeName.match(/^UnixTime$/i) !== null) {
            if (!(value instanceof Date ||
                (typeof value.valueOf() === "string" && !isNaN(Date.parse(value))))) {
                throw new Error(`${objectName} must be an instanceof Date or a string in RFC-1123/ISO8601 format ` +
                    `for it to be serialized in UnixTime/Epoch format.`);
            }
            value = dateToUnixTime(value);
        }
        else if (typeName.match(/^TimeSpan$/i) !== null) {
            if (!isDuration(value)) {
                throw new Error(`${objectName} must be a string in ISO 8601 format. Instead was "${value}".`);
            }
        }
    }
    return value;
}
function serializeSequenceType(serializer, mapper, object, objectName, isXml, options) {
    var _a;
    if (!Array.isArray(object)) {
        throw new Error(`${objectName} must be of type Array.`);
    }
    let elementType = mapper.type.element;
    if (!elementType || typeof elementType !== "object") {
        throw new Error(`element" metadata for an Array must be defined in the ` +
            `mapper and it must of type "object" in ${objectName}.`);
    }
    // Quirk: Composite mappers referenced by `element` might
    // not have *all* properties declared (like uberParent),
    // so let's try to look up the full definition by name.
    if (elementType.type.name === "Composite" && elementType.type.className) {
        elementType = (_a = serializer.modelMappers[elementType.type.className]) !== null && _a !== void 0 ? _a : elementType;
    }
    const tempArray = [];
    for (let i = 0; i < object.length; i++) {
        const serializedValue = serializer.serialize(elementType, object[i], objectName, options);
        if (isXml && elementType.xmlNamespace) {
            const xmlnsKey = elementType.xmlNamespacePrefix
                ? `xmlns:${elementType.xmlNamespacePrefix}`
                : "xmlns";
            if (elementType.type.name === "Composite") {
                tempArray[i] = Object.assign({}, serializedValue);
                tempArray[i][XML_ATTRKEY] = { [xmlnsKey]: elementType.xmlNamespace };
            }
            else {
                tempArray[i] = {};
                tempArray[i][options.xml.xmlCharKey] = serializedValue;
                tempArray[i][XML_ATTRKEY] = { [xmlnsKey]: elementType.xmlNamespace };
            }
        }
        else {
            tempArray[i] = serializedValue;
        }
    }
    return tempArray;
}
function serializeDictionaryType(serializer, mapper, object, objectName, isXml, options) {
    if (typeof object !== "object") {
        throw new Error(`${objectName} must be of type object.`);
    }
    const valueType = mapper.type.value;
    if (!valueType || typeof valueType !== "object") {
        throw new Error(`"value" metadata for a Dictionary must be defined in the ` +
            `mapper and it must of type "object" in ${objectName}.`);
    }
    const tempDictionary = {};
    for (const key of Object.keys(object)) {
        const serializedValue = serializer.serialize(valueType, object[key], objectName, options);
        // If the element needs an XML namespace we need to add it within the $ property
        tempDictionary[key] = getXmlObjectValue(valueType, serializedValue, isXml, options);
    }
    // Add the namespace to the root element if needed
    if (isXml && mapper.xmlNamespace) {
        const xmlnsKey = mapper.xmlNamespacePrefix ? `xmlns:${mapper.xmlNamespacePrefix}` : "xmlns";
        const result = tempDictionary;
        result[XML_ATTRKEY] = { [xmlnsKey]: mapper.xmlNamespace };
        return result;
    }
    return tempDictionary;
}
/**
 * Resolves the additionalProperties property from a referenced mapper
 * @param serializer - the serializer containing the entire set of mappers
 * @param mapper - the composite mapper to resolve
 * @param objectName - name of the object being serialized
 */
function resolveAdditionalProperties(serializer, mapper, objectName) {
    const additionalProperties = mapper.type.additionalProperties;
    if (!additionalProperties && mapper.type.className) {
        const modelMapper = resolveReferencedMapper(serializer, mapper, objectName);
        return modelMapper === null || modelMapper === void 0 ? void 0 : modelMapper.type.additionalProperties;
    }
    return additionalProperties;
}
/**
 * Finds the mapper referenced by className
 * @param serializer - the serializer containing the entire set of mappers
 * @param mapper - the composite mapper to resolve
 * @param objectName - name of the object being serialized
 */
function resolveReferencedMapper(serializer, mapper, objectName) {
    const className = mapper.type.className;
    if (!className) {
        throw new Error(`Class name for model "${objectName}" is not provided in the mapper "${JSON.stringify(mapper, undefined, 2)}".`);
    }
    return serializer.modelMappers[className];
}
/**
 * Resolves a composite mapper's modelProperties.
 * @param serializer - the serializer containing the entire set of mappers
 * @param mapper - the composite mapper to resolve
 */
function resolveModelProperties(serializer, mapper, objectName) {
    let modelProps = mapper.type.modelProperties;
    if (!modelProps) {
        const modelMapper = resolveReferencedMapper(serializer, mapper, objectName);
        if (!modelMapper) {
            throw new Error(`mapper() cannot be null or undefined for model "${mapper.type.className}".`);
        }
        modelProps = modelMapper === null || modelMapper === void 0 ? void 0 : modelMapper.type.modelProperties;
        if (!modelProps) {
            throw new Error(`modelProperties cannot be null or undefined in the ` +
                `mapper "${JSON.stringify(modelMapper)}" of type "${mapper.type.className}" for object "${objectName}".`);
        }
    }
    return modelProps;
}
function serializeCompositeType(serializer, mapper, object, objectName, isXml, options) {
    if (getPolymorphicDiscriminatorRecursively(serializer, mapper)) {
        mapper = getPolymorphicMapper(serializer, mapper, object, "clientName");
    }
    if (object !== undefined && object !== null) {
        const payload = {};
        const modelProps = resolveModelProperties(serializer, mapper, objectName);
        for (const key of Object.keys(modelProps)) {
            const propertyMapper = modelProps[key];
            if (propertyMapper.readOnly) {
                continue;
            }
            let propName;
            let parentObject = payload;
            if (serializer.isXML) {
                if (propertyMapper.xmlIsWrapped) {
                    propName = propertyMapper.xmlName;
                }
                else {
                    propName = propertyMapper.xmlElementName || propertyMapper.xmlName;
                }
            }
            else {
                const paths = splitSerializeName(propertyMapper.serializedName);
                propName = paths.pop();
                for (const pathName of paths) {
                    const childObject = parentObject[pathName];
                    if ((childObject === undefined || childObject === null) &&
                        ((object[key] !== undefined && object[key] !== null) ||
                            propertyMapper.defaultValue !== undefined)) {
                        parentObject[pathName] = {};
                    }
                    parentObject = parentObject[pathName];
                }
            }
            if (parentObject !== undefined && parentObject !== null) {
                if (isXml && mapper.xmlNamespace) {
                    const xmlnsKey = mapper.xmlNamespacePrefix
                        ? `xmlns:${mapper.xmlNamespacePrefix}`
                        : "xmlns";
                    parentObject[XML_ATTRKEY] = Object.assign(Object.assign({}, parentObject[XML_ATTRKEY]), { [xmlnsKey]: mapper.xmlNamespace });
                }
                const propertyObjectName = propertyMapper.serializedName !== ""
                    ? objectName + "." + propertyMapper.serializedName
                    : objectName;
                let toSerialize = object[key];
                const polymorphicDiscriminator = getPolymorphicDiscriminatorRecursively(serializer, mapper);
                if (polymorphicDiscriminator &&
                    polymorphicDiscriminator.clientName === key &&
                    (toSerialize === undefined || toSerialize === null)) {
                    toSerialize = mapper.serializedName;
                }
                const serializedValue = serializer.serialize(propertyMapper, toSerialize, propertyObjectName, options);
                if (serializedValue !== undefined && propName !== undefined && propName !== null) {
                    const value = getXmlObjectValue(propertyMapper, serializedValue, isXml, options);
                    if (isXml && propertyMapper.xmlIsAttribute) {
                        // XML_ATTRKEY, i.e., $ is the key attributes are kept under in xml2js.
                        // This keeps things simple while preventing name collision
                        // with names in user documents.
                        parentObject[XML_ATTRKEY] = parentObject[XML_ATTRKEY] || {};
                        parentObject[XML_ATTRKEY][propName] = serializedValue;
                    }
                    else if (isXml && propertyMapper.xmlIsWrapped) {
                        parentObject[propName] = { [propertyMapper.xmlElementName]: value };
                    }
                    else {
                        parentObject[propName] = value;
                    }
                }
            }
        }
        const additionalPropertiesMapper = resolveAdditionalProperties(serializer, mapper, objectName);
        if (additionalPropertiesMapper) {
            const propNames = Object.keys(modelProps);
            for (const clientPropName in object) {
                const isAdditionalProperty = propNames.every((pn) => pn !== clientPropName);
                if (isAdditionalProperty) {
                    payload[clientPropName] = serializer.serialize(additionalPropertiesMapper, object[clientPropName], objectName + '["' + clientPropName + '"]', options);
                }
            }
        }
        return payload;
    }
    return object;
}
function getXmlObjectValue(propertyMapper, serializedValue, isXml, options) {
    if (!isXml || !propertyMapper.xmlNamespace) {
        return serializedValue;
    }
    const xmlnsKey = propertyMapper.xmlNamespacePrefix
        ? `xmlns:${propertyMapper.xmlNamespacePrefix}`
        : "xmlns";
    const xmlNamespace = { [xmlnsKey]: propertyMapper.xmlNamespace };
    if (["Composite"].includes(propertyMapper.type.name)) {
        if (serializedValue[XML_ATTRKEY]) {
            return serializedValue;
        }
        else {
            const result = Object.assign({}, serializedValue);
            result[XML_ATTRKEY] = xmlNamespace;
            return result;
        }
    }
    const result = {};
    result[options.xml.xmlCharKey] = serializedValue;
    result[XML_ATTRKEY] = xmlNamespace;
    return result;
}
function isSpecialXmlProperty(propertyName, options) {
    return [XML_ATTRKEY, options.xml.xmlCharKey].includes(propertyName);
}
function deserializeCompositeType(serializer, mapper, responseBody, objectName, options) {
    var _a, _b;
    const xmlCharKey = (_a = options.xml.xmlCharKey) !== null && _a !== void 0 ? _a : XML_CHARKEY;
    if (getPolymorphicDiscriminatorRecursively(serializer, mapper)) {
        mapper = getPolymorphicMapper(serializer, mapper, responseBody, "serializedName");
    }
    const modelProps = resolveModelProperties(serializer, mapper, objectName);
    let instance = {};
    const handledPropertyNames = [];
    for (const key of Object.keys(modelProps)) {
        const propertyMapper = modelProps[key];
        const paths = splitSerializeName(modelProps[key].serializedName);
        handledPropertyNames.push(paths[0]);
        const { serializedName, xmlName, xmlElementName } = propertyMapper;
        let propertyObjectName = objectName;
        if (serializedName !== "" && serializedName !== undefined) {
            propertyObjectName = objectName + "." + serializedName;
        }
        const headerCollectionPrefix = propertyMapper.headerCollectionPrefix;
        if (headerCollectionPrefix) {
            const dictionary = {};
            for (const headerKey of Object.keys(responseBody)) {
                if (headerKey.startsWith(headerCollectionPrefix)) {
                    dictionary[headerKey.substring(headerCollectionPrefix.length)] = serializer.deserialize(propertyMapper.type.value, responseBody[headerKey], propertyObjectName, options);
                }
                handledPropertyNames.push(headerKey);
            }
            instance[key] = dictionary;
        }
        else if (serializer.isXML) {
            if (propertyMapper.xmlIsAttribute && responseBody[XML_ATTRKEY]) {
                instance[key] = serializer.deserialize(propertyMapper, responseBody[XML_ATTRKEY][xmlName], propertyObjectName, options);
            }
            else if (propertyMapper.xmlIsMsText) {
                if (responseBody[xmlCharKey] !== undefined) {
                    instance[key] = responseBody[xmlCharKey];
                }
                else if (typeof responseBody === "string") {
                    // The special case where xml parser parses "<Name>content</Name>" into JSON of
                    //   `{ name: "content"}` instead of `{ name: { "_": "content" }}`
                    instance[key] = responseBody;
                }
            }
            else {
                const propertyName = xmlElementName || xmlName || serializedName;
                if (propertyMapper.xmlIsWrapped) {
                    /* a list of <xmlElementName> wrapped by <xmlName>
                      For the xml example below
                        <Cors>
                          <CorsRule>...</CorsRule>
                          <CorsRule>...</CorsRule>
                        </Cors>
                      the responseBody has
                        {
                          Cors: {
                            CorsRule: [{...}, {...}]
                          }
                        }
                      xmlName is "Cors" and xmlElementName is"CorsRule".
                    */
                    const wrapped = responseBody[xmlName];
                    const elementList = (_b = wrapped === null || wrapped === void 0 ? void 0 : wrapped[xmlElementName]) !== null && _b !== void 0 ? _b : [];
                    instance[key] = serializer.deserialize(propertyMapper, elementList, propertyObjectName, options);
                    handledPropertyNames.push(xmlName);
                }
                else {
                    const property = responseBody[propertyName];
                    instance[key] = serializer.deserialize(propertyMapper, property, propertyObjectName, options);
                    handledPropertyNames.push(propertyName);
                }
            }
        }
        else {
            // deserialize the property if it is present in the provided responseBody instance
            let propertyInstance;
            let res = responseBody;
            // traversing the object step by step.
            let steps = 0;
            for (const item of paths) {
                if (!res)
                    break;
                steps++;
                res = res[item];
            }
            // only accept null when reaching the last position of object otherwise it would be undefined
            if (res === null && steps < paths.length) {
                res = undefined;
            }
            propertyInstance = res;
            const polymorphicDiscriminator = mapper.type.polymorphicDiscriminator;
            // checking that the model property name (key)(ex: "fishtype") and the
            // clientName of the polymorphicDiscriminator {metadata} (ex: "fishtype")
            // instead of the serializedName of the polymorphicDiscriminator (ex: "fish.type")
            // is a better approach. The generator is not consistent with escaping '\.' in the
            // serializedName of the property (ex: "fish\.type") that is marked as polymorphic discriminator
            // and the serializedName of the metadata polymorphicDiscriminator (ex: "fish.type"). However,
            // the clientName transformation of the polymorphicDiscriminator (ex: "fishtype") and
            // the transformation of model property name (ex: "fishtype") is done consistently.
            // Hence, it is a safer bet to rely on the clientName of the polymorphicDiscriminator.
            if (polymorphicDiscriminator &&
                key === polymorphicDiscriminator.clientName &&
                (propertyInstance === undefined || propertyInstance === null)) {
                propertyInstance = mapper.serializedName;
            }
            let serializedValue;
            // paging
            if (Array.isArray(responseBody[key]) && modelProps[key].serializedName === "") {
                propertyInstance = responseBody[key];
                const arrayInstance = serializer.deserialize(propertyMapper, propertyInstance, propertyObjectName, options);
                // Copy over any properties that have already been added into the instance, where they do
                // not exist on the newly de-serialized array
                for (const [k, v] of Object.entries(instance)) {
                    if (!Object.prototype.hasOwnProperty.call(arrayInstance, k)) {
                        arrayInstance[k] = v;
                    }
                }
                instance = arrayInstance;
            }
            else if (propertyInstance !== undefined || propertyMapper.defaultValue !== undefined) {
                serializedValue = serializer.deserialize(propertyMapper, propertyInstance, propertyObjectName, options);
                instance[key] = serializedValue;
            }
        }
    }
    const additionalPropertiesMapper = mapper.type.additionalProperties;
    if (additionalPropertiesMapper) {
        const isAdditionalProperty = (responsePropName) => {
            for (const clientPropName in modelProps) {
                const paths = splitSerializeName(modelProps[clientPropName].serializedName);
                if (paths[0] === responsePropName) {
                    return false;
                }
            }
            return true;
        };
        for (const responsePropName in responseBody) {
            if (isAdditionalProperty(responsePropName)) {
                instance[responsePropName] = serializer.deserialize(additionalPropertiesMapper, responseBody[responsePropName], objectName + '["' + responsePropName + '"]', options);
            }
        }
    }
    else if (responseBody && !options.ignoreUnknownProperties) {
        for (const key of Object.keys(responseBody)) {
            if (instance[key] === undefined &&
                !handledPropertyNames.includes(key) &&
                !isSpecialXmlProperty(key, options)) {
                instance[key] = responseBody[key];
            }
        }
    }
    return instance;
}
function deserializeDictionaryType(serializer, mapper, responseBody, objectName, options) {
    /* jshint validthis: true */
    const value = mapper.type.value;
    if (!value || typeof value !== "object") {
        throw new Error(`"value" metadata for a Dictionary must be defined in the ` +
            `mapper and it must of type "object" in ${objectName}`);
    }
    if (responseBody) {
        const tempDictionary = {};
        for (const key of Object.keys(responseBody)) {
            tempDictionary[key] = serializer.deserialize(value, responseBody[key], objectName, options);
        }
        return tempDictionary;
    }
    return responseBody;
}
function deserializeSequenceType(serializer, mapper, responseBody, objectName, options) {
    var _a;
    let element = mapper.type.element;
    if (!element || typeof element !== "object") {
        throw new Error(`element" metadata for an Array must be defined in the ` +
            `mapper and it must of type "object" in ${objectName}`);
    }
    if (responseBody) {
        if (!Array.isArray(responseBody)) {
            // xml2js will interpret a single element array as just the element, so force it to be an array
            responseBody = [responseBody];
        }
        // Quirk: Composite mappers referenced by `element` might
        // not have *all* properties declared (like uberParent),
        // so let's try to look up the full definition by name.
        if (element.type.name === "Composite" && element.type.className) {
            element = (_a = serializer.modelMappers[element.type.className]) !== null && _a !== void 0 ? _a : element;
        }
        const tempArray = [];
        for (let i = 0; i < responseBody.length; i++) {
            tempArray[i] = serializer.deserialize(element, responseBody[i], `${objectName}[${i}]`, options);
        }
        return tempArray;
    }
    return responseBody;
}
function getIndexDiscriminator(discriminators, discriminatorValue, typeName) {
    const typeNamesToCheck = [typeName];
    while (typeNamesToCheck.length) {
        const currentName = typeNamesToCheck.shift();
        const indexDiscriminator = discriminatorValue === currentName
            ? discriminatorValue
            : currentName + "." + discriminatorValue;
        if (Object.prototype.hasOwnProperty.call(discriminators, indexDiscriminator)) {
            return discriminators[indexDiscriminator];
        }
        else {
            for (const [name, mapper] of Object.entries(discriminators)) {
                if (name.startsWith(currentName + ".") &&
                    mapper.type.uberParent === currentName &&
                    mapper.type.className) {
                    typeNamesToCheck.push(mapper.type.className);
                }
            }
        }
    }
    return undefined;
}
function getPolymorphicMapper(serializer, mapper, object, polymorphicPropertyName) {
    var _a;
    const polymorphicDiscriminator = getPolymorphicDiscriminatorRecursively(serializer, mapper);
    if (polymorphicDiscriminator) {
        let discriminatorName = polymorphicDiscriminator[polymorphicPropertyName];
        if (discriminatorName) {
            // The serializedName might have \\, which we just want to ignore
            if (polymorphicPropertyName === "serializedName") {
                discriminatorName = discriminatorName.replace(/\\/gi, "");
            }
            const discriminatorValue = object[discriminatorName];
            const typeName = (_a = mapper.type.uberParent) !== null && _a !== void 0 ? _a : mapper.type.className;
            if (typeof discriminatorValue === "string" && typeName) {
                const polymorphicMapper = getIndexDiscriminator(serializer.modelMappers.discriminators, discriminatorValue, typeName);
                if (polymorphicMapper) {
                    mapper = polymorphicMapper;
                }
            }
        }
    }
    return mapper;
}
function getPolymorphicDiscriminatorRecursively(serializer, mapper) {
    return (mapper.type.polymorphicDiscriminator ||
        getPolymorphicDiscriminatorSafely(serializer, mapper.type.uberParent) ||
        getPolymorphicDiscriminatorSafely(serializer, mapper.type.className));
}
function getPolymorphicDiscriminatorSafely(serializer, typeName) {
    return (typeName &&
        serializer.modelMappers[typeName] &&
        serializer.modelMappers[typeName].type.polymorphicDiscriminator);
}
/**
 * Known types of Mappers
 */
export const MapperTypeNames = {
    Base64Url: "Base64Url",
    Boolean: "Boolean",
    ByteArray: "ByteArray",
    Composite: "Composite",
    Date: "Date",
    DateTime: "DateTime",
    DateTimeRfc1123: "DateTimeRfc1123",
    Dictionary: "Dictionary",
    Enum: "Enum",
    Number: "Number",
    Object: "Object",
    Sequence: "Sequence",
    String: "String",
    Stream: "Stream",
    TimeSpan: "TimeSpan",
    UnixTime: "UnixTime",
};
//# sourceMappingURL=serializer.js.map