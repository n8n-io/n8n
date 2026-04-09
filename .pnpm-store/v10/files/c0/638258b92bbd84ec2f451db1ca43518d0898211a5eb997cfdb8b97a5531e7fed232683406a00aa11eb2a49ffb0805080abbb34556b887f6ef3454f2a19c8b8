/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";
var $protobuf = require("protobufjs/minimal");
// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;
// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});
$root.opentelemetry = (function () {
    /**
     * Namespace opentelemetry.
     * @exports opentelemetry
     * @namespace
     */
    var opentelemetry = {};
    opentelemetry.proto = (function () {
        /**
         * Namespace proto.
         * @memberof opentelemetry
         * @namespace
         */
        var proto = {};
        proto.common = (function () {
            /**
             * Namespace common.
             * @memberof opentelemetry.proto
             * @namespace
             */
            var common = {};
            common.v1 = (function () {
                /**
                 * Namespace v1.
                 * @memberof opentelemetry.proto.common
                 * @namespace
                 */
                var v1 = {};
                v1.AnyValue = (function () {
                    /**
                     * Properties of an AnyValue.
                     * @memberof opentelemetry.proto.common.v1
                     * @interface IAnyValue
                     * @property {string|null} [stringValue] AnyValue stringValue
                     * @property {boolean|null} [boolValue] AnyValue boolValue
                     * @property {number|Long|null} [intValue] AnyValue intValue
                     * @property {number|null} [doubleValue] AnyValue doubleValue
                     * @property {opentelemetry.proto.common.v1.IArrayValue|null} [arrayValue] AnyValue arrayValue
                     * @property {opentelemetry.proto.common.v1.IKeyValueList|null} [kvlistValue] AnyValue kvlistValue
                     * @property {Uint8Array|null} [bytesValue] AnyValue bytesValue
                     */
                    /**
                     * Constructs a new AnyValue.
                     * @memberof opentelemetry.proto.common.v1
                     * @classdesc Represents an AnyValue.
                     * @implements IAnyValue
                     * @constructor
                     * @param {opentelemetry.proto.common.v1.IAnyValue=} [properties] Properties to set
                     */
                    function AnyValue(properties) {
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * AnyValue stringValue.
                     * @member {string|null|undefined} stringValue
                     * @memberof opentelemetry.proto.common.v1.AnyValue
                     * @instance
                     */
                    AnyValue.prototype.stringValue = null;
                    /**
                     * AnyValue boolValue.
                     * @member {boolean|null|undefined} boolValue
                     * @memberof opentelemetry.proto.common.v1.AnyValue
                     * @instance
                     */
                    AnyValue.prototype.boolValue = null;
                    /**
                     * AnyValue intValue.
                     * @member {number|Long|null|undefined} intValue
                     * @memberof opentelemetry.proto.common.v1.AnyValue
                     * @instance
                     */
                    AnyValue.prototype.intValue = null;
                    /**
                     * AnyValue doubleValue.
                     * @member {number|null|undefined} doubleValue
                     * @memberof opentelemetry.proto.common.v1.AnyValue
                     * @instance
                     */
                    AnyValue.prototype.doubleValue = null;
                    /**
                     * AnyValue arrayValue.
                     * @member {opentelemetry.proto.common.v1.IArrayValue|null|undefined} arrayValue
                     * @memberof opentelemetry.proto.common.v1.AnyValue
                     * @instance
                     */
                    AnyValue.prototype.arrayValue = null;
                    /**
                     * AnyValue kvlistValue.
                     * @member {opentelemetry.proto.common.v1.IKeyValueList|null|undefined} kvlistValue
                     * @memberof opentelemetry.proto.common.v1.AnyValue
                     * @instance
                     */
                    AnyValue.prototype.kvlistValue = null;
                    /**
                     * AnyValue bytesValue.
                     * @member {Uint8Array|null|undefined} bytesValue
                     * @memberof opentelemetry.proto.common.v1.AnyValue
                     * @instance
                     */
                    AnyValue.prototype.bytesValue = null;
                    // OneOf field names bound to virtual getters and setters
                    var $oneOfFields;
                    /**
                     * AnyValue value.
                     * @member {"stringValue"|"boolValue"|"intValue"|"doubleValue"|"arrayValue"|"kvlistValue"|"bytesValue"|undefined} value
                     * @memberof opentelemetry.proto.common.v1.AnyValue
                     * @instance
                     */
                    Object.defineProperty(AnyValue.prototype, "value", {
                        get: $util.oneOfGetter($oneOfFields = ["stringValue", "boolValue", "intValue", "doubleValue", "arrayValue", "kvlistValue", "bytesValue"]),
                        set: $util.oneOfSetter($oneOfFields)
                    });
                    /**
                     * Creates a new AnyValue instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.common.v1.AnyValue
                     * @static
                     * @param {opentelemetry.proto.common.v1.IAnyValue=} [properties] Properties to set
                     * @returns {opentelemetry.proto.common.v1.AnyValue} AnyValue instance
                     */
                    AnyValue.create = function create(properties) {
                        return new AnyValue(properties);
                    };
                    /**
                     * Encodes the specified AnyValue message. Does not implicitly {@link opentelemetry.proto.common.v1.AnyValue.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.common.v1.AnyValue
                     * @static
                     * @param {opentelemetry.proto.common.v1.IAnyValue} message AnyValue message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    AnyValue.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.stringValue != null && Object.hasOwnProperty.call(message, "stringValue"))
                            writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.stringValue);
                        if (message.boolValue != null && Object.hasOwnProperty.call(message, "boolValue"))
                            writer.uint32(/* id 2, wireType 0 =*/ 16).bool(message.boolValue);
                        if (message.intValue != null && Object.hasOwnProperty.call(message, "intValue"))
                            writer.uint32(/* id 3, wireType 0 =*/ 24).int64(message.intValue);
                        if (message.doubleValue != null && Object.hasOwnProperty.call(message, "doubleValue"))
                            writer.uint32(/* id 4, wireType 1 =*/ 33).double(message.doubleValue);
                        if (message.arrayValue != null && Object.hasOwnProperty.call(message, "arrayValue"))
                            $root.opentelemetry.proto.common.v1.ArrayValue.encode(message.arrayValue, writer.uint32(/* id 5, wireType 2 =*/ 42).fork()).ldelim();
                        if (message.kvlistValue != null && Object.hasOwnProperty.call(message, "kvlistValue"))
                            $root.opentelemetry.proto.common.v1.KeyValueList.encode(message.kvlistValue, writer.uint32(/* id 6, wireType 2 =*/ 50).fork()).ldelim();
                        if (message.bytesValue != null && Object.hasOwnProperty.call(message, "bytesValue"))
                            writer.uint32(/* id 7, wireType 2 =*/ 58).bytes(message.bytesValue);
                        return writer;
                    };
                    /**
                     * Encodes the specified AnyValue message, length delimited. Does not implicitly {@link opentelemetry.proto.common.v1.AnyValue.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.common.v1.AnyValue
                     * @static
                     * @param {opentelemetry.proto.common.v1.IAnyValue} message AnyValue message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    AnyValue.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes an AnyValue message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.common.v1.AnyValue
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.common.v1.AnyValue} AnyValue
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    AnyValue.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.common.v1.AnyValue();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    message.stringValue = reader.string();
                                    break;
                                }
                                case 2: {
                                    message.boolValue = reader.bool();
                                    break;
                                }
                                case 3: {
                                    message.intValue = reader.int64();
                                    break;
                                }
                                case 4: {
                                    message.doubleValue = reader.double();
                                    break;
                                }
                                case 5: {
                                    message.arrayValue = $root.opentelemetry.proto.common.v1.ArrayValue.decode(reader, reader.uint32());
                                    break;
                                }
                                case 6: {
                                    message.kvlistValue = $root.opentelemetry.proto.common.v1.KeyValueList.decode(reader, reader.uint32());
                                    break;
                                }
                                case 7: {
                                    message.bytesValue = reader.bytes();
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes an AnyValue message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.common.v1.AnyValue
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.common.v1.AnyValue} AnyValue
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    AnyValue.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies an AnyValue message.
                     * @function verify
                     * @memberof opentelemetry.proto.common.v1.AnyValue
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    AnyValue.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        var properties = {};
                        if (message.stringValue != null && message.hasOwnProperty("stringValue")) {
                            properties.value = 1;
                            if (!$util.isString(message.stringValue))
                                return "stringValue: string expected";
                        }
                        if (message.boolValue != null && message.hasOwnProperty("boolValue")) {
                            if (properties.value === 1)
                                return "value: multiple values";
                            properties.value = 1;
                            if (typeof message.boolValue !== "boolean")
                                return "boolValue: boolean expected";
                        }
                        if (message.intValue != null && message.hasOwnProperty("intValue")) {
                            if (properties.value === 1)
                                return "value: multiple values";
                            properties.value = 1;
                            if (!$util.isInteger(message.intValue) && !(message.intValue && $util.isInteger(message.intValue.low) && $util.isInteger(message.intValue.high)))
                                return "intValue: integer|Long expected";
                        }
                        if (message.doubleValue != null && message.hasOwnProperty("doubleValue")) {
                            if (properties.value === 1)
                                return "value: multiple values";
                            properties.value = 1;
                            if (typeof message.doubleValue !== "number")
                                return "doubleValue: number expected";
                        }
                        if (message.arrayValue != null && message.hasOwnProperty("arrayValue")) {
                            if (properties.value === 1)
                                return "value: multiple values";
                            properties.value = 1;
                            {
                                var error = $root.opentelemetry.proto.common.v1.ArrayValue.verify(message.arrayValue);
                                if (error)
                                    return "arrayValue." + error;
                            }
                        }
                        if (message.kvlistValue != null && message.hasOwnProperty("kvlistValue")) {
                            if (properties.value === 1)
                                return "value: multiple values";
                            properties.value = 1;
                            {
                                var error = $root.opentelemetry.proto.common.v1.KeyValueList.verify(message.kvlistValue);
                                if (error)
                                    return "kvlistValue." + error;
                            }
                        }
                        if (message.bytesValue != null && message.hasOwnProperty("bytesValue")) {
                            if (properties.value === 1)
                                return "value: multiple values";
                            properties.value = 1;
                            if (!(message.bytesValue && typeof message.bytesValue.length === "number" || $util.isString(message.bytesValue)))
                                return "bytesValue: buffer expected";
                        }
                        return null;
                    };
                    /**
                     * Creates an AnyValue message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.common.v1.AnyValue
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.common.v1.AnyValue} AnyValue
                     */
                    AnyValue.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.common.v1.AnyValue)
                            return object;
                        var message = new $root.opentelemetry.proto.common.v1.AnyValue();
                        if (object.stringValue != null)
                            message.stringValue = String(object.stringValue);
                        if (object.boolValue != null)
                            message.boolValue = Boolean(object.boolValue);
                        if (object.intValue != null)
                            if ($util.Long)
                                (message.intValue = $util.Long.fromValue(object.intValue)).unsigned = false;
                            else if (typeof object.intValue === "string")
                                message.intValue = parseInt(object.intValue, 10);
                            else if (typeof object.intValue === "number")
                                message.intValue = object.intValue;
                            else if (typeof object.intValue === "object")
                                message.intValue = new $util.LongBits(object.intValue.low >>> 0, object.intValue.high >>> 0).toNumber();
                        if (object.doubleValue != null)
                            message.doubleValue = Number(object.doubleValue);
                        if (object.arrayValue != null) {
                            if (typeof object.arrayValue !== "object")
                                throw TypeError(".opentelemetry.proto.common.v1.AnyValue.arrayValue: object expected");
                            message.arrayValue = $root.opentelemetry.proto.common.v1.ArrayValue.fromObject(object.arrayValue);
                        }
                        if (object.kvlistValue != null) {
                            if (typeof object.kvlistValue !== "object")
                                throw TypeError(".opentelemetry.proto.common.v1.AnyValue.kvlistValue: object expected");
                            message.kvlistValue = $root.opentelemetry.proto.common.v1.KeyValueList.fromObject(object.kvlistValue);
                        }
                        if (object.bytesValue != null)
                            if (typeof object.bytesValue === "string")
                                $util.base64.decode(object.bytesValue, message.bytesValue = $util.newBuffer($util.base64.length(object.bytesValue)), 0);
                            else if (object.bytesValue.length >= 0)
                                message.bytesValue = object.bytesValue;
                        return message;
                    };
                    /**
                     * Creates a plain object from an AnyValue message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.common.v1.AnyValue
                     * @static
                     * @param {opentelemetry.proto.common.v1.AnyValue} message AnyValue
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    AnyValue.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (message.stringValue != null && message.hasOwnProperty("stringValue")) {
                            object.stringValue = message.stringValue;
                            if (options.oneofs)
                                object.value = "stringValue";
                        }
                        if (message.boolValue != null && message.hasOwnProperty("boolValue")) {
                            object.boolValue = message.boolValue;
                            if (options.oneofs)
                                object.value = "boolValue";
                        }
                        if (message.intValue != null && message.hasOwnProperty("intValue")) {
                            if (typeof message.intValue === "number")
                                object.intValue = options.longs === String ? String(message.intValue) : message.intValue;
                            else
                                object.intValue = options.longs === String ? $util.Long.prototype.toString.call(message.intValue) : options.longs === Number ? new $util.LongBits(message.intValue.low >>> 0, message.intValue.high >>> 0).toNumber() : message.intValue;
                            if (options.oneofs)
                                object.value = "intValue";
                        }
                        if (message.doubleValue != null && message.hasOwnProperty("doubleValue")) {
                            object.doubleValue = options.json && !isFinite(message.doubleValue) ? String(message.doubleValue) : message.doubleValue;
                            if (options.oneofs)
                                object.value = "doubleValue";
                        }
                        if (message.arrayValue != null && message.hasOwnProperty("arrayValue")) {
                            object.arrayValue = $root.opentelemetry.proto.common.v1.ArrayValue.toObject(message.arrayValue, options);
                            if (options.oneofs)
                                object.value = "arrayValue";
                        }
                        if (message.kvlistValue != null && message.hasOwnProperty("kvlistValue")) {
                            object.kvlistValue = $root.opentelemetry.proto.common.v1.KeyValueList.toObject(message.kvlistValue, options);
                            if (options.oneofs)
                                object.value = "kvlistValue";
                        }
                        if (message.bytesValue != null && message.hasOwnProperty("bytesValue")) {
                            object.bytesValue = options.bytes === String ? $util.base64.encode(message.bytesValue, 0, message.bytesValue.length) : options.bytes === Array ? Array.prototype.slice.call(message.bytesValue) : message.bytesValue;
                            if (options.oneofs)
                                object.value = "bytesValue";
                        }
                        return object;
                    };
                    /**
                     * Converts this AnyValue to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.common.v1.AnyValue
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    AnyValue.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for AnyValue
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.common.v1.AnyValue
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    AnyValue.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.common.v1.AnyValue";
                    };
                    return AnyValue;
                })();
                v1.ArrayValue = (function () {
                    /**
                     * Properties of an ArrayValue.
                     * @memberof opentelemetry.proto.common.v1
                     * @interface IArrayValue
                     * @property {Array.<opentelemetry.proto.common.v1.IAnyValue>|null} [values] ArrayValue values
                     */
                    /**
                     * Constructs a new ArrayValue.
                     * @memberof opentelemetry.proto.common.v1
                     * @classdesc Represents an ArrayValue.
                     * @implements IArrayValue
                     * @constructor
                     * @param {opentelemetry.proto.common.v1.IArrayValue=} [properties] Properties to set
                     */
                    function ArrayValue(properties) {
                        this.values = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * ArrayValue values.
                     * @member {Array.<opentelemetry.proto.common.v1.IAnyValue>} values
                     * @memberof opentelemetry.proto.common.v1.ArrayValue
                     * @instance
                     */
                    ArrayValue.prototype.values = $util.emptyArray;
                    /**
                     * Creates a new ArrayValue instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.common.v1.ArrayValue
                     * @static
                     * @param {opentelemetry.proto.common.v1.IArrayValue=} [properties] Properties to set
                     * @returns {opentelemetry.proto.common.v1.ArrayValue} ArrayValue instance
                     */
                    ArrayValue.create = function create(properties) {
                        return new ArrayValue(properties);
                    };
                    /**
                     * Encodes the specified ArrayValue message. Does not implicitly {@link opentelemetry.proto.common.v1.ArrayValue.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.common.v1.ArrayValue
                     * @static
                     * @param {opentelemetry.proto.common.v1.IArrayValue} message ArrayValue message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    ArrayValue.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.values != null && message.values.length)
                            for (var i = 0; i < message.values.length; ++i)
                                $root.opentelemetry.proto.common.v1.AnyValue.encode(message.values[i], writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                        return writer;
                    };
                    /**
                     * Encodes the specified ArrayValue message, length delimited. Does not implicitly {@link opentelemetry.proto.common.v1.ArrayValue.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.common.v1.ArrayValue
                     * @static
                     * @param {opentelemetry.proto.common.v1.IArrayValue} message ArrayValue message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    ArrayValue.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes an ArrayValue message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.common.v1.ArrayValue
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.common.v1.ArrayValue} ArrayValue
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    ArrayValue.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.common.v1.ArrayValue();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    if (!(message.values && message.values.length))
                                        message.values = [];
                                    message.values.push($root.opentelemetry.proto.common.v1.AnyValue.decode(reader, reader.uint32()));
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes an ArrayValue message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.common.v1.ArrayValue
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.common.v1.ArrayValue} ArrayValue
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    ArrayValue.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies an ArrayValue message.
                     * @function verify
                     * @memberof opentelemetry.proto.common.v1.ArrayValue
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    ArrayValue.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.values != null && message.hasOwnProperty("values")) {
                            if (!Array.isArray(message.values))
                                return "values: array expected";
                            for (var i = 0; i < message.values.length; ++i) {
                                var error = $root.opentelemetry.proto.common.v1.AnyValue.verify(message.values[i]);
                                if (error)
                                    return "values." + error;
                            }
                        }
                        return null;
                    };
                    /**
                     * Creates an ArrayValue message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.common.v1.ArrayValue
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.common.v1.ArrayValue} ArrayValue
                     */
                    ArrayValue.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.common.v1.ArrayValue)
                            return object;
                        var message = new $root.opentelemetry.proto.common.v1.ArrayValue();
                        if (object.values) {
                            if (!Array.isArray(object.values))
                                throw TypeError(".opentelemetry.proto.common.v1.ArrayValue.values: array expected");
                            message.values = [];
                            for (var i = 0; i < object.values.length; ++i) {
                                if (typeof object.values[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.common.v1.ArrayValue.values: object expected");
                                message.values[i] = $root.opentelemetry.proto.common.v1.AnyValue.fromObject(object.values[i]);
                            }
                        }
                        return message;
                    };
                    /**
                     * Creates a plain object from an ArrayValue message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.common.v1.ArrayValue
                     * @static
                     * @param {opentelemetry.proto.common.v1.ArrayValue} message ArrayValue
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    ArrayValue.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.values = [];
                        if (message.values && message.values.length) {
                            object.values = [];
                            for (var j = 0; j < message.values.length; ++j)
                                object.values[j] = $root.opentelemetry.proto.common.v1.AnyValue.toObject(message.values[j], options);
                        }
                        return object;
                    };
                    /**
                     * Converts this ArrayValue to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.common.v1.ArrayValue
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    ArrayValue.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for ArrayValue
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.common.v1.ArrayValue
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    ArrayValue.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.common.v1.ArrayValue";
                    };
                    return ArrayValue;
                })();
                v1.KeyValueList = (function () {
                    /**
                     * Properties of a KeyValueList.
                     * @memberof opentelemetry.proto.common.v1
                     * @interface IKeyValueList
                     * @property {Array.<opentelemetry.proto.common.v1.IKeyValue>|null} [values] KeyValueList values
                     */
                    /**
                     * Constructs a new KeyValueList.
                     * @memberof opentelemetry.proto.common.v1
                     * @classdesc Represents a KeyValueList.
                     * @implements IKeyValueList
                     * @constructor
                     * @param {opentelemetry.proto.common.v1.IKeyValueList=} [properties] Properties to set
                     */
                    function KeyValueList(properties) {
                        this.values = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * KeyValueList values.
                     * @member {Array.<opentelemetry.proto.common.v1.IKeyValue>} values
                     * @memberof opentelemetry.proto.common.v1.KeyValueList
                     * @instance
                     */
                    KeyValueList.prototype.values = $util.emptyArray;
                    /**
                     * Creates a new KeyValueList instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.common.v1.KeyValueList
                     * @static
                     * @param {opentelemetry.proto.common.v1.IKeyValueList=} [properties] Properties to set
                     * @returns {opentelemetry.proto.common.v1.KeyValueList} KeyValueList instance
                     */
                    KeyValueList.create = function create(properties) {
                        return new KeyValueList(properties);
                    };
                    /**
                     * Encodes the specified KeyValueList message. Does not implicitly {@link opentelemetry.proto.common.v1.KeyValueList.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.common.v1.KeyValueList
                     * @static
                     * @param {opentelemetry.proto.common.v1.IKeyValueList} message KeyValueList message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    KeyValueList.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.values != null && message.values.length)
                            for (var i = 0; i < message.values.length; ++i)
                                $root.opentelemetry.proto.common.v1.KeyValue.encode(message.values[i], writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                        return writer;
                    };
                    /**
                     * Encodes the specified KeyValueList message, length delimited. Does not implicitly {@link opentelemetry.proto.common.v1.KeyValueList.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.common.v1.KeyValueList
                     * @static
                     * @param {opentelemetry.proto.common.v1.IKeyValueList} message KeyValueList message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    KeyValueList.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a KeyValueList message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.common.v1.KeyValueList
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.common.v1.KeyValueList} KeyValueList
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    KeyValueList.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.common.v1.KeyValueList();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    if (!(message.values && message.values.length))
                                        message.values = [];
                                    message.values.push($root.opentelemetry.proto.common.v1.KeyValue.decode(reader, reader.uint32()));
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a KeyValueList message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.common.v1.KeyValueList
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.common.v1.KeyValueList} KeyValueList
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    KeyValueList.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a KeyValueList message.
                     * @function verify
                     * @memberof opentelemetry.proto.common.v1.KeyValueList
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    KeyValueList.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.values != null && message.hasOwnProperty("values")) {
                            if (!Array.isArray(message.values))
                                return "values: array expected";
                            for (var i = 0; i < message.values.length; ++i) {
                                var error = $root.opentelemetry.proto.common.v1.KeyValue.verify(message.values[i]);
                                if (error)
                                    return "values." + error;
                            }
                        }
                        return null;
                    };
                    /**
                     * Creates a KeyValueList message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.common.v1.KeyValueList
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.common.v1.KeyValueList} KeyValueList
                     */
                    KeyValueList.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.common.v1.KeyValueList)
                            return object;
                        var message = new $root.opentelemetry.proto.common.v1.KeyValueList();
                        if (object.values) {
                            if (!Array.isArray(object.values))
                                throw TypeError(".opentelemetry.proto.common.v1.KeyValueList.values: array expected");
                            message.values = [];
                            for (var i = 0; i < object.values.length; ++i) {
                                if (typeof object.values[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.common.v1.KeyValueList.values: object expected");
                                message.values[i] = $root.opentelemetry.proto.common.v1.KeyValue.fromObject(object.values[i]);
                            }
                        }
                        return message;
                    };
                    /**
                     * Creates a plain object from a KeyValueList message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.common.v1.KeyValueList
                     * @static
                     * @param {opentelemetry.proto.common.v1.KeyValueList} message KeyValueList
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    KeyValueList.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.values = [];
                        if (message.values && message.values.length) {
                            object.values = [];
                            for (var j = 0; j < message.values.length; ++j)
                                object.values[j] = $root.opentelemetry.proto.common.v1.KeyValue.toObject(message.values[j], options);
                        }
                        return object;
                    };
                    /**
                     * Converts this KeyValueList to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.common.v1.KeyValueList
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    KeyValueList.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for KeyValueList
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.common.v1.KeyValueList
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    KeyValueList.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.common.v1.KeyValueList";
                    };
                    return KeyValueList;
                })();
                v1.KeyValue = (function () {
                    /**
                     * Properties of a KeyValue.
                     * @memberof opentelemetry.proto.common.v1
                     * @interface IKeyValue
                     * @property {string|null} [key] KeyValue key
                     * @property {opentelemetry.proto.common.v1.IAnyValue|null} [value] KeyValue value
                     */
                    /**
                     * Constructs a new KeyValue.
                     * @memberof opentelemetry.proto.common.v1
                     * @classdesc Represents a KeyValue.
                     * @implements IKeyValue
                     * @constructor
                     * @param {opentelemetry.proto.common.v1.IKeyValue=} [properties] Properties to set
                     */
                    function KeyValue(properties) {
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * KeyValue key.
                     * @member {string|null|undefined} key
                     * @memberof opentelemetry.proto.common.v1.KeyValue
                     * @instance
                     */
                    KeyValue.prototype.key = null;
                    /**
                     * KeyValue value.
                     * @member {opentelemetry.proto.common.v1.IAnyValue|null|undefined} value
                     * @memberof opentelemetry.proto.common.v1.KeyValue
                     * @instance
                     */
                    KeyValue.prototype.value = null;
                    /**
                     * Creates a new KeyValue instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.common.v1.KeyValue
                     * @static
                     * @param {opentelemetry.proto.common.v1.IKeyValue=} [properties] Properties to set
                     * @returns {opentelemetry.proto.common.v1.KeyValue} KeyValue instance
                     */
                    KeyValue.create = function create(properties) {
                        return new KeyValue(properties);
                    };
                    /**
                     * Encodes the specified KeyValue message. Does not implicitly {@link opentelemetry.proto.common.v1.KeyValue.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.common.v1.KeyValue
                     * @static
                     * @param {opentelemetry.proto.common.v1.IKeyValue} message KeyValue message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    KeyValue.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.key != null && Object.hasOwnProperty.call(message, "key"))
                            writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.key);
                        if (message.value != null && Object.hasOwnProperty.call(message, "value"))
                            $root.opentelemetry.proto.common.v1.AnyValue.encode(message.value, writer.uint32(/* id 2, wireType 2 =*/ 18).fork()).ldelim();
                        return writer;
                    };
                    /**
                     * Encodes the specified KeyValue message, length delimited. Does not implicitly {@link opentelemetry.proto.common.v1.KeyValue.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.common.v1.KeyValue
                     * @static
                     * @param {opentelemetry.proto.common.v1.IKeyValue} message KeyValue message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    KeyValue.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a KeyValue message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.common.v1.KeyValue
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.common.v1.KeyValue} KeyValue
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    KeyValue.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.common.v1.KeyValue();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    message.key = reader.string();
                                    break;
                                }
                                case 2: {
                                    message.value = $root.opentelemetry.proto.common.v1.AnyValue.decode(reader, reader.uint32());
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a KeyValue message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.common.v1.KeyValue
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.common.v1.KeyValue} KeyValue
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    KeyValue.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a KeyValue message.
                     * @function verify
                     * @memberof opentelemetry.proto.common.v1.KeyValue
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    KeyValue.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.key != null && message.hasOwnProperty("key"))
                            if (!$util.isString(message.key))
                                return "key: string expected";
                        if (message.value != null && message.hasOwnProperty("value")) {
                            var error = $root.opentelemetry.proto.common.v1.AnyValue.verify(message.value);
                            if (error)
                                return "value." + error;
                        }
                        return null;
                    };
                    /**
                     * Creates a KeyValue message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.common.v1.KeyValue
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.common.v1.KeyValue} KeyValue
                     */
                    KeyValue.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.common.v1.KeyValue)
                            return object;
                        var message = new $root.opentelemetry.proto.common.v1.KeyValue();
                        if (object.key != null)
                            message.key = String(object.key);
                        if (object.value != null) {
                            if (typeof object.value !== "object")
                                throw TypeError(".opentelemetry.proto.common.v1.KeyValue.value: object expected");
                            message.value = $root.opentelemetry.proto.common.v1.AnyValue.fromObject(object.value);
                        }
                        return message;
                    };
                    /**
                     * Creates a plain object from a KeyValue message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.common.v1.KeyValue
                     * @static
                     * @param {opentelemetry.proto.common.v1.KeyValue} message KeyValue
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    KeyValue.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.defaults) {
                            object.key = "";
                            object.value = null;
                        }
                        if (message.key != null && message.hasOwnProperty("key"))
                            object.key = message.key;
                        if (message.value != null && message.hasOwnProperty("value"))
                            object.value = $root.opentelemetry.proto.common.v1.AnyValue.toObject(message.value, options);
                        return object;
                    };
                    /**
                     * Converts this KeyValue to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.common.v1.KeyValue
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    KeyValue.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for KeyValue
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.common.v1.KeyValue
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    KeyValue.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.common.v1.KeyValue";
                    };
                    return KeyValue;
                })();
                v1.InstrumentationScope = (function () {
                    /**
                     * Properties of an InstrumentationScope.
                     * @memberof opentelemetry.proto.common.v1
                     * @interface IInstrumentationScope
                     * @property {string|null} [name] InstrumentationScope name
                     * @property {string|null} [version] InstrumentationScope version
                     * @property {Array.<opentelemetry.proto.common.v1.IKeyValue>|null} [attributes] InstrumentationScope attributes
                     * @property {number|null} [droppedAttributesCount] InstrumentationScope droppedAttributesCount
                     */
                    /**
                     * Constructs a new InstrumentationScope.
                     * @memberof opentelemetry.proto.common.v1
                     * @classdesc Represents an InstrumentationScope.
                     * @implements IInstrumentationScope
                     * @constructor
                     * @param {opentelemetry.proto.common.v1.IInstrumentationScope=} [properties] Properties to set
                     */
                    function InstrumentationScope(properties) {
                        this.attributes = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * InstrumentationScope name.
                     * @member {string|null|undefined} name
                     * @memberof opentelemetry.proto.common.v1.InstrumentationScope
                     * @instance
                     */
                    InstrumentationScope.prototype.name = null;
                    /**
                     * InstrumentationScope version.
                     * @member {string|null|undefined} version
                     * @memberof opentelemetry.proto.common.v1.InstrumentationScope
                     * @instance
                     */
                    InstrumentationScope.prototype.version = null;
                    /**
                     * InstrumentationScope attributes.
                     * @member {Array.<opentelemetry.proto.common.v1.IKeyValue>} attributes
                     * @memberof opentelemetry.proto.common.v1.InstrumentationScope
                     * @instance
                     */
                    InstrumentationScope.prototype.attributes = $util.emptyArray;
                    /**
                     * InstrumentationScope droppedAttributesCount.
                     * @member {number|null|undefined} droppedAttributesCount
                     * @memberof opentelemetry.proto.common.v1.InstrumentationScope
                     * @instance
                     */
                    InstrumentationScope.prototype.droppedAttributesCount = null;
                    /**
                     * Creates a new InstrumentationScope instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.common.v1.InstrumentationScope
                     * @static
                     * @param {opentelemetry.proto.common.v1.IInstrumentationScope=} [properties] Properties to set
                     * @returns {opentelemetry.proto.common.v1.InstrumentationScope} InstrumentationScope instance
                     */
                    InstrumentationScope.create = function create(properties) {
                        return new InstrumentationScope(properties);
                    };
                    /**
                     * Encodes the specified InstrumentationScope message. Does not implicitly {@link opentelemetry.proto.common.v1.InstrumentationScope.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.common.v1.InstrumentationScope
                     * @static
                     * @param {opentelemetry.proto.common.v1.IInstrumentationScope} message InstrumentationScope message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    InstrumentationScope.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                            writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.name);
                        if (message.version != null && Object.hasOwnProperty.call(message, "version"))
                            writer.uint32(/* id 2, wireType 2 =*/ 18).string(message.version);
                        if (message.attributes != null && message.attributes.length)
                            for (var i = 0; i < message.attributes.length; ++i)
                                $root.opentelemetry.proto.common.v1.KeyValue.encode(message.attributes[i], writer.uint32(/* id 3, wireType 2 =*/ 26).fork()).ldelim();
                        if (message.droppedAttributesCount != null && Object.hasOwnProperty.call(message, "droppedAttributesCount"))
                            writer.uint32(/* id 4, wireType 0 =*/ 32).uint32(message.droppedAttributesCount);
                        return writer;
                    };
                    /**
                     * Encodes the specified InstrumentationScope message, length delimited. Does not implicitly {@link opentelemetry.proto.common.v1.InstrumentationScope.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.common.v1.InstrumentationScope
                     * @static
                     * @param {opentelemetry.proto.common.v1.IInstrumentationScope} message InstrumentationScope message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    InstrumentationScope.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes an InstrumentationScope message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.common.v1.InstrumentationScope
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.common.v1.InstrumentationScope} InstrumentationScope
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    InstrumentationScope.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.common.v1.InstrumentationScope();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    message.name = reader.string();
                                    break;
                                }
                                case 2: {
                                    message.version = reader.string();
                                    break;
                                }
                                case 3: {
                                    if (!(message.attributes && message.attributes.length))
                                        message.attributes = [];
                                    message.attributes.push($root.opentelemetry.proto.common.v1.KeyValue.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 4: {
                                    message.droppedAttributesCount = reader.uint32();
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes an InstrumentationScope message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.common.v1.InstrumentationScope
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.common.v1.InstrumentationScope} InstrumentationScope
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    InstrumentationScope.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies an InstrumentationScope message.
                     * @function verify
                     * @memberof opentelemetry.proto.common.v1.InstrumentationScope
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    InstrumentationScope.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.name != null && message.hasOwnProperty("name"))
                            if (!$util.isString(message.name))
                                return "name: string expected";
                        if (message.version != null && message.hasOwnProperty("version"))
                            if (!$util.isString(message.version))
                                return "version: string expected";
                        if (message.attributes != null && message.hasOwnProperty("attributes")) {
                            if (!Array.isArray(message.attributes))
                                return "attributes: array expected";
                            for (var i = 0; i < message.attributes.length; ++i) {
                                var error = $root.opentelemetry.proto.common.v1.KeyValue.verify(message.attributes[i]);
                                if (error)
                                    return "attributes." + error;
                            }
                        }
                        if (message.droppedAttributesCount != null && message.hasOwnProperty("droppedAttributesCount"))
                            if (!$util.isInteger(message.droppedAttributesCount))
                                return "droppedAttributesCount: integer expected";
                        return null;
                    };
                    /**
                     * Creates an InstrumentationScope message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.common.v1.InstrumentationScope
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.common.v1.InstrumentationScope} InstrumentationScope
                     */
                    InstrumentationScope.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.common.v1.InstrumentationScope)
                            return object;
                        var message = new $root.opentelemetry.proto.common.v1.InstrumentationScope();
                        if (object.name != null)
                            message.name = String(object.name);
                        if (object.version != null)
                            message.version = String(object.version);
                        if (object.attributes) {
                            if (!Array.isArray(object.attributes))
                                throw TypeError(".opentelemetry.proto.common.v1.InstrumentationScope.attributes: array expected");
                            message.attributes = [];
                            for (var i = 0; i < object.attributes.length; ++i) {
                                if (typeof object.attributes[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.common.v1.InstrumentationScope.attributes: object expected");
                                message.attributes[i] = $root.opentelemetry.proto.common.v1.KeyValue.fromObject(object.attributes[i]);
                            }
                        }
                        if (object.droppedAttributesCount != null)
                            message.droppedAttributesCount = object.droppedAttributesCount >>> 0;
                        return message;
                    };
                    /**
                     * Creates a plain object from an InstrumentationScope message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.common.v1.InstrumentationScope
                     * @static
                     * @param {opentelemetry.proto.common.v1.InstrumentationScope} message InstrumentationScope
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    InstrumentationScope.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.attributes = [];
                        if (options.defaults) {
                            object.name = "";
                            object.version = "";
                            object.droppedAttributesCount = 0;
                        }
                        if (message.name != null && message.hasOwnProperty("name"))
                            object.name = message.name;
                        if (message.version != null && message.hasOwnProperty("version"))
                            object.version = message.version;
                        if (message.attributes && message.attributes.length) {
                            object.attributes = [];
                            for (var j = 0; j < message.attributes.length; ++j)
                                object.attributes[j] = $root.opentelemetry.proto.common.v1.KeyValue.toObject(message.attributes[j], options);
                        }
                        if (message.droppedAttributesCount != null && message.hasOwnProperty("droppedAttributesCount"))
                            object.droppedAttributesCount = message.droppedAttributesCount;
                        return object;
                    };
                    /**
                     * Converts this InstrumentationScope to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.common.v1.InstrumentationScope
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    InstrumentationScope.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for InstrumentationScope
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.common.v1.InstrumentationScope
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    InstrumentationScope.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.common.v1.InstrumentationScope";
                    };
                    return InstrumentationScope;
                })();
                return v1;
            })();
            return common;
        })();
        proto.resource = (function () {
            /**
             * Namespace resource.
             * @memberof opentelemetry.proto
             * @namespace
             */
            var resource = {};
            resource.v1 = (function () {
                /**
                 * Namespace v1.
                 * @memberof opentelemetry.proto.resource
                 * @namespace
                 */
                var v1 = {};
                v1.Resource = (function () {
                    /**
                     * Properties of a Resource.
                     * @memberof opentelemetry.proto.resource.v1
                     * @interface IResource
                     * @property {Array.<opentelemetry.proto.common.v1.IKeyValue>|null} [attributes] Resource attributes
                     * @property {number|null} [droppedAttributesCount] Resource droppedAttributesCount
                     */
                    /**
                     * Constructs a new Resource.
                     * @memberof opentelemetry.proto.resource.v1
                     * @classdesc Represents a Resource.
                     * @implements IResource
                     * @constructor
                     * @param {opentelemetry.proto.resource.v1.IResource=} [properties] Properties to set
                     */
                    function Resource(properties) {
                        this.attributes = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * Resource attributes.
                     * @member {Array.<opentelemetry.proto.common.v1.IKeyValue>} attributes
                     * @memberof opentelemetry.proto.resource.v1.Resource
                     * @instance
                     */
                    Resource.prototype.attributes = $util.emptyArray;
                    /**
                     * Resource droppedAttributesCount.
                     * @member {number|null|undefined} droppedAttributesCount
                     * @memberof opentelemetry.proto.resource.v1.Resource
                     * @instance
                     */
                    Resource.prototype.droppedAttributesCount = null;
                    /**
                     * Creates a new Resource instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.resource.v1.Resource
                     * @static
                     * @param {opentelemetry.proto.resource.v1.IResource=} [properties] Properties to set
                     * @returns {opentelemetry.proto.resource.v1.Resource} Resource instance
                     */
                    Resource.create = function create(properties) {
                        return new Resource(properties);
                    };
                    /**
                     * Encodes the specified Resource message. Does not implicitly {@link opentelemetry.proto.resource.v1.Resource.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.resource.v1.Resource
                     * @static
                     * @param {opentelemetry.proto.resource.v1.IResource} message Resource message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Resource.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.attributes != null && message.attributes.length)
                            for (var i = 0; i < message.attributes.length; ++i)
                                $root.opentelemetry.proto.common.v1.KeyValue.encode(message.attributes[i], writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                        if (message.droppedAttributesCount != null && Object.hasOwnProperty.call(message, "droppedAttributesCount"))
                            writer.uint32(/* id 2, wireType 0 =*/ 16).uint32(message.droppedAttributesCount);
                        return writer;
                    };
                    /**
                     * Encodes the specified Resource message, length delimited. Does not implicitly {@link opentelemetry.proto.resource.v1.Resource.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.resource.v1.Resource
                     * @static
                     * @param {opentelemetry.proto.resource.v1.IResource} message Resource message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Resource.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a Resource message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.resource.v1.Resource
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.resource.v1.Resource} Resource
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Resource.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.resource.v1.Resource();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    if (!(message.attributes && message.attributes.length))
                                        message.attributes = [];
                                    message.attributes.push($root.opentelemetry.proto.common.v1.KeyValue.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 2: {
                                    message.droppedAttributesCount = reader.uint32();
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a Resource message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.resource.v1.Resource
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.resource.v1.Resource} Resource
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Resource.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a Resource message.
                     * @function verify
                     * @memberof opentelemetry.proto.resource.v1.Resource
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    Resource.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.attributes != null && message.hasOwnProperty("attributes")) {
                            if (!Array.isArray(message.attributes))
                                return "attributes: array expected";
                            for (var i = 0; i < message.attributes.length; ++i) {
                                var error = $root.opentelemetry.proto.common.v1.KeyValue.verify(message.attributes[i]);
                                if (error)
                                    return "attributes." + error;
                            }
                        }
                        if (message.droppedAttributesCount != null && message.hasOwnProperty("droppedAttributesCount"))
                            if (!$util.isInteger(message.droppedAttributesCount))
                                return "droppedAttributesCount: integer expected";
                        return null;
                    };
                    /**
                     * Creates a Resource message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.resource.v1.Resource
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.resource.v1.Resource} Resource
                     */
                    Resource.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.resource.v1.Resource)
                            return object;
                        var message = new $root.opentelemetry.proto.resource.v1.Resource();
                        if (object.attributes) {
                            if (!Array.isArray(object.attributes))
                                throw TypeError(".opentelemetry.proto.resource.v1.Resource.attributes: array expected");
                            message.attributes = [];
                            for (var i = 0; i < object.attributes.length; ++i) {
                                if (typeof object.attributes[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.resource.v1.Resource.attributes: object expected");
                                message.attributes[i] = $root.opentelemetry.proto.common.v1.KeyValue.fromObject(object.attributes[i]);
                            }
                        }
                        if (object.droppedAttributesCount != null)
                            message.droppedAttributesCount = object.droppedAttributesCount >>> 0;
                        return message;
                    };
                    /**
                     * Creates a plain object from a Resource message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.resource.v1.Resource
                     * @static
                     * @param {opentelemetry.proto.resource.v1.Resource} message Resource
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    Resource.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.attributes = [];
                        if (options.defaults)
                            object.droppedAttributesCount = 0;
                        if (message.attributes && message.attributes.length) {
                            object.attributes = [];
                            for (var j = 0; j < message.attributes.length; ++j)
                                object.attributes[j] = $root.opentelemetry.proto.common.v1.KeyValue.toObject(message.attributes[j], options);
                        }
                        if (message.droppedAttributesCount != null && message.hasOwnProperty("droppedAttributesCount"))
                            object.droppedAttributesCount = message.droppedAttributesCount;
                        return object;
                    };
                    /**
                     * Converts this Resource to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.resource.v1.Resource
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    Resource.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for Resource
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.resource.v1.Resource
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    Resource.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.resource.v1.Resource";
                    };
                    return Resource;
                })();
                return v1;
            })();
            return resource;
        })();
        proto.trace = (function () {
            /**
             * Namespace trace.
             * @memberof opentelemetry.proto
             * @namespace
             */
            var trace = {};
            trace.v1 = (function () {
                /**
                 * Namespace v1.
                 * @memberof opentelemetry.proto.trace
                 * @namespace
                 */
                var v1 = {};
                v1.TracesData = (function () {
                    /**
                     * Properties of a TracesData.
                     * @memberof opentelemetry.proto.trace.v1
                     * @interface ITracesData
                     * @property {Array.<opentelemetry.proto.trace.v1.IResourceSpans>|null} [resourceSpans] TracesData resourceSpans
                     */
                    /**
                     * Constructs a new TracesData.
                     * @memberof opentelemetry.proto.trace.v1
                     * @classdesc Represents a TracesData.
                     * @implements ITracesData
                     * @constructor
                     * @param {opentelemetry.proto.trace.v1.ITracesData=} [properties] Properties to set
                     */
                    function TracesData(properties) {
                        this.resourceSpans = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * TracesData resourceSpans.
                     * @member {Array.<opentelemetry.proto.trace.v1.IResourceSpans>} resourceSpans
                     * @memberof opentelemetry.proto.trace.v1.TracesData
                     * @instance
                     */
                    TracesData.prototype.resourceSpans = $util.emptyArray;
                    /**
                     * Creates a new TracesData instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.trace.v1.TracesData
                     * @static
                     * @param {opentelemetry.proto.trace.v1.ITracesData=} [properties] Properties to set
                     * @returns {opentelemetry.proto.trace.v1.TracesData} TracesData instance
                     */
                    TracesData.create = function create(properties) {
                        return new TracesData(properties);
                    };
                    /**
                     * Encodes the specified TracesData message. Does not implicitly {@link opentelemetry.proto.trace.v1.TracesData.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.trace.v1.TracesData
                     * @static
                     * @param {opentelemetry.proto.trace.v1.ITracesData} message TracesData message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    TracesData.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.resourceSpans != null && message.resourceSpans.length)
                            for (var i = 0; i < message.resourceSpans.length; ++i)
                                $root.opentelemetry.proto.trace.v1.ResourceSpans.encode(message.resourceSpans[i], writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                        return writer;
                    };
                    /**
                     * Encodes the specified TracesData message, length delimited. Does not implicitly {@link opentelemetry.proto.trace.v1.TracesData.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.trace.v1.TracesData
                     * @static
                     * @param {opentelemetry.proto.trace.v1.ITracesData} message TracesData message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    TracesData.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a TracesData message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.trace.v1.TracesData
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.trace.v1.TracesData} TracesData
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    TracesData.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.trace.v1.TracesData();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    if (!(message.resourceSpans && message.resourceSpans.length))
                                        message.resourceSpans = [];
                                    message.resourceSpans.push($root.opentelemetry.proto.trace.v1.ResourceSpans.decode(reader, reader.uint32()));
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a TracesData message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.trace.v1.TracesData
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.trace.v1.TracesData} TracesData
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    TracesData.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a TracesData message.
                     * @function verify
                     * @memberof opentelemetry.proto.trace.v1.TracesData
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    TracesData.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.resourceSpans != null && message.hasOwnProperty("resourceSpans")) {
                            if (!Array.isArray(message.resourceSpans))
                                return "resourceSpans: array expected";
                            for (var i = 0; i < message.resourceSpans.length; ++i) {
                                var error = $root.opentelemetry.proto.trace.v1.ResourceSpans.verify(message.resourceSpans[i]);
                                if (error)
                                    return "resourceSpans." + error;
                            }
                        }
                        return null;
                    };
                    /**
                     * Creates a TracesData message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.trace.v1.TracesData
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.trace.v1.TracesData} TracesData
                     */
                    TracesData.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.trace.v1.TracesData)
                            return object;
                        var message = new $root.opentelemetry.proto.trace.v1.TracesData();
                        if (object.resourceSpans) {
                            if (!Array.isArray(object.resourceSpans))
                                throw TypeError(".opentelemetry.proto.trace.v1.TracesData.resourceSpans: array expected");
                            message.resourceSpans = [];
                            for (var i = 0; i < object.resourceSpans.length; ++i) {
                                if (typeof object.resourceSpans[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.trace.v1.TracesData.resourceSpans: object expected");
                                message.resourceSpans[i] = $root.opentelemetry.proto.trace.v1.ResourceSpans.fromObject(object.resourceSpans[i]);
                            }
                        }
                        return message;
                    };
                    /**
                     * Creates a plain object from a TracesData message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.trace.v1.TracesData
                     * @static
                     * @param {opentelemetry.proto.trace.v1.TracesData} message TracesData
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    TracesData.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.resourceSpans = [];
                        if (message.resourceSpans && message.resourceSpans.length) {
                            object.resourceSpans = [];
                            for (var j = 0; j < message.resourceSpans.length; ++j)
                                object.resourceSpans[j] = $root.opentelemetry.proto.trace.v1.ResourceSpans.toObject(message.resourceSpans[j], options);
                        }
                        return object;
                    };
                    /**
                     * Converts this TracesData to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.trace.v1.TracesData
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    TracesData.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for TracesData
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.trace.v1.TracesData
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    TracesData.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.trace.v1.TracesData";
                    };
                    return TracesData;
                })();
                v1.ResourceSpans = (function () {
                    /**
                     * Properties of a ResourceSpans.
                     * @memberof opentelemetry.proto.trace.v1
                     * @interface IResourceSpans
                     * @property {opentelemetry.proto.resource.v1.IResource|null} [resource] ResourceSpans resource
                     * @property {Array.<opentelemetry.proto.trace.v1.IScopeSpans>|null} [scopeSpans] ResourceSpans scopeSpans
                     * @property {string|null} [schemaUrl] ResourceSpans schemaUrl
                     */
                    /**
                     * Constructs a new ResourceSpans.
                     * @memberof opentelemetry.proto.trace.v1
                     * @classdesc Represents a ResourceSpans.
                     * @implements IResourceSpans
                     * @constructor
                     * @param {opentelemetry.proto.trace.v1.IResourceSpans=} [properties] Properties to set
                     */
                    function ResourceSpans(properties) {
                        this.scopeSpans = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * ResourceSpans resource.
                     * @member {opentelemetry.proto.resource.v1.IResource|null|undefined} resource
                     * @memberof opentelemetry.proto.trace.v1.ResourceSpans
                     * @instance
                     */
                    ResourceSpans.prototype.resource = null;
                    /**
                     * ResourceSpans scopeSpans.
                     * @member {Array.<opentelemetry.proto.trace.v1.IScopeSpans>} scopeSpans
                     * @memberof opentelemetry.proto.trace.v1.ResourceSpans
                     * @instance
                     */
                    ResourceSpans.prototype.scopeSpans = $util.emptyArray;
                    /**
                     * ResourceSpans schemaUrl.
                     * @member {string|null|undefined} schemaUrl
                     * @memberof opentelemetry.proto.trace.v1.ResourceSpans
                     * @instance
                     */
                    ResourceSpans.prototype.schemaUrl = null;
                    /**
                     * Creates a new ResourceSpans instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.trace.v1.ResourceSpans
                     * @static
                     * @param {opentelemetry.proto.trace.v1.IResourceSpans=} [properties] Properties to set
                     * @returns {opentelemetry.proto.trace.v1.ResourceSpans} ResourceSpans instance
                     */
                    ResourceSpans.create = function create(properties) {
                        return new ResourceSpans(properties);
                    };
                    /**
                     * Encodes the specified ResourceSpans message. Does not implicitly {@link opentelemetry.proto.trace.v1.ResourceSpans.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.trace.v1.ResourceSpans
                     * @static
                     * @param {opentelemetry.proto.trace.v1.IResourceSpans} message ResourceSpans message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    ResourceSpans.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.resource != null && Object.hasOwnProperty.call(message, "resource"))
                            $root.opentelemetry.proto.resource.v1.Resource.encode(message.resource, writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                        if (message.scopeSpans != null && message.scopeSpans.length)
                            for (var i = 0; i < message.scopeSpans.length; ++i)
                                $root.opentelemetry.proto.trace.v1.ScopeSpans.encode(message.scopeSpans[i], writer.uint32(/* id 2, wireType 2 =*/ 18).fork()).ldelim();
                        if (message.schemaUrl != null && Object.hasOwnProperty.call(message, "schemaUrl"))
                            writer.uint32(/* id 3, wireType 2 =*/ 26).string(message.schemaUrl);
                        return writer;
                    };
                    /**
                     * Encodes the specified ResourceSpans message, length delimited. Does not implicitly {@link opentelemetry.proto.trace.v1.ResourceSpans.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.trace.v1.ResourceSpans
                     * @static
                     * @param {opentelemetry.proto.trace.v1.IResourceSpans} message ResourceSpans message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    ResourceSpans.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a ResourceSpans message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.trace.v1.ResourceSpans
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.trace.v1.ResourceSpans} ResourceSpans
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    ResourceSpans.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.trace.v1.ResourceSpans();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    message.resource = $root.opentelemetry.proto.resource.v1.Resource.decode(reader, reader.uint32());
                                    break;
                                }
                                case 2: {
                                    if (!(message.scopeSpans && message.scopeSpans.length))
                                        message.scopeSpans = [];
                                    message.scopeSpans.push($root.opentelemetry.proto.trace.v1.ScopeSpans.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 3: {
                                    message.schemaUrl = reader.string();
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a ResourceSpans message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.trace.v1.ResourceSpans
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.trace.v1.ResourceSpans} ResourceSpans
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    ResourceSpans.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a ResourceSpans message.
                     * @function verify
                     * @memberof opentelemetry.proto.trace.v1.ResourceSpans
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    ResourceSpans.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.resource != null && message.hasOwnProperty("resource")) {
                            var error = $root.opentelemetry.proto.resource.v1.Resource.verify(message.resource);
                            if (error)
                                return "resource." + error;
                        }
                        if (message.scopeSpans != null && message.hasOwnProperty("scopeSpans")) {
                            if (!Array.isArray(message.scopeSpans))
                                return "scopeSpans: array expected";
                            for (var i = 0; i < message.scopeSpans.length; ++i) {
                                var error = $root.opentelemetry.proto.trace.v1.ScopeSpans.verify(message.scopeSpans[i]);
                                if (error)
                                    return "scopeSpans." + error;
                            }
                        }
                        if (message.schemaUrl != null && message.hasOwnProperty("schemaUrl"))
                            if (!$util.isString(message.schemaUrl))
                                return "schemaUrl: string expected";
                        return null;
                    };
                    /**
                     * Creates a ResourceSpans message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.trace.v1.ResourceSpans
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.trace.v1.ResourceSpans} ResourceSpans
                     */
                    ResourceSpans.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.trace.v1.ResourceSpans)
                            return object;
                        var message = new $root.opentelemetry.proto.trace.v1.ResourceSpans();
                        if (object.resource != null) {
                            if (typeof object.resource !== "object")
                                throw TypeError(".opentelemetry.proto.trace.v1.ResourceSpans.resource: object expected");
                            message.resource = $root.opentelemetry.proto.resource.v1.Resource.fromObject(object.resource);
                        }
                        if (object.scopeSpans) {
                            if (!Array.isArray(object.scopeSpans))
                                throw TypeError(".opentelemetry.proto.trace.v1.ResourceSpans.scopeSpans: array expected");
                            message.scopeSpans = [];
                            for (var i = 0; i < object.scopeSpans.length; ++i) {
                                if (typeof object.scopeSpans[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.trace.v1.ResourceSpans.scopeSpans: object expected");
                                message.scopeSpans[i] = $root.opentelemetry.proto.trace.v1.ScopeSpans.fromObject(object.scopeSpans[i]);
                            }
                        }
                        if (object.schemaUrl != null)
                            message.schemaUrl = String(object.schemaUrl);
                        return message;
                    };
                    /**
                     * Creates a plain object from a ResourceSpans message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.trace.v1.ResourceSpans
                     * @static
                     * @param {opentelemetry.proto.trace.v1.ResourceSpans} message ResourceSpans
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    ResourceSpans.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.scopeSpans = [];
                        if (options.defaults) {
                            object.resource = null;
                            object.schemaUrl = "";
                        }
                        if (message.resource != null && message.hasOwnProperty("resource"))
                            object.resource = $root.opentelemetry.proto.resource.v1.Resource.toObject(message.resource, options);
                        if (message.scopeSpans && message.scopeSpans.length) {
                            object.scopeSpans = [];
                            for (var j = 0; j < message.scopeSpans.length; ++j)
                                object.scopeSpans[j] = $root.opentelemetry.proto.trace.v1.ScopeSpans.toObject(message.scopeSpans[j], options);
                        }
                        if (message.schemaUrl != null && message.hasOwnProperty("schemaUrl"))
                            object.schemaUrl = message.schemaUrl;
                        return object;
                    };
                    /**
                     * Converts this ResourceSpans to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.trace.v1.ResourceSpans
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    ResourceSpans.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for ResourceSpans
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.trace.v1.ResourceSpans
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    ResourceSpans.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.trace.v1.ResourceSpans";
                    };
                    return ResourceSpans;
                })();
                v1.ScopeSpans = (function () {
                    /**
                     * Properties of a ScopeSpans.
                     * @memberof opentelemetry.proto.trace.v1
                     * @interface IScopeSpans
                     * @property {opentelemetry.proto.common.v1.IInstrumentationScope|null} [scope] ScopeSpans scope
                     * @property {Array.<opentelemetry.proto.trace.v1.ISpan>|null} [spans] ScopeSpans spans
                     * @property {string|null} [schemaUrl] ScopeSpans schemaUrl
                     */
                    /**
                     * Constructs a new ScopeSpans.
                     * @memberof opentelemetry.proto.trace.v1
                     * @classdesc Represents a ScopeSpans.
                     * @implements IScopeSpans
                     * @constructor
                     * @param {opentelemetry.proto.trace.v1.IScopeSpans=} [properties] Properties to set
                     */
                    function ScopeSpans(properties) {
                        this.spans = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * ScopeSpans scope.
                     * @member {opentelemetry.proto.common.v1.IInstrumentationScope|null|undefined} scope
                     * @memberof opentelemetry.proto.trace.v1.ScopeSpans
                     * @instance
                     */
                    ScopeSpans.prototype.scope = null;
                    /**
                     * ScopeSpans spans.
                     * @member {Array.<opentelemetry.proto.trace.v1.ISpan>} spans
                     * @memberof opentelemetry.proto.trace.v1.ScopeSpans
                     * @instance
                     */
                    ScopeSpans.prototype.spans = $util.emptyArray;
                    /**
                     * ScopeSpans schemaUrl.
                     * @member {string|null|undefined} schemaUrl
                     * @memberof opentelemetry.proto.trace.v1.ScopeSpans
                     * @instance
                     */
                    ScopeSpans.prototype.schemaUrl = null;
                    /**
                     * Creates a new ScopeSpans instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.trace.v1.ScopeSpans
                     * @static
                     * @param {opentelemetry.proto.trace.v1.IScopeSpans=} [properties] Properties to set
                     * @returns {opentelemetry.proto.trace.v1.ScopeSpans} ScopeSpans instance
                     */
                    ScopeSpans.create = function create(properties) {
                        return new ScopeSpans(properties);
                    };
                    /**
                     * Encodes the specified ScopeSpans message. Does not implicitly {@link opentelemetry.proto.trace.v1.ScopeSpans.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.trace.v1.ScopeSpans
                     * @static
                     * @param {opentelemetry.proto.trace.v1.IScopeSpans} message ScopeSpans message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    ScopeSpans.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.scope != null && Object.hasOwnProperty.call(message, "scope"))
                            $root.opentelemetry.proto.common.v1.InstrumentationScope.encode(message.scope, writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                        if (message.spans != null && message.spans.length)
                            for (var i = 0; i < message.spans.length; ++i)
                                $root.opentelemetry.proto.trace.v1.Span.encode(message.spans[i], writer.uint32(/* id 2, wireType 2 =*/ 18).fork()).ldelim();
                        if (message.schemaUrl != null && Object.hasOwnProperty.call(message, "schemaUrl"))
                            writer.uint32(/* id 3, wireType 2 =*/ 26).string(message.schemaUrl);
                        return writer;
                    };
                    /**
                     * Encodes the specified ScopeSpans message, length delimited. Does not implicitly {@link opentelemetry.proto.trace.v1.ScopeSpans.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.trace.v1.ScopeSpans
                     * @static
                     * @param {opentelemetry.proto.trace.v1.IScopeSpans} message ScopeSpans message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    ScopeSpans.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a ScopeSpans message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.trace.v1.ScopeSpans
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.trace.v1.ScopeSpans} ScopeSpans
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    ScopeSpans.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.trace.v1.ScopeSpans();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    message.scope = $root.opentelemetry.proto.common.v1.InstrumentationScope.decode(reader, reader.uint32());
                                    break;
                                }
                                case 2: {
                                    if (!(message.spans && message.spans.length))
                                        message.spans = [];
                                    message.spans.push($root.opentelemetry.proto.trace.v1.Span.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 3: {
                                    message.schemaUrl = reader.string();
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a ScopeSpans message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.trace.v1.ScopeSpans
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.trace.v1.ScopeSpans} ScopeSpans
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    ScopeSpans.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a ScopeSpans message.
                     * @function verify
                     * @memberof opentelemetry.proto.trace.v1.ScopeSpans
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    ScopeSpans.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.scope != null && message.hasOwnProperty("scope")) {
                            var error = $root.opentelemetry.proto.common.v1.InstrumentationScope.verify(message.scope);
                            if (error)
                                return "scope." + error;
                        }
                        if (message.spans != null && message.hasOwnProperty("spans")) {
                            if (!Array.isArray(message.spans))
                                return "spans: array expected";
                            for (var i = 0; i < message.spans.length; ++i) {
                                var error = $root.opentelemetry.proto.trace.v1.Span.verify(message.spans[i]);
                                if (error)
                                    return "spans." + error;
                            }
                        }
                        if (message.schemaUrl != null && message.hasOwnProperty("schemaUrl"))
                            if (!$util.isString(message.schemaUrl))
                                return "schemaUrl: string expected";
                        return null;
                    };
                    /**
                     * Creates a ScopeSpans message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.trace.v1.ScopeSpans
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.trace.v1.ScopeSpans} ScopeSpans
                     */
                    ScopeSpans.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.trace.v1.ScopeSpans)
                            return object;
                        var message = new $root.opentelemetry.proto.trace.v1.ScopeSpans();
                        if (object.scope != null) {
                            if (typeof object.scope !== "object")
                                throw TypeError(".opentelemetry.proto.trace.v1.ScopeSpans.scope: object expected");
                            message.scope = $root.opentelemetry.proto.common.v1.InstrumentationScope.fromObject(object.scope);
                        }
                        if (object.spans) {
                            if (!Array.isArray(object.spans))
                                throw TypeError(".opentelemetry.proto.trace.v1.ScopeSpans.spans: array expected");
                            message.spans = [];
                            for (var i = 0; i < object.spans.length; ++i) {
                                if (typeof object.spans[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.trace.v1.ScopeSpans.spans: object expected");
                                message.spans[i] = $root.opentelemetry.proto.trace.v1.Span.fromObject(object.spans[i]);
                            }
                        }
                        if (object.schemaUrl != null)
                            message.schemaUrl = String(object.schemaUrl);
                        return message;
                    };
                    /**
                     * Creates a plain object from a ScopeSpans message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.trace.v1.ScopeSpans
                     * @static
                     * @param {opentelemetry.proto.trace.v1.ScopeSpans} message ScopeSpans
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    ScopeSpans.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.spans = [];
                        if (options.defaults) {
                            object.scope = null;
                            object.schemaUrl = "";
                        }
                        if (message.scope != null && message.hasOwnProperty("scope"))
                            object.scope = $root.opentelemetry.proto.common.v1.InstrumentationScope.toObject(message.scope, options);
                        if (message.spans && message.spans.length) {
                            object.spans = [];
                            for (var j = 0; j < message.spans.length; ++j)
                                object.spans[j] = $root.opentelemetry.proto.trace.v1.Span.toObject(message.spans[j], options);
                        }
                        if (message.schemaUrl != null && message.hasOwnProperty("schemaUrl"))
                            object.schemaUrl = message.schemaUrl;
                        return object;
                    };
                    /**
                     * Converts this ScopeSpans to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.trace.v1.ScopeSpans
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    ScopeSpans.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for ScopeSpans
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.trace.v1.ScopeSpans
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    ScopeSpans.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.trace.v1.ScopeSpans";
                    };
                    return ScopeSpans;
                })();
                v1.Span = (function () {
                    /**
                     * Properties of a Span.
                     * @memberof opentelemetry.proto.trace.v1
                     * @interface ISpan
                     * @property {Uint8Array|null} [traceId] Span traceId
                     * @property {Uint8Array|null} [spanId] Span spanId
                     * @property {string|null} [traceState] Span traceState
                     * @property {Uint8Array|null} [parentSpanId] Span parentSpanId
                     * @property {string|null} [name] Span name
                     * @property {opentelemetry.proto.trace.v1.Span.SpanKind|null} [kind] Span kind
                     * @property {number|Long|null} [startTimeUnixNano] Span startTimeUnixNano
                     * @property {number|Long|null} [endTimeUnixNano] Span endTimeUnixNano
                     * @property {Array.<opentelemetry.proto.common.v1.IKeyValue>|null} [attributes] Span attributes
                     * @property {number|null} [droppedAttributesCount] Span droppedAttributesCount
                     * @property {Array.<opentelemetry.proto.trace.v1.Span.IEvent>|null} [events] Span events
                     * @property {number|null} [droppedEventsCount] Span droppedEventsCount
                     * @property {Array.<opentelemetry.proto.trace.v1.Span.ILink>|null} [links] Span links
                     * @property {number|null} [droppedLinksCount] Span droppedLinksCount
                     * @property {opentelemetry.proto.trace.v1.IStatus|null} [status] Span status
                     */
                    /**
                     * Constructs a new Span.
                     * @memberof opentelemetry.proto.trace.v1
                     * @classdesc Represents a Span.
                     * @implements ISpan
                     * @constructor
                     * @param {opentelemetry.proto.trace.v1.ISpan=} [properties] Properties to set
                     */
                    function Span(properties) {
                        this.attributes = [];
                        this.events = [];
                        this.links = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * Span traceId.
                     * @member {Uint8Array|null|undefined} traceId
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @instance
                     */
                    Span.prototype.traceId = null;
                    /**
                     * Span spanId.
                     * @member {Uint8Array|null|undefined} spanId
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @instance
                     */
                    Span.prototype.spanId = null;
                    /**
                     * Span traceState.
                     * @member {string|null|undefined} traceState
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @instance
                     */
                    Span.prototype.traceState = null;
                    /**
                     * Span parentSpanId.
                     * @member {Uint8Array|null|undefined} parentSpanId
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @instance
                     */
                    Span.prototype.parentSpanId = null;
                    /**
                     * Span name.
                     * @member {string|null|undefined} name
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @instance
                     */
                    Span.prototype.name = null;
                    /**
                     * Span kind.
                     * @member {opentelemetry.proto.trace.v1.Span.SpanKind|null|undefined} kind
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @instance
                     */
                    Span.prototype.kind = null;
                    /**
                     * Span startTimeUnixNano.
                     * @member {number|Long|null|undefined} startTimeUnixNano
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @instance
                     */
                    Span.prototype.startTimeUnixNano = null;
                    /**
                     * Span endTimeUnixNano.
                     * @member {number|Long|null|undefined} endTimeUnixNano
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @instance
                     */
                    Span.prototype.endTimeUnixNano = null;
                    /**
                     * Span attributes.
                     * @member {Array.<opentelemetry.proto.common.v1.IKeyValue>} attributes
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @instance
                     */
                    Span.prototype.attributes = $util.emptyArray;
                    /**
                     * Span droppedAttributesCount.
                     * @member {number|null|undefined} droppedAttributesCount
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @instance
                     */
                    Span.prototype.droppedAttributesCount = null;
                    /**
                     * Span events.
                     * @member {Array.<opentelemetry.proto.trace.v1.Span.IEvent>} events
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @instance
                     */
                    Span.prototype.events = $util.emptyArray;
                    /**
                     * Span droppedEventsCount.
                     * @member {number|null|undefined} droppedEventsCount
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @instance
                     */
                    Span.prototype.droppedEventsCount = null;
                    /**
                     * Span links.
                     * @member {Array.<opentelemetry.proto.trace.v1.Span.ILink>} links
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @instance
                     */
                    Span.prototype.links = $util.emptyArray;
                    /**
                     * Span droppedLinksCount.
                     * @member {number|null|undefined} droppedLinksCount
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @instance
                     */
                    Span.prototype.droppedLinksCount = null;
                    /**
                     * Span status.
                     * @member {opentelemetry.proto.trace.v1.IStatus|null|undefined} status
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @instance
                     */
                    Span.prototype.status = null;
                    /**
                     * Creates a new Span instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @static
                     * @param {opentelemetry.proto.trace.v1.ISpan=} [properties] Properties to set
                     * @returns {opentelemetry.proto.trace.v1.Span} Span instance
                     */
                    Span.create = function create(properties) {
                        return new Span(properties);
                    };
                    /**
                     * Encodes the specified Span message. Does not implicitly {@link opentelemetry.proto.trace.v1.Span.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @static
                     * @param {opentelemetry.proto.trace.v1.ISpan} message Span message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Span.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.traceId != null && Object.hasOwnProperty.call(message, "traceId"))
                            writer.uint32(/* id 1, wireType 2 =*/ 10).bytes(message.traceId);
                        if (message.spanId != null && Object.hasOwnProperty.call(message, "spanId"))
                            writer.uint32(/* id 2, wireType 2 =*/ 18).bytes(message.spanId);
                        if (message.traceState != null && Object.hasOwnProperty.call(message, "traceState"))
                            writer.uint32(/* id 3, wireType 2 =*/ 26).string(message.traceState);
                        if (message.parentSpanId != null && Object.hasOwnProperty.call(message, "parentSpanId"))
                            writer.uint32(/* id 4, wireType 2 =*/ 34).bytes(message.parentSpanId);
                        if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                            writer.uint32(/* id 5, wireType 2 =*/ 42).string(message.name);
                        if (message.kind != null && Object.hasOwnProperty.call(message, "kind"))
                            writer.uint32(/* id 6, wireType 0 =*/ 48).int32(message.kind);
                        if (message.startTimeUnixNano != null && Object.hasOwnProperty.call(message, "startTimeUnixNano"))
                            writer.uint32(/* id 7, wireType 1 =*/ 57).fixed64(message.startTimeUnixNano);
                        if (message.endTimeUnixNano != null && Object.hasOwnProperty.call(message, "endTimeUnixNano"))
                            writer.uint32(/* id 8, wireType 1 =*/ 65).fixed64(message.endTimeUnixNano);
                        if (message.attributes != null && message.attributes.length)
                            for (var i = 0; i < message.attributes.length; ++i)
                                $root.opentelemetry.proto.common.v1.KeyValue.encode(message.attributes[i], writer.uint32(/* id 9, wireType 2 =*/ 74).fork()).ldelim();
                        if (message.droppedAttributesCount != null && Object.hasOwnProperty.call(message, "droppedAttributesCount"))
                            writer.uint32(/* id 10, wireType 0 =*/ 80).uint32(message.droppedAttributesCount);
                        if (message.events != null && message.events.length)
                            for (var i = 0; i < message.events.length; ++i)
                                $root.opentelemetry.proto.trace.v1.Span.Event.encode(message.events[i], writer.uint32(/* id 11, wireType 2 =*/ 90).fork()).ldelim();
                        if (message.droppedEventsCount != null && Object.hasOwnProperty.call(message, "droppedEventsCount"))
                            writer.uint32(/* id 12, wireType 0 =*/ 96).uint32(message.droppedEventsCount);
                        if (message.links != null && message.links.length)
                            for (var i = 0; i < message.links.length; ++i)
                                $root.opentelemetry.proto.trace.v1.Span.Link.encode(message.links[i], writer.uint32(/* id 13, wireType 2 =*/ 106).fork()).ldelim();
                        if (message.droppedLinksCount != null && Object.hasOwnProperty.call(message, "droppedLinksCount"))
                            writer.uint32(/* id 14, wireType 0 =*/ 112).uint32(message.droppedLinksCount);
                        if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                            $root.opentelemetry.proto.trace.v1.Status.encode(message.status, writer.uint32(/* id 15, wireType 2 =*/ 122).fork()).ldelim();
                        return writer;
                    };
                    /**
                     * Encodes the specified Span message, length delimited. Does not implicitly {@link opentelemetry.proto.trace.v1.Span.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @static
                     * @param {opentelemetry.proto.trace.v1.ISpan} message Span message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Span.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a Span message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.trace.v1.Span} Span
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Span.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.trace.v1.Span();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    message.traceId = reader.bytes();
                                    break;
                                }
                                case 2: {
                                    message.spanId = reader.bytes();
                                    break;
                                }
                                case 3: {
                                    message.traceState = reader.string();
                                    break;
                                }
                                case 4: {
                                    message.parentSpanId = reader.bytes();
                                    break;
                                }
                                case 5: {
                                    message.name = reader.string();
                                    break;
                                }
                                case 6: {
                                    message.kind = reader.int32();
                                    break;
                                }
                                case 7: {
                                    message.startTimeUnixNano = reader.fixed64();
                                    break;
                                }
                                case 8: {
                                    message.endTimeUnixNano = reader.fixed64();
                                    break;
                                }
                                case 9: {
                                    if (!(message.attributes && message.attributes.length))
                                        message.attributes = [];
                                    message.attributes.push($root.opentelemetry.proto.common.v1.KeyValue.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 10: {
                                    message.droppedAttributesCount = reader.uint32();
                                    break;
                                }
                                case 11: {
                                    if (!(message.events && message.events.length))
                                        message.events = [];
                                    message.events.push($root.opentelemetry.proto.trace.v1.Span.Event.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 12: {
                                    message.droppedEventsCount = reader.uint32();
                                    break;
                                }
                                case 13: {
                                    if (!(message.links && message.links.length))
                                        message.links = [];
                                    message.links.push($root.opentelemetry.proto.trace.v1.Span.Link.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 14: {
                                    message.droppedLinksCount = reader.uint32();
                                    break;
                                }
                                case 15: {
                                    message.status = $root.opentelemetry.proto.trace.v1.Status.decode(reader, reader.uint32());
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a Span message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.trace.v1.Span} Span
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Span.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a Span message.
                     * @function verify
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    Span.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.traceId != null && message.hasOwnProperty("traceId"))
                            if (!(message.traceId && typeof message.traceId.length === "number" || $util.isString(message.traceId)))
                                return "traceId: buffer expected";
                        if (message.spanId != null && message.hasOwnProperty("spanId"))
                            if (!(message.spanId && typeof message.spanId.length === "number" || $util.isString(message.spanId)))
                                return "spanId: buffer expected";
                        if (message.traceState != null && message.hasOwnProperty("traceState"))
                            if (!$util.isString(message.traceState))
                                return "traceState: string expected";
                        if (message.parentSpanId != null && message.hasOwnProperty("parentSpanId"))
                            if (!(message.parentSpanId && typeof message.parentSpanId.length === "number" || $util.isString(message.parentSpanId)))
                                return "parentSpanId: buffer expected";
                        if (message.name != null && message.hasOwnProperty("name"))
                            if (!$util.isString(message.name))
                                return "name: string expected";
                        if (message.kind != null && message.hasOwnProperty("kind"))
                            switch (message.kind) {
                                default:
                                    return "kind: enum value expected";
                                case 0:
                                case 1:
                                case 2:
                                case 3:
                                case 4:
                                case 5:
                                    break;
                            }
                        if (message.startTimeUnixNano != null && message.hasOwnProperty("startTimeUnixNano"))
                            if (!$util.isInteger(message.startTimeUnixNano) && !(message.startTimeUnixNano && $util.isInteger(message.startTimeUnixNano.low) && $util.isInteger(message.startTimeUnixNano.high)))
                                return "startTimeUnixNano: integer|Long expected";
                        if (message.endTimeUnixNano != null && message.hasOwnProperty("endTimeUnixNano"))
                            if (!$util.isInteger(message.endTimeUnixNano) && !(message.endTimeUnixNano && $util.isInteger(message.endTimeUnixNano.low) && $util.isInteger(message.endTimeUnixNano.high)))
                                return "endTimeUnixNano: integer|Long expected";
                        if (message.attributes != null && message.hasOwnProperty("attributes")) {
                            if (!Array.isArray(message.attributes))
                                return "attributes: array expected";
                            for (var i = 0; i < message.attributes.length; ++i) {
                                var error = $root.opentelemetry.proto.common.v1.KeyValue.verify(message.attributes[i]);
                                if (error)
                                    return "attributes." + error;
                            }
                        }
                        if (message.droppedAttributesCount != null && message.hasOwnProperty("droppedAttributesCount"))
                            if (!$util.isInteger(message.droppedAttributesCount))
                                return "droppedAttributesCount: integer expected";
                        if (message.events != null && message.hasOwnProperty("events")) {
                            if (!Array.isArray(message.events))
                                return "events: array expected";
                            for (var i = 0; i < message.events.length; ++i) {
                                var error = $root.opentelemetry.proto.trace.v1.Span.Event.verify(message.events[i]);
                                if (error)
                                    return "events." + error;
                            }
                        }
                        if (message.droppedEventsCount != null && message.hasOwnProperty("droppedEventsCount"))
                            if (!$util.isInteger(message.droppedEventsCount))
                                return "droppedEventsCount: integer expected";
                        if (message.links != null && message.hasOwnProperty("links")) {
                            if (!Array.isArray(message.links))
                                return "links: array expected";
                            for (var i = 0; i < message.links.length; ++i) {
                                var error = $root.opentelemetry.proto.trace.v1.Span.Link.verify(message.links[i]);
                                if (error)
                                    return "links." + error;
                            }
                        }
                        if (message.droppedLinksCount != null && message.hasOwnProperty("droppedLinksCount"))
                            if (!$util.isInteger(message.droppedLinksCount))
                                return "droppedLinksCount: integer expected";
                        if (message.status != null && message.hasOwnProperty("status")) {
                            var error = $root.opentelemetry.proto.trace.v1.Status.verify(message.status);
                            if (error)
                                return "status." + error;
                        }
                        return null;
                    };
                    /**
                     * Creates a Span message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.trace.v1.Span} Span
                     */
                    Span.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.trace.v1.Span)
                            return object;
                        var message = new $root.opentelemetry.proto.trace.v1.Span();
                        if (object.traceId != null)
                            if (typeof object.traceId === "string")
                                $util.base64.decode(object.traceId, message.traceId = $util.newBuffer($util.base64.length(object.traceId)), 0);
                            else if (object.traceId.length >= 0)
                                message.traceId = object.traceId;
                        if (object.spanId != null)
                            if (typeof object.spanId === "string")
                                $util.base64.decode(object.spanId, message.spanId = $util.newBuffer($util.base64.length(object.spanId)), 0);
                            else if (object.spanId.length >= 0)
                                message.spanId = object.spanId;
                        if (object.traceState != null)
                            message.traceState = String(object.traceState);
                        if (object.parentSpanId != null)
                            if (typeof object.parentSpanId === "string")
                                $util.base64.decode(object.parentSpanId, message.parentSpanId = $util.newBuffer($util.base64.length(object.parentSpanId)), 0);
                            else if (object.parentSpanId.length >= 0)
                                message.parentSpanId = object.parentSpanId;
                        if (object.name != null)
                            message.name = String(object.name);
                        switch (object.kind) {
                            default:
                                if (typeof object.kind === "number") {
                                    message.kind = object.kind;
                                    break;
                                }
                                break;
                            case "SPAN_KIND_UNSPECIFIED":
                            case 0:
                                message.kind = 0;
                                break;
                            case "SPAN_KIND_INTERNAL":
                            case 1:
                                message.kind = 1;
                                break;
                            case "SPAN_KIND_SERVER":
                            case 2:
                                message.kind = 2;
                                break;
                            case "SPAN_KIND_CLIENT":
                            case 3:
                                message.kind = 3;
                                break;
                            case "SPAN_KIND_PRODUCER":
                            case 4:
                                message.kind = 4;
                                break;
                            case "SPAN_KIND_CONSUMER":
                            case 5:
                                message.kind = 5;
                                break;
                        }
                        if (object.startTimeUnixNano != null)
                            if ($util.Long)
                                (message.startTimeUnixNano = $util.Long.fromValue(object.startTimeUnixNano)).unsigned = false;
                            else if (typeof object.startTimeUnixNano === "string")
                                message.startTimeUnixNano = parseInt(object.startTimeUnixNano, 10);
                            else if (typeof object.startTimeUnixNano === "number")
                                message.startTimeUnixNano = object.startTimeUnixNano;
                            else if (typeof object.startTimeUnixNano === "object")
                                message.startTimeUnixNano = new $util.LongBits(object.startTimeUnixNano.low >>> 0, object.startTimeUnixNano.high >>> 0).toNumber();
                        if (object.endTimeUnixNano != null)
                            if ($util.Long)
                                (message.endTimeUnixNano = $util.Long.fromValue(object.endTimeUnixNano)).unsigned = false;
                            else if (typeof object.endTimeUnixNano === "string")
                                message.endTimeUnixNano = parseInt(object.endTimeUnixNano, 10);
                            else if (typeof object.endTimeUnixNano === "number")
                                message.endTimeUnixNano = object.endTimeUnixNano;
                            else if (typeof object.endTimeUnixNano === "object")
                                message.endTimeUnixNano = new $util.LongBits(object.endTimeUnixNano.low >>> 0, object.endTimeUnixNano.high >>> 0).toNumber();
                        if (object.attributes) {
                            if (!Array.isArray(object.attributes))
                                throw TypeError(".opentelemetry.proto.trace.v1.Span.attributes: array expected");
                            message.attributes = [];
                            for (var i = 0; i < object.attributes.length; ++i) {
                                if (typeof object.attributes[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.trace.v1.Span.attributes: object expected");
                                message.attributes[i] = $root.opentelemetry.proto.common.v1.KeyValue.fromObject(object.attributes[i]);
                            }
                        }
                        if (object.droppedAttributesCount != null)
                            message.droppedAttributesCount = object.droppedAttributesCount >>> 0;
                        if (object.events) {
                            if (!Array.isArray(object.events))
                                throw TypeError(".opentelemetry.proto.trace.v1.Span.events: array expected");
                            message.events = [];
                            for (var i = 0; i < object.events.length; ++i) {
                                if (typeof object.events[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.trace.v1.Span.events: object expected");
                                message.events[i] = $root.opentelemetry.proto.trace.v1.Span.Event.fromObject(object.events[i]);
                            }
                        }
                        if (object.droppedEventsCount != null)
                            message.droppedEventsCount = object.droppedEventsCount >>> 0;
                        if (object.links) {
                            if (!Array.isArray(object.links))
                                throw TypeError(".opentelemetry.proto.trace.v1.Span.links: array expected");
                            message.links = [];
                            for (var i = 0; i < object.links.length; ++i) {
                                if (typeof object.links[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.trace.v1.Span.links: object expected");
                                message.links[i] = $root.opentelemetry.proto.trace.v1.Span.Link.fromObject(object.links[i]);
                            }
                        }
                        if (object.droppedLinksCount != null)
                            message.droppedLinksCount = object.droppedLinksCount >>> 0;
                        if (object.status != null) {
                            if (typeof object.status !== "object")
                                throw TypeError(".opentelemetry.proto.trace.v1.Span.status: object expected");
                            message.status = $root.opentelemetry.proto.trace.v1.Status.fromObject(object.status);
                        }
                        return message;
                    };
                    /**
                     * Creates a plain object from a Span message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @static
                     * @param {opentelemetry.proto.trace.v1.Span} message Span
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    Span.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults) {
                            object.attributes = [];
                            object.events = [];
                            object.links = [];
                        }
                        if (options.defaults) {
                            if (options.bytes === String)
                                object.traceId = "";
                            else {
                                object.traceId = [];
                                if (options.bytes !== Array)
                                    object.traceId = $util.newBuffer(object.traceId);
                            }
                            if (options.bytes === String)
                                object.spanId = "";
                            else {
                                object.spanId = [];
                                if (options.bytes !== Array)
                                    object.spanId = $util.newBuffer(object.spanId);
                            }
                            object.traceState = "";
                            if (options.bytes === String)
                                object.parentSpanId = "";
                            else {
                                object.parentSpanId = [];
                                if (options.bytes !== Array)
                                    object.parentSpanId = $util.newBuffer(object.parentSpanId);
                            }
                            object.name = "";
                            object.kind = options.enums === String ? "SPAN_KIND_UNSPECIFIED" : 0;
                            if ($util.Long) {
                                var long = new $util.Long(0, 0, false);
                                object.startTimeUnixNano = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                            }
                            else
                                object.startTimeUnixNano = options.longs === String ? "0" : 0;
                            if ($util.Long) {
                                var long = new $util.Long(0, 0, false);
                                object.endTimeUnixNano = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                            }
                            else
                                object.endTimeUnixNano = options.longs === String ? "0" : 0;
                            object.droppedAttributesCount = 0;
                            object.droppedEventsCount = 0;
                            object.droppedLinksCount = 0;
                            object.status = null;
                        }
                        if (message.traceId != null && message.hasOwnProperty("traceId"))
                            object.traceId = options.bytes === String ? $util.base64.encode(message.traceId, 0, message.traceId.length) : options.bytes === Array ? Array.prototype.slice.call(message.traceId) : message.traceId;
                        if (message.spanId != null && message.hasOwnProperty("spanId"))
                            object.spanId = options.bytes === String ? $util.base64.encode(message.spanId, 0, message.spanId.length) : options.bytes === Array ? Array.prototype.slice.call(message.spanId) : message.spanId;
                        if (message.traceState != null && message.hasOwnProperty("traceState"))
                            object.traceState = message.traceState;
                        if (message.parentSpanId != null && message.hasOwnProperty("parentSpanId"))
                            object.parentSpanId = options.bytes === String ? $util.base64.encode(message.parentSpanId, 0, message.parentSpanId.length) : options.bytes === Array ? Array.prototype.slice.call(message.parentSpanId) : message.parentSpanId;
                        if (message.name != null && message.hasOwnProperty("name"))
                            object.name = message.name;
                        if (message.kind != null && message.hasOwnProperty("kind"))
                            object.kind = options.enums === String ? $root.opentelemetry.proto.trace.v1.Span.SpanKind[message.kind] === undefined ? message.kind : $root.opentelemetry.proto.trace.v1.Span.SpanKind[message.kind] : message.kind;
                        if (message.startTimeUnixNano != null && message.hasOwnProperty("startTimeUnixNano"))
                            if (typeof message.startTimeUnixNano === "number")
                                object.startTimeUnixNano = options.longs === String ? String(message.startTimeUnixNano) : message.startTimeUnixNano;
                            else
                                object.startTimeUnixNano = options.longs === String ? $util.Long.prototype.toString.call(message.startTimeUnixNano) : options.longs === Number ? new $util.LongBits(message.startTimeUnixNano.low >>> 0, message.startTimeUnixNano.high >>> 0).toNumber() : message.startTimeUnixNano;
                        if (message.endTimeUnixNano != null && message.hasOwnProperty("endTimeUnixNano"))
                            if (typeof message.endTimeUnixNano === "number")
                                object.endTimeUnixNano = options.longs === String ? String(message.endTimeUnixNano) : message.endTimeUnixNano;
                            else
                                object.endTimeUnixNano = options.longs === String ? $util.Long.prototype.toString.call(message.endTimeUnixNano) : options.longs === Number ? new $util.LongBits(message.endTimeUnixNano.low >>> 0, message.endTimeUnixNano.high >>> 0).toNumber() : message.endTimeUnixNano;
                        if (message.attributes && message.attributes.length) {
                            object.attributes = [];
                            for (var j = 0; j < message.attributes.length; ++j)
                                object.attributes[j] = $root.opentelemetry.proto.common.v1.KeyValue.toObject(message.attributes[j], options);
                        }
                        if (message.droppedAttributesCount != null && message.hasOwnProperty("droppedAttributesCount"))
                            object.droppedAttributesCount = message.droppedAttributesCount;
                        if (message.events && message.events.length) {
                            object.events = [];
                            for (var j = 0; j < message.events.length; ++j)
                                object.events[j] = $root.opentelemetry.proto.trace.v1.Span.Event.toObject(message.events[j], options);
                        }
                        if (message.droppedEventsCount != null && message.hasOwnProperty("droppedEventsCount"))
                            object.droppedEventsCount = message.droppedEventsCount;
                        if (message.links && message.links.length) {
                            object.links = [];
                            for (var j = 0; j < message.links.length; ++j)
                                object.links[j] = $root.opentelemetry.proto.trace.v1.Span.Link.toObject(message.links[j], options);
                        }
                        if (message.droppedLinksCount != null && message.hasOwnProperty("droppedLinksCount"))
                            object.droppedLinksCount = message.droppedLinksCount;
                        if (message.status != null && message.hasOwnProperty("status"))
                            object.status = $root.opentelemetry.proto.trace.v1.Status.toObject(message.status, options);
                        return object;
                    };
                    /**
                     * Converts this Span to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    Span.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for Span
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.trace.v1.Span
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    Span.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.trace.v1.Span";
                    };
                    /**
                     * SpanKind enum.
                     * @name opentelemetry.proto.trace.v1.Span.SpanKind
                     * @enum {number}
                     * @property {number} SPAN_KIND_UNSPECIFIED=0 SPAN_KIND_UNSPECIFIED value
                     * @property {number} SPAN_KIND_INTERNAL=1 SPAN_KIND_INTERNAL value
                     * @property {number} SPAN_KIND_SERVER=2 SPAN_KIND_SERVER value
                     * @property {number} SPAN_KIND_CLIENT=3 SPAN_KIND_CLIENT value
                     * @property {number} SPAN_KIND_PRODUCER=4 SPAN_KIND_PRODUCER value
                     * @property {number} SPAN_KIND_CONSUMER=5 SPAN_KIND_CONSUMER value
                     */
                    Span.SpanKind = (function () {
                        var valuesById = {}, values = Object.create(valuesById);
                        values[valuesById[0] = "SPAN_KIND_UNSPECIFIED"] = 0;
                        values[valuesById[1] = "SPAN_KIND_INTERNAL"] = 1;
                        values[valuesById[2] = "SPAN_KIND_SERVER"] = 2;
                        values[valuesById[3] = "SPAN_KIND_CLIENT"] = 3;
                        values[valuesById[4] = "SPAN_KIND_PRODUCER"] = 4;
                        values[valuesById[5] = "SPAN_KIND_CONSUMER"] = 5;
                        return values;
                    })();
                    Span.Event = (function () {
                        /**
                         * Properties of an Event.
                         * @memberof opentelemetry.proto.trace.v1.Span
                         * @interface IEvent
                         * @property {number|Long|null} [timeUnixNano] Event timeUnixNano
                         * @property {string|null} [name] Event name
                         * @property {Array.<opentelemetry.proto.common.v1.IKeyValue>|null} [attributes] Event attributes
                         * @property {number|null} [droppedAttributesCount] Event droppedAttributesCount
                         */
                        /**
                         * Constructs a new Event.
                         * @memberof opentelemetry.proto.trace.v1.Span
                         * @classdesc Represents an Event.
                         * @implements IEvent
                         * @constructor
                         * @param {opentelemetry.proto.trace.v1.Span.IEvent=} [properties] Properties to set
                         */
                        function Event(properties) {
                            this.attributes = [];
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    if (properties[keys[i]] != null)
                                        this[keys[i]] = properties[keys[i]];
                        }
                        /**
                         * Event timeUnixNano.
                         * @member {number|Long|null|undefined} timeUnixNano
                         * @memberof opentelemetry.proto.trace.v1.Span.Event
                         * @instance
                         */
                        Event.prototype.timeUnixNano = null;
                        /**
                         * Event name.
                         * @member {string|null|undefined} name
                         * @memberof opentelemetry.proto.trace.v1.Span.Event
                         * @instance
                         */
                        Event.prototype.name = null;
                        /**
                         * Event attributes.
                         * @member {Array.<opentelemetry.proto.common.v1.IKeyValue>} attributes
                         * @memberof opentelemetry.proto.trace.v1.Span.Event
                         * @instance
                         */
                        Event.prototype.attributes = $util.emptyArray;
                        /**
                         * Event droppedAttributesCount.
                         * @member {number|null|undefined} droppedAttributesCount
                         * @memberof opentelemetry.proto.trace.v1.Span.Event
                         * @instance
                         */
                        Event.prototype.droppedAttributesCount = null;
                        /**
                         * Creates a new Event instance using the specified properties.
                         * @function create
                         * @memberof opentelemetry.proto.trace.v1.Span.Event
                         * @static
                         * @param {opentelemetry.proto.trace.v1.Span.IEvent=} [properties] Properties to set
                         * @returns {opentelemetry.proto.trace.v1.Span.Event} Event instance
                         */
                        Event.create = function create(properties) {
                            return new Event(properties);
                        };
                        /**
                         * Encodes the specified Event message. Does not implicitly {@link opentelemetry.proto.trace.v1.Span.Event.verify|verify} messages.
                         * @function encode
                         * @memberof opentelemetry.proto.trace.v1.Span.Event
                         * @static
                         * @param {opentelemetry.proto.trace.v1.Span.IEvent} message Event message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        Event.encode = function encode(message, writer) {
                            if (!writer)
                                writer = $Writer.create();
                            if (message.timeUnixNano != null && Object.hasOwnProperty.call(message, "timeUnixNano"))
                                writer.uint32(/* id 1, wireType 1 =*/ 9).fixed64(message.timeUnixNano);
                            if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                                writer.uint32(/* id 2, wireType 2 =*/ 18).string(message.name);
                            if (message.attributes != null && message.attributes.length)
                                for (var i = 0; i < message.attributes.length; ++i)
                                    $root.opentelemetry.proto.common.v1.KeyValue.encode(message.attributes[i], writer.uint32(/* id 3, wireType 2 =*/ 26).fork()).ldelim();
                            if (message.droppedAttributesCount != null && Object.hasOwnProperty.call(message, "droppedAttributesCount"))
                                writer.uint32(/* id 4, wireType 0 =*/ 32).uint32(message.droppedAttributesCount);
                            return writer;
                        };
                        /**
                         * Encodes the specified Event message, length delimited. Does not implicitly {@link opentelemetry.proto.trace.v1.Span.Event.verify|verify} messages.
                         * @function encodeDelimited
                         * @memberof opentelemetry.proto.trace.v1.Span.Event
                         * @static
                         * @param {opentelemetry.proto.trace.v1.Span.IEvent} message Event message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        Event.encodeDelimited = function encodeDelimited(message, writer) {
                            return this.encode(message, writer).ldelim();
                        };
                        /**
                         * Decodes an Event message from the specified reader or buffer.
                         * @function decode
                         * @memberof opentelemetry.proto.trace.v1.Span.Event
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @param {number} [length] Message length if known beforehand
                         * @returns {opentelemetry.proto.trace.v1.Span.Event} Event
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        Event.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.trace.v1.Span.Event();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                    case 1: {
                                        message.timeUnixNano = reader.fixed64();
                                        break;
                                    }
                                    case 2: {
                                        message.name = reader.string();
                                        break;
                                    }
                                    case 3: {
                                        if (!(message.attributes && message.attributes.length))
                                            message.attributes = [];
                                        message.attributes.push($root.opentelemetry.proto.common.v1.KeyValue.decode(reader, reader.uint32()));
                                        break;
                                    }
                                    case 4: {
                                        message.droppedAttributesCount = reader.uint32();
                                        break;
                                    }
                                    default:
                                        reader.skipType(tag & 7);
                                        break;
                                }
                            }
                            return message;
                        };
                        /**
                         * Decodes an Event message from the specified reader or buffer, length delimited.
                         * @function decodeDelimited
                         * @memberof opentelemetry.proto.trace.v1.Span.Event
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @returns {opentelemetry.proto.trace.v1.Span.Event} Event
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        Event.decodeDelimited = function decodeDelimited(reader) {
                            if (!(reader instanceof $Reader))
                                reader = new $Reader(reader);
                            return this.decode(reader, reader.uint32());
                        };
                        /**
                         * Verifies an Event message.
                         * @function verify
                         * @memberof opentelemetry.proto.trace.v1.Span.Event
                         * @static
                         * @param {Object.<string,*>} message Plain object to verify
                         * @returns {string|null} `null` if valid, otherwise the reason why it is not
                         */
                        Event.verify = function verify(message) {
                            if (typeof message !== "object" || message === null)
                                return "object expected";
                            if (message.timeUnixNano != null && message.hasOwnProperty("timeUnixNano"))
                                if (!$util.isInteger(message.timeUnixNano) && !(message.timeUnixNano && $util.isInteger(message.timeUnixNano.low) && $util.isInteger(message.timeUnixNano.high)))
                                    return "timeUnixNano: integer|Long expected";
                            if (message.name != null && message.hasOwnProperty("name"))
                                if (!$util.isString(message.name))
                                    return "name: string expected";
                            if (message.attributes != null && message.hasOwnProperty("attributes")) {
                                if (!Array.isArray(message.attributes))
                                    return "attributes: array expected";
                                for (var i = 0; i < message.attributes.length; ++i) {
                                    var error = $root.opentelemetry.proto.common.v1.KeyValue.verify(message.attributes[i]);
                                    if (error)
                                        return "attributes." + error;
                                }
                            }
                            if (message.droppedAttributesCount != null && message.hasOwnProperty("droppedAttributesCount"))
                                if (!$util.isInteger(message.droppedAttributesCount))
                                    return "droppedAttributesCount: integer expected";
                            return null;
                        };
                        /**
                         * Creates an Event message from a plain object. Also converts values to their respective internal types.
                         * @function fromObject
                         * @memberof opentelemetry.proto.trace.v1.Span.Event
                         * @static
                         * @param {Object.<string,*>} object Plain object
                         * @returns {opentelemetry.proto.trace.v1.Span.Event} Event
                         */
                        Event.fromObject = function fromObject(object) {
                            if (object instanceof $root.opentelemetry.proto.trace.v1.Span.Event)
                                return object;
                            var message = new $root.opentelemetry.proto.trace.v1.Span.Event();
                            if (object.timeUnixNano != null)
                                if ($util.Long)
                                    (message.timeUnixNano = $util.Long.fromValue(object.timeUnixNano)).unsigned = false;
                                else if (typeof object.timeUnixNano === "string")
                                    message.timeUnixNano = parseInt(object.timeUnixNano, 10);
                                else if (typeof object.timeUnixNano === "number")
                                    message.timeUnixNano = object.timeUnixNano;
                                else if (typeof object.timeUnixNano === "object")
                                    message.timeUnixNano = new $util.LongBits(object.timeUnixNano.low >>> 0, object.timeUnixNano.high >>> 0).toNumber();
                            if (object.name != null)
                                message.name = String(object.name);
                            if (object.attributes) {
                                if (!Array.isArray(object.attributes))
                                    throw TypeError(".opentelemetry.proto.trace.v1.Span.Event.attributes: array expected");
                                message.attributes = [];
                                for (var i = 0; i < object.attributes.length; ++i) {
                                    if (typeof object.attributes[i] !== "object")
                                        throw TypeError(".opentelemetry.proto.trace.v1.Span.Event.attributes: object expected");
                                    message.attributes[i] = $root.opentelemetry.proto.common.v1.KeyValue.fromObject(object.attributes[i]);
                                }
                            }
                            if (object.droppedAttributesCount != null)
                                message.droppedAttributesCount = object.droppedAttributesCount >>> 0;
                            return message;
                        };
                        /**
                         * Creates a plain object from an Event message. Also converts values to other types if specified.
                         * @function toObject
                         * @memberof opentelemetry.proto.trace.v1.Span.Event
                         * @static
                         * @param {opentelemetry.proto.trace.v1.Span.Event} message Event
                         * @param {$protobuf.IConversionOptions} [options] Conversion options
                         * @returns {Object.<string,*>} Plain object
                         */
                        Event.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.arrays || options.defaults)
                                object.attributes = [];
                            if (options.defaults) {
                                if ($util.Long) {
                                    var long = new $util.Long(0, 0, false);
                                    object.timeUnixNano = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                                }
                                else
                                    object.timeUnixNano = options.longs === String ? "0" : 0;
                                object.name = "";
                                object.droppedAttributesCount = 0;
                            }
                            if (message.timeUnixNano != null && message.hasOwnProperty("timeUnixNano"))
                                if (typeof message.timeUnixNano === "number")
                                    object.timeUnixNano = options.longs === String ? String(message.timeUnixNano) : message.timeUnixNano;
                                else
                                    object.timeUnixNano = options.longs === String ? $util.Long.prototype.toString.call(message.timeUnixNano) : options.longs === Number ? new $util.LongBits(message.timeUnixNano.low >>> 0, message.timeUnixNano.high >>> 0).toNumber() : message.timeUnixNano;
                            if (message.name != null && message.hasOwnProperty("name"))
                                object.name = message.name;
                            if (message.attributes && message.attributes.length) {
                                object.attributes = [];
                                for (var j = 0; j < message.attributes.length; ++j)
                                    object.attributes[j] = $root.opentelemetry.proto.common.v1.KeyValue.toObject(message.attributes[j], options);
                            }
                            if (message.droppedAttributesCount != null && message.hasOwnProperty("droppedAttributesCount"))
                                object.droppedAttributesCount = message.droppedAttributesCount;
                            return object;
                        };
                        /**
                         * Converts this Event to JSON.
                         * @function toJSON
                         * @memberof opentelemetry.proto.trace.v1.Span.Event
                         * @instance
                         * @returns {Object.<string,*>} JSON object
                         */
                        Event.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };
                        /**
                         * Gets the default type url for Event
                         * @function getTypeUrl
                         * @memberof opentelemetry.proto.trace.v1.Span.Event
                         * @static
                         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns {string} The default type url
                         */
                        Event.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                            if (typeUrlPrefix === undefined) {
                                typeUrlPrefix = "type.googleapis.com";
                            }
                            return typeUrlPrefix + "/opentelemetry.proto.trace.v1.Span.Event";
                        };
                        return Event;
                    })();
                    Span.Link = (function () {
                        /**
                         * Properties of a Link.
                         * @memberof opentelemetry.proto.trace.v1.Span
                         * @interface ILink
                         * @property {Uint8Array|null} [traceId] Link traceId
                         * @property {Uint8Array|null} [spanId] Link spanId
                         * @property {string|null} [traceState] Link traceState
                         * @property {Array.<opentelemetry.proto.common.v1.IKeyValue>|null} [attributes] Link attributes
                         * @property {number|null} [droppedAttributesCount] Link droppedAttributesCount
                         */
                        /**
                         * Constructs a new Link.
                         * @memberof opentelemetry.proto.trace.v1.Span
                         * @classdesc Represents a Link.
                         * @implements ILink
                         * @constructor
                         * @param {opentelemetry.proto.trace.v1.Span.ILink=} [properties] Properties to set
                         */
                        function Link(properties) {
                            this.attributes = [];
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    if (properties[keys[i]] != null)
                                        this[keys[i]] = properties[keys[i]];
                        }
                        /**
                         * Link traceId.
                         * @member {Uint8Array|null|undefined} traceId
                         * @memberof opentelemetry.proto.trace.v1.Span.Link
                         * @instance
                         */
                        Link.prototype.traceId = null;
                        /**
                         * Link spanId.
                         * @member {Uint8Array|null|undefined} spanId
                         * @memberof opentelemetry.proto.trace.v1.Span.Link
                         * @instance
                         */
                        Link.prototype.spanId = null;
                        /**
                         * Link traceState.
                         * @member {string|null|undefined} traceState
                         * @memberof opentelemetry.proto.trace.v1.Span.Link
                         * @instance
                         */
                        Link.prototype.traceState = null;
                        /**
                         * Link attributes.
                         * @member {Array.<opentelemetry.proto.common.v1.IKeyValue>} attributes
                         * @memberof opentelemetry.proto.trace.v1.Span.Link
                         * @instance
                         */
                        Link.prototype.attributes = $util.emptyArray;
                        /**
                         * Link droppedAttributesCount.
                         * @member {number|null|undefined} droppedAttributesCount
                         * @memberof opentelemetry.proto.trace.v1.Span.Link
                         * @instance
                         */
                        Link.prototype.droppedAttributesCount = null;
                        /**
                         * Creates a new Link instance using the specified properties.
                         * @function create
                         * @memberof opentelemetry.proto.trace.v1.Span.Link
                         * @static
                         * @param {opentelemetry.proto.trace.v1.Span.ILink=} [properties] Properties to set
                         * @returns {opentelemetry.proto.trace.v1.Span.Link} Link instance
                         */
                        Link.create = function create(properties) {
                            return new Link(properties);
                        };
                        /**
                         * Encodes the specified Link message. Does not implicitly {@link opentelemetry.proto.trace.v1.Span.Link.verify|verify} messages.
                         * @function encode
                         * @memberof opentelemetry.proto.trace.v1.Span.Link
                         * @static
                         * @param {opentelemetry.proto.trace.v1.Span.ILink} message Link message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        Link.encode = function encode(message, writer) {
                            if (!writer)
                                writer = $Writer.create();
                            if (message.traceId != null && Object.hasOwnProperty.call(message, "traceId"))
                                writer.uint32(/* id 1, wireType 2 =*/ 10).bytes(message.traceId);
                            if (message.spanId != null && Object.hasOwnProperty.call(message, "spanId"))
                                writer.uint32(/* id 2, wireType 2 =*/ 18).bytes(message.spanId);
                            if (message.traceState != null && Object.hasOwnProperty.call(message, "traceState"))
                                writer.uint32(/* id 3, wireType 2 =*/ 26).string(message.traceState);
                            if (message.attributes != null && message.attributes.length)
                                for (var i = 0; i < message.attributes.length; ++i)
                                    $root.opentelemetry.proto.common.v1.KeyValue.encode(message.attributes[i], writer.uint32(/* id 4, wireType 2 =*/ 34).fork()).ldelim();
                            if (message.droppedAttributesCount != null && Object.hasOwnProperty.call(message, "droppedAttributesCount"))
                                writer.uint32(/* id 5, wireType 0 =*/ 40).uint32(message.droppedAttributesCount);
                            return writer;
                        };
                        /**
                         * Encodes the specified Link message, length delimited. Does not implicitly {@link opentelemetry.proto.trace.v1.Span.Link.verify|verify} messages.
                         * @function encodeDelimited
                         * @memberof opentelemetry.proto.trace.v1.Span.Link
                         * @static
                         * @param {opentelemetry.proto.trace.v1.Span.ILink} message Link message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        Link.encodeDelimited = function encodeDelimited(message, writer) {
                            return this.encode(message, writer).ldelim();
                        };
                        /**
                         * Decodes a Link message from the specified reader or buffer.
                         * @function decode
                         * @memberof opentelemetry.proto.trace.v1.Span.Link
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @param {number} [length] Message length if known beforehand
                         * @returns {opentelemetry.proto.trace.v1.Span.Link} Link
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        Link.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.trace.v1.Span.Link();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                    case 1: {
                                        message.traceId = reader.bytes();
                                        break;
                                    }
                                    case 2: {
                                        message.spanId = reader.bytes();
                                        break;
                                    }
                                    case 3: {
                                        message.traceState = reader.string();
                                        break;
                                    }
                                    case 4: {
                                        if (!(message.attributes && message.attributes.length))
                                            message.attributes = [];
                                        message.attributes.push($root.opentelemetry.proto.common.v1.KeyValue.decode(reader, reader.uint32()));
                                        break;
                                    }
                                    case 5: {
                                        message.droppedAttributesCount = reader.uint32();
                                        break;
                                    }
                                    default:
                                        reader.skipType(tag & 7);
                                        break;
                                }
                            }
                            return message;
                        };
                        /**
                         * Decodes a Link message from the specified reader or buffer, length delimited.
                         * @function decodeDelimited
                         * @memberof opentelemetry.proto.trace.v1.Span.Link
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @returns {opentelemetry.proto.trace.v1.Span.Link} Link
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        Link.decodeDelimited = function decodeDelimited(reader) {
                            if (!(reader instanceof $Reader))
                                reader = new $Reader(reader);
                            return this.decode(reader, reader.uint32());
                        };
                        /**
                         * Verifies a Link message.
                         * @function verify
                         * @memberof opentelemetry.proto.trace.v1.Span.Link
                         * @static
                         * @param {Object.<string,*>} message Plain object to verify
                         * @returns {string|null} `null` if valid, otherwise the reason why it is not
                         */
                        Link.verify = function verify(message) {
                            if (typeof message !== "object" || message === null)
                                return "object expected";
                            if (message.traceId != null && message.hasOwnProperty("traceId"))
                                if (!(message.traceId && typeof message.traceId.length === "number" || $util.isString(message.traceId)))
                                    return "traceId: buffer expected";
                            if (message.spanId != null && message.hasOwnProperty("spanId"))
                                if (!(message.spanId && typeof message.spanId.length === "number" || $util.isString(message.spanId)))
                                    return "spanId: buffer expected";
                            if (message.traceState != null && message.hasOwnProperty("traceState"))
                                if (!$util.isString(message.traceState))
                                    return "traceState: string expected";
                            if (message.attributes != null && message.hasOwnProperty("attributes")) {
                                if (!Array.isArray(message.attributes))
                                    return "attributes: array expected";
                                for (var i = 0; i < message.attributes.length; ++i) {
                                    var error = $root.opentelemetry.proto.common.v1.KeyValue.verify(message.attributes[i]);
                                    if (error)
                                        return "attributes." + error;
                                }
                            }
                            if (message.droppedAttributesCount != null && message.hasOwnProperty("droppedAttributesCount"))
                                if (!$util.isInteger(message.droppedAttributesCount))
                                    return "droppedAttributesCount: integer expected";
                            return null;
                        };
                        /**
                         * Creates a Link message from a plain object. Also converts values to their respective internal types.
                         * @function fromObject
                         * @memberof opentelemetry.proto.trace.v1.Span.Link
                         * @static
                         * @param {Object.<string,*>} object Plain object
                         * @returns {opentelemetry.proto.trace.v1.Span.Link} Link
                         */
                        Link.fromObject = function fromObject(object) {
                            if (object instanceof $root.opentelemetry.proto.trace.v1.Span.Link)
                                return object;
                            var message = new $root.opentelemetry.proto.trace.v1.Span.Link();
                            if (object.traceId != null)
                                if (typeof object.traceId === "string")
                                    $util.base64.decode(object.traceId, message.traceId = $util.newBuffer($util.base64.length(object.traceId)), 0);
                                else if (object.traceId.length >= 0)
                                    message.traceId = object.traceId;
                            if (object.spanId != null)
                                if (typeof object.spanId === "string")
                                    $util.base64.decode(object.spanId, message.spanId = $util.newBuffer($util.base64.length(object.spanId)), 0);
                                else if (object.spanId.length >= 0)
                                    message.spanId = object.spanId;
                            if (object.traceState != null)
                                message.traceState = String(object.traceState);
                            if (object.attributes) {
                                if (!Array.isArray(object.attributes))
                                    throw TypeError(".opentelemetry.proto.trace.v1.Span.Link.attributes: array expected");
                                message.attributes = [];
                                for (var i = 0; i < object.attributes.length; ++i) {
                                    if (typeof object.attributes[i] !== "object")
                                        throw TypeError(".opentelemetry.proto.trace.v1.Span.Link.attributes: object expected");
                                    message.attributes[i] = $root.opentelemetry.proto.common.v1.KeyValue.fromObject(object.attributes[i]);
                                }
                            }
                            if (object.droppedAttributesCount != null)
                                message.droppedAttributesCount = object.droppedAttributesCount >>> 0;
                            return message;
                        };
                        /**
                         * Creates a plain object from a Link message. Also converts values to other types if specified.
                         * @function toObject
                         * @memberof opentelemetry.proto.trace.v1.Span.Link
                         * @static
                         * @param {opentelemetry.proto.trace.v1.Span.Link} message Link
                         * @param {$protobuf.IConversionOptions} [options] Conversion options
                         * @returns {Object.<string,*>} Plain object
                         */
                        Link.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.arrays || options.defaults)
                                object.attributes = [];
                            if (options.defaults) {
                                if (options.bytes === String)
                                    object.traceId = "";
                                else {
                                    object.traceId = [];
                                    if (options.bytes !== Array)
                                        object.traceId = $util.newBuffer(object.traceId);
                                }
                                if (options.bytes === String)
                                    object.spanId = "";
                                else {
                                    object.spanId = [];
                                    if (options.bytes !== Array)
                                        object.spanId = $util.newBuffer(object.spanId);
                                }
                                object.traceState = "";
                                object.droppedAttributesCount = 0;
                            }
                            if (message.traceId != null && message.hasOwnProperty("traceId"))
                                object.traceId = options.bytes === String ? $util.base64.encode(message.traceId, 0, message.traceId.length) : options.bytes === Array ? Array.prototype.slice.call(message.traceId) : message.traceId;
                            if (message.spanId != null && message.hasOwnProperty("spanId"))
                                object.spanId = options.bytes === String ? $util.base64.encode(message.spanId, 0, message.spanId.length) : options.bytes === Array ? Array.prototype.slice.call(message.spanId) : message.spanId;
                            if (message.traceState != null && message.hasOwnProperty("traceState"))
                                object.traceState = message.traceState;
                            if (message.attributes && message.attributes.length) {
                                object.attributes = [];
                                for (var j = 0; j < message.attributes.length; ++j)
                                    object.attributes[j] = $root.opentelemetry.proto.common.v1.KeyValue.toObject(message.attributes[j], options);
                            }
                            if (message.droppedAttributesCount != null && message.hasOwnProperty("droppedAttributesCount"))
                                object.droppedAttributesCount = message.droppedAttributesCount;
                            return object;
                        };
                        /**
                         * Converts this Link to JSON.
                         * @function toJSON
                         * @memberof opentelemetry.proto.trace.v1.Span.Link
                         * @instance
                         * @returns {Object.<string,*>} JSON object
                         */
                        Link.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };
                        /**
                         * Gets the default type url for Link
                         * @function getTypeUrl
                         * @memberof opentelemetry.proto.trace.v1.Span.Link
                         * @static
                         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns {string} The default type url
                         */
                        Link.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                            if (typeUrlPrefix === undefined) {
                                typeUrlPrefix = "type.googleapis.com";
                            }
                            return typeUrlPrefix + "/opentelemetry.proto.trace.v1.Span.Link";
                        };
                        return Link;
                    })();
                    return Span;
                })();
                v1.Status = (function () {
                    /**
                     * Properties of a Status.
                     * @memberof opentelemetry.proto.trace.v1
                     * @interface IStatus
                     * @property {string|null} [message] Status message
                     * @property {opentelemetry.proto.trace.v1.Status.StatusCode|null} [code] Status code
                     */
                    /**
                     * Constructs a new Status.
                     * @memberof opentelemetry.proto.trace.v1
                     * @classdesc Represents a Status.
                     * @implements IStatus
                     * @constructor
                     * @param {opentelemetry.proto.trace.v1.IStatus=} [properties] Properties to set
                     */
                    function Status(properties) {
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * Status message.
                     * @member {string|null|undefined} message
                     * @memberof opentelemetry.proto.trace.v1.Status
                     * @instance
                     */
                    Status.prototype.message = null;
                    /**
                     * Status code.
                     * @member {opentelemetry.proto.trace.v1.Status.StatusCode|null|undefined} code
                     * @memberof opentelemetry.proto.trace.v1.Status
                     * @instance
                     */
                    Status.prototype.code = null;
                    /**
                     * Creates a new Status instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.trace.v1.Status
                     * @static
                     * @param {opentelemetry.proto.trace.v1.IStatus=} [properties] Properties to set
                     * @returns {opentelemetry.proto.trace.v1.Status} Status instance
                     */
                    Status.create = function create(properties) {
                        return new Status(properties);
                    };
                    /**
                     * Encodes the specified Status message. Does not implicitly {@link opentelemetry.proto.trace.v1.Status.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.trace.v1.Status
                     * @static
                     * @param {opentelemetry.proto.trace.v1.IStatus} message Status message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Status.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                            writer.uint32(/* id 2, wireType 2 =*/ 18).string(message.message);
                        if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                            writer.uint32(/* id 3, wireType 0 =*/ 24).int32(message.code);
                        return writer;
                    };
                    /**
                     * Encodes the specified Status message, length delimited. Does not implicitly {@link opentelemetry.proto.trace.v1.Status.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.trace.v1.Status
                     * @static
                     * @param {opentelemetry.proto.trace.v1.IStatus} message Status message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Status.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a Status message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.trace.v1.Status
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.trace.v1.Status} Status
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Status.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.trace.v1.Status();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 2: {
                                    message.message = reader.string();
                                    break;
                                }
                                case 3: {
                                    message.code = reader.int32();
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a Status message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.trace.v1.Status
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.trace.v1.Status} Status
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Status.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a Status message.
                     * @function verify
                     * @memberof opentelemetry.proto.trace.v1.Status
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    Status.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.message != null && message.hasOwnProperty("message"))
                            if (!$util.isString(message.message))
                                return "message: string expected";
                        if (message.code != null && message.hasOwnProperty("code"))
                            switch (message.code) {
                                default:
                                    return "code: enum value expected";
                                case 0:
                                case 1:
                                case 2:
                                    break;
                            }
                        return null;
                    };
                    /**
                     * Creates a Status message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.trace.v1.Status
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.trace.v1.Status} Status
                     */
                    Status.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.trace.v1.Status)
                            return object;
                        var message = new $root.opentelemetry.proto.trace.v1.Status();
                        if (object.message != null)
                            message.message = String(object.message);
                        switch (object.code) {
                            default:
                                if (typeof object.code === "number") {
                                    message.code = object.code;
                                    break;
                                }
                                break;
                            case "STATUS_CODE_UNSET":
                            case 0:
                                message.code = 0;
                                break;
                            case "STATUS_CODE_OK":
                            case 1:
                                message.code = 1;
                                break;
                            case "STATUS_CODE_ERROR":
                            case 2:
                                message.code = 2;
                                break;
                        }
                        return message;
                    };
                    /**
                     * Creates a plain object from a Status message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.trace.v1.Status
                     * @static
                     * @param {opentelemetry.proto.trace.v1.Status} message Status
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    Status.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.defaults) {
                            object.message = "";
                            object.code = options.enums === String ? "STATUS_CODE_UNSET" : 0;
                        }
                        if (message.message != null && message.hasOwnProperty("message"))
                            object.message = message.message;
                        if (message.code != null && message.hasOwnProperty("code"))
                            object.code = options.enums === String ? $root.opentelemetry.proto.trace.v1.Status.StatusCode[message.code] === undefined ? message.code : $root.opentelemetry.proto.trace.v1.Status.StatusCode[message.code] : message.code;
                        return object;
                    };
                    /**
                     * Converts this Status to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.trace.v1.Status
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    Status.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for Status
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.trace.v1.Status
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    Status.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.trace.v1.Status";
                    };
                    /**
                     * StatusCode enum.
                     * @name opentelemetry.proto.trace.v1.Status.StatusCode
                     * @enum {number}
                     * @property {number} STATUS_CODE_UNSET=0 STATUS_CODE_UNSET value
                     * @property {number} STATUS_CODE_OK=1 STATUS_CODE_OK value
                     * @property {number} STATUS_CODE_ERROR=2 STATUS_CODE_ERROR value
                     */
                    Status.StatusCode = (function () {
                        var valuesById = {}, values = Object.create(valuesById);
                        values[valuesById[0] = "STATUS_CODE_UNSET"] = 0;
                        values[valuesById[1] = "STATUS_CODE_OK"] = 1;
                        values[valuesById[2] = "STATUS_CODE_ERROR"] = 2;
                        return values;
                    })();
                    return Status;
                })();
                return v1;
            })();
            return trace;
        })();
        proto.collector = (function () {
            /**
             * Namespace collector.
             * @memberof opentelemetry.proto
             * @namespace
             */
            var collector = {};
            collector.trace = (function () {
                /**
                 * Namespace trace.
                 * @memberof opentelemetry.proto.collector
                 * @namespace
                 */
                var trace = {};
                trace.v1 = (function () {
                    /**
                     * Namespace v1.
                     * @memberof opentelemetry.proto.collector.trace
                     * @namespace
                     */
                    var v1 = {};
                    v1.TraceService = (function () {
                        /**
                         * Constructs a new TraceService service.
                         * @memberof opentelemetry.proto.collector.trace.v1
                         * @classdesc Represents a TraceService
                         * @extends $protobuf.rpc.Service
                         * @constructor
                         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
                         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
                         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
                         */
                        function TraceService(rpcImpl, requestDelimited, responseDelimited) {
                            $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
                        }
                        (TraceService.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = TraceService;
                        /**
                         * Creates new TraceService service using the specified rpc implementation.
                         * @function create
                         * @memberof opentelemetry.proto.collector.trace.v1.TraceService
                         * @static
                         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
                         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
                         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
                         * @returns {TraceService} RPC service. Useful where requests and/or responses are streamed.
                         */
                        TraceService.create = function create(rpcImpl, requestDelimited, responseDelimited) {
                            return new this(rpcImpl, requestDelimited, responseDelimited);
                        };
                        /**
                         * Callback as used by {@link opentelemetry.proto.collector.trace.v1.TraceService#export_}.
                         * @memberof opentelemetry.proto.collector.trace.v1.TraceService
                         * @typedef ExportCallback
                         * @type {function}
                         * @param {Error|null} error Error, if any
                         * @param {opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse} [response] ExportTraceServiceResponse
                         */
                        /**
                         * Calls Export.
                         * @function export
                         * @memberof opentelemetry.proto.collector.trace.v1.TraceService
                         * @instance
                         * @param {opentelemetry.proto.collector.trace.v1.IExportTraceServiceRequest} request ExportTraceServiceRequest message or plain object
                         * @param {opentelemetry.proto.collector.trace.v1.TraceService.ExportCallback} callback Node-style callback called with the error, if any, and ExportTraceServiceResponse
                         * @returns {undefined}
                         * @variation 1
                         */
                        Object.defineProperty(TraceService.prototype["export"] = function export_(request, callback) {
                            return this.rpcCall(export_, $root.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest, $root.opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse, request, callback);
                        }, "name", { value: "Export" });
                        /**
                         * Calls Export.
                         * @function export
                         * @memberof opentelemetry.proto.collector.trace.v1.TraceService
                         * @instance
                         * @param {opentelemetry.proto.collector.trace.v1.IExportTraceServiceRequest} request ExportTraceServiceRequest message or plain object
                         * @returns {Promise<opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse>} Promise
                         * @variation 2
                         */
                        return TraceService;
                    })();
                    v1.ExportTraceServiceRequest = (function () {
                        /**
                         * Properties of an ExportTraceServiceRequest.
                         * @memberof opentelemetry.proto.collector.trace.v1
                         * @interface IExportTraceServiceRequest
                         * @property {Array.<opentelemetry.proto.trace.v1.IResourceSpans>|null} [resourceSpans] ExportTraceServiceRequest resourceSpans
                         */
                        /**
                         * Constructs a new ExportTraceServiceRequest.
                         * @memberof opentelemetry.proto.collector.trace.v1
                         * @classdesc Represents an ExportTraceServiceRequest.
                         * @implements IExportTraceServiceRequest
                         * @constructor
                         * @param {opentelemetry.proto.collector.trace.v1.IExportTraceServiceRequest=} [properties] Properties to set
                         */
                        function ExportTraceServiceRequest(properties) {
                            this.resourceSpans = [];
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    if (properties[keys[i]] != null)
                                        this[keys[i]] = properties[keys[i]];
                        }
                        /**
                         * ExportTraceServiceRequest resourceSpans.
                         * @member {Array.<opentelemetry.proto.trace.v1.IResourceSpans>} resourceSpans
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest
                         * @instance
                         */
                        ExportTraceServiceRequest.prototype.resourceSpans = $util.emptyArray;
                        /**
                         * Creates a new ExportTraceServiceRequest instance using the specified properties.
                         * @function create
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest
                         * @static
                         * @param {opentelemetry.proto.collector.trace.v1.IExportTraceServiceRequest=} [properties] Properties to set
                         * @returns {opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest} ExportTraceServiceRequest instance
                         */
                        ExportTraceServiceRequest.create = function create(properties) {
                            return new ExportTraceServiceRequest(properties);
                        };
                        /**
                         * Encodes the specified ExportTraceServiceRequest message. Does not implicitly {@link opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest.verify|verify} messages.
                         * @function encode
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest
                         * @static
                         * @param {opentelemetry.proto.collector.trace.v1.IExportTraceServiceRequest} message ExportTraceServiceRequest message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        ExportTraceServiceRequest.encode = function encode(message, writer) {
                            if (!writer)
                                writer = $Writer.create();
                            if (message.resourceSpans != null && message.resourceSpans.length)
                                for (var i = 0; i < message.resourceSpans.length; ++i)
                                    $root.opentelemetry.proto.trace.v1.ResourceSpans.encode(message.resourceSpans[i], writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                            return writer;
                        };
                        /**
                         * Encodes the specified ExportTraceServiceRequest message, length delimited. Does not implicitly {@link opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest.verify|verify} messages.
                         * @function encodeDelimited
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest
                         * @static
                         * @param {opentelemetry.proto.collector.trace.v1.IExportTraceServiceRequest} message ExportTraceServiceRequest message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        ExportTraceServiceRequest.encodeDelimited = function encodeDelimited(message, writer) {
                            return this.encode(message, writer).ldelim();
                        };
                        /**
                         * Decodes an ExportTraceServiceRequest message from the specified reader or buffer.
                         * @function decode
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @param {number} [length] Message length if known beforehand
                         * @returns {opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest} ExportTraceServiceRequest
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        ExportTraceServiceRequest.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                    case 1: {
                                        if (!(message.resourceSpans && message.resourceSpans.length))
                                            message.resourceSpans = [];
                                        message.resourceSpans.push($root.opentelemetry.proto.trace.v1.ResourceSpans.decode(reader, reader.uint32()));
                                        break;
                                    }
                                    default:
                                        reader.skipType(tag & 7);
                                        break;
                                }
                            }
                            return message;
                        };
                        /**
                         * Decodes an ExportTraceServiceRequest message from the specified reader or buffer, length delimited.
                         * @function decodeDelimited
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @returns {opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest} ExportTraceServiceRequest
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        ExportTraceServiceRequest.decodeDelimited = function decodeDelimited(reader) {
                            if (!(reader instanceof $Reader))
                                reader = new $Reader(reader);
                            return this.decode(reader, reader.uint32());
                        };
                        /**
                         * Verifies an ExportTraceServiceRequest message.
                         * @function verify
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest
                         * @static
                         * @param {Object.<string,*>} message Plain object to verify
                         * @returns {string|null} `null` if valid, otherwise the reason why it is not
                         */
                        ExportTraceServiceRequest.verify = function verify(message) {
                            if (typeof message !== "object" || message === null)
                                return "object expected";
                            if (message.resourceSpans != null && message.hasOwnProperty("resourceSpans")) {
                                if (!Array.isArray(message.resourceSpans))
                                    return "resourceSpans: array expected";
                                for (var i = 0; i < message.resourceSpans.length; ++i) {
                                    var error = $root.opentelemetry.proto.trace.v1.ResourceSpans.verify(message.resourceSpans[i]);
                                    if (error)
                                        return "resourceSpans." + error;
                                }
                            }
                            return null;
                        };
                        /**
                         * Creates an ExportTraceServiceRequest message from a plain object. Also converts values to their respective internal types.
                         * @function fromObject
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest
                         * @static
                         * @param {Object.<string,*>} object Plain object
                         * @returns {opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest} ExportTraceServiceRequest
                         */
                        ExportTraceServiceRequest.fromObject = function fromObject(object) {
                            if (object instanceof $root.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest)
                                return object;
                            var message = new $root.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest();
                            if (object.resourceSpans) {
                                if (!Array.isArray(object.resourceSpans))
                                    throw TypeError(".opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest.resourceSpans: array expected");
                                message.resourceSpans = [];
                                for (var i = 0; i < object.resourceSpans.length; ++i) {
                                    if (typeof object.resourceSpans[i] !== "object")
                                        throw TypeError(".opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest.resourceSpans: object expected");
                                    message.resourceSpans[i] = $root.opentelemetry.proto.trace.v1.ResourceSpans.fromObject(object.resourceSpans[i]);
                                }
                            }
                            return message;
                        };
                        /**
                         * Creates a plain object from an ExportTraceServiceRequest message. Also converts values to other types if specified.
                         * @function toObject
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest
                         * @static
                         * @param {opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest} message ExportTraceServiceRequest
                         * @param {$protobuf.IConversionOptions} [options] Conversion options
                         * @returns {Object.<string,*>} Plain object
                         */
                        ExportTraceServiceRequest.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.arrays || options.defaults)
                                object.resourceSpans = [];
                            if (message.resourceSpans && message.resourceSpans.length) {
                                object.resourceSpans = [];
                                for (var j = 0; j < message.resourceSpans.length; ++j)
                                    object.resourceSpans[j] = $root.opentelemetry.proto.trace.v1.ResourceSpans.toObject(message.resourceSpans[j], options);
                            }
                            return object;
                        };
                        /**
                         * Converts this ExportTraceServiceRequest to JSON.
                         * @function toJSON
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest
                         * @instance
                         * @returns {Object.<string,*>} JSON object
                         */
                        ExportTraceServiceRequest.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };
                        /**
                         * Gets the default type url for ExportTraceServiceRequest
                         * @function getTypeUrl
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest
                         * @static
                         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns {string} The default type url
                         */
                        ExportTraceServiceRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                            if (typeUrlPrefix === undefined) {
                                typeUrlPrefix = "type.googleapis.com";
                            }
                            return typeUrlPrefix + "/opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest";
                        };
                        return ExportTraceServiceRequest;
                    })();
                    v1.ExportTraceServiceResponse = (function () {
                        /**
                         * Properties of an ExportTraceServiceResponse.
                         * @memberof opentelemetry.proto.collector.trace.v1
                         * @interface IExportTraceServiceResponse
                         * @property {opentelemetry.proto.collector.trace.v1.IExportTracePartialSuccess|null} [partialSuccess] ExportTraceServiceResponse partialSuccess
                         */
                        /**
                         * Constructs a new ExportTraceServiceResponse.
                         * @memberof opentelemetry.proto.collector.trace.v1
                         * @classdesc Represents an ExportTraceServiceResponse.
                         * @implements IExportTraceServiceResponse
                         * @constructor
                         * @param {opentelemetry.proto.collector.trace.v1.IExportTraceServiceResponse=} [properties] Properties to set
                         */
                        function ExportTraceServiceResponse(properties) {
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    if (properties[keys[i]] != null)
                                        this[keys[i]] = properties[keys[i]];
                        }
                        /**
                         * ExportTraceServiceResponse partialSuccess.
                         * @member {opentelemetry.proto.collector.trace.v1.IExportTracePartialSuccess|null|undefined} partialSuccess
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse
                         * @instance
                         */
                        ExportTraceServiceResponse.prototype.partialSuccess = null;
                        /**
                         * Creates a new ExportTraceServiceResponse instance using the specified properties.
                         * @function create
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse
                         * @static
                         * @param {opentelemetry.proto.collector.trace.v1.IExportTraceServiceResponse=} [properties] Properties to set
                         * @returns {opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse} ExportTraceServiceResponse instance
                         */
                        ExportTraceServiceResponse.create = function create(properties) {
                            return new ExportTraceServiceResponse(properties);
                        };
                        /**
                         * Encodes the specified ExportTraceServiceResponse message. Does not implicitly {@link opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse.verify|verify} messages.
                         * @function encode
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse
                         * @static
                         * @param {opentelemetry.proto.collector.trace.v1.IExportTraceServiceResponse} message ExportTraceServiceResponse message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        ExportTraceServiceResponse.encode = function encode(message, writer) {
                            if (!writer)
                                writer = $Writer.create();
                            if (message.partialSuccess != null && Object.hasOwnProperty.call(message, "partialSuccess"))
                                $root.opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess.encode(message.partialSuccess, writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                            return writer;
                        };
                        /**
                         * Encodes the specified ExportTraceServiceResponse message, length delimited. Does not implicitly {@link opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse.verify|verify} messages.
                         * @function encodeDelimited
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse
                         * @static
                         * @param {opentelemetry.proto.collector.trace.v1.IExportTraceServiceResponse} message ExportTraceServiceResponse message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        ExportTraceServiceResponse.encodeDelimited = function encodeDelimited(message, writer) {
                            return this.encode(message, writer).ldelim();
                        };
                        /**
                         * Decodes an ExportTraceServiceResponse message from the specified reader or buffer.
                         * @function decode
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @param {number} [length] Message length if known beforehand
                         * @returns {opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse} ExportTraceServiceResponse
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        ExportTraceServiceResponse.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                    case 1: {
                                        message.partialSuccess = $root.opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess.decode(reader, reader.uint32());
                                        break;
                                    }
                                    default:
                                        reader.skipType(tag & 7);
                                        break;
                                }
                            }
                            return message;
                        };
                        /**
                         * Decodes an ExportTraceServiceResponse message from the specified reader or buffer, length delimited.
                         * @function decodeDelimited
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @returns {opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse} ExportTraceServiceResponse
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        ExportTraceServiceResponse.decodeDelimited = function decodeDelimited(reader) {
                            if (!(reader instanceof $Reader))
                                reader = new $Reader(reader);
                            return this.decode(reader, reader.uint32());
                        };
                        /**
                         * Verifies an ExportTraceServiceResponse message.
                         * @function verify
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse
                         * @static
                         * @param {Object.<string,*>} message Plain object to verify
                         * @returns {string|null} `null` if valid, otherwise the reason why it is not
                         */
                        ExportTraceServiceResponse.verify = function verify(message) {
                            if (typeof message !== "object" || message === null)
                                return "object expected";
                            if (message.partialSuccess != null && message.hasOwnProperty("partialSuccess")) {
                                var error = $root.opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess.verify(message.partialSuccess);
                                if (error)
                                    return "partialSuccess." + error;
                            }
                            return null;
                        };
                        /**
                         * Creates an ExportTraceServiceResponse message from a plain object. Also converts values to their respective internal types.
                         * @function fromObject
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse
                         * @static
                         * @param {Object.<string,*>} object Plain object
                         * @returns {opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse} ExportTraceServiceResponse
                         */
                        ExportTraceServiceResponse.fromObject = function fromObject(object) {
                            if (object instanceof $root.opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse)
                                return object;
                            var message = new $root.opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse();
                            if (object.partialSuccess != null) {
                                if (typeof object.partialSuccess !== "object")
                                    throw TypeError(".opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse.partialSuccess: object expected");
                                message.partialSuccess = $root.opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess.fromObject(object.partialSuccess);
                            }
                            return message;
                        };
                        /**
                         * Creates a plain object from an ExportTraceServiceResponse message. Also converts values to other types if specified.
                         * @function toObject
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse
                         * @static
                         * @param {opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse} message ExportTraceServiceResponse
                         * @param {$protobuf.IConversionOptions} [options] Conversion options
                         * @returns {Object.<string,*>} Plain object
                         */
                        ExportTraceServiceResponse.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.defaults)
                                object.partialSuccess = null;
                            if (message.partialSuccess != null && message.hasOwnProperty("partialSuccess"))
                                object.partialSuccess = $root.opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess.toObject(message.partialSuccess, options);
                            return object;
                        };
                        /**
                         * Converts this ExportTraceServiceResponse to JSON.
                         * @function toJSON
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse
                         * @instance
                         * @returns {Object.<string,*>} JSON object
                         */
                        ExportTraceServiceResponse.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };
                        /**
                         * Gets the default type url for ExportTraceServiceResponse
                         * @function getTypeUrl
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse
                         * @static
                         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns {string} The default type url
                         */
                        ExportTraceServiceResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                            if (typeUrlPrefix === undefined) {
                                typeUrlPrefix = "type.googleapis.com";
                            }
                            return typeUrlPrefix + "/opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse";
                        };
                        return ExportTraceServiceResponse;
                    })();
                    v1.ExportTracePartialSuccess = (function () {
                        /**
                         * Properties of an ExportTracePartialSuccess.
                         * @memberof opentelemetry.proto.collector.trace.v1
                         * @interface IExportTracePartialSuccess
                         * @property {number|Long|null} [rejectedSpans] ExportTracePartialSuccess rejectedSpans
                         * @property {string|null} [errorMessage] ExportTracePartialSuccess errorMessage
                         */
                        /**
                         * Constructs a new ExportTracePartialSuccess.
                         * @memberof opentelemetry.proto.collector.trace.v1
                         * @classdesc Represents an ExportTracePartialSuccess.
                         * @implements IExportTracePartialSuccess
                         * @constructor
                         * @param {opentelemetry.proto.collector.trace.v1.IExportTracePartialSuccess=} [properties] Properties to set
                         */
                        function ExportTracePartialSuccess(properties) {
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    if (properties[keys[i]] != null)
                                        this[keys[i]] = properties[keys[i]];
                        }
                        /**
                         * ExportTracePartialSuccess rejectedSpans.
                         * @member {number|Long|null|undefined} rejectedSpans
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess
                         * @instance
                         */
                        ExportTracePartialSuccess.prototype.rejectedSpans = null;
                        /**
                         * ExportTracePartialSuccess errorMessage.
                         * @member {string|null|undefined} errorMessage
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess
                         * @instance
                         */
                        ExportTracePartialSuccess.prototype.errorMessage = null;
                        /**
                         * Creates a new ExportTracePartialSuccess instance using the specified properties.
                         * @function create
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess
                         * @static
                         * @param {opentelemetry.proto.collector.trace.v1.IExportTracePartialSuccess=} [properties] Properties to set
                         * @returns {opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess} ExportTracePartialSuccess instance
                         */
                        ExportTracePartialSuccess.create = function create(properties) {
                            return new ExportTracePartialSuccess(properties);
                        };
                        /**
                         * Encodes the specified ExportTracePartialSuccess message. Does not implicitly {@link opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess.verify|verify} messages.
                         * @function encode
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess
                         * @static
                         * @param {opentelemetry.proto.collector.trace.v1.IExportTracePartialSuccess} message ExportTracePartialSuccess message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        ExportTracePartialSuccess.encode = function encode(message, writer) {
                            if (!writer)
                                writer = $Writer.create();
                            if (message.rejectedSpans != null && Object.hasOwnProperty.call(message, "rejectedSpans"))
                                writer.uint32(/* id 1, wireType 0 =*/ 8).int64(message.rejectedSpans);
                            if (message.errorMessage != null && Object.hasOwnProperty.call(message, "errorMessage"))
                                writer.uint32(/* id 2, wireType 2 =*/ 18).string(message.errorMessage);
                            return writer;
                        };
                        /**
                         * Encodes the specified ExportTracePartialSuccess message, length delimited. Does not implicitly {@link opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess.verify|verify} messages.
                         * @function encodeDelimited
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess
                         * @static
                         * @param {opentelemetry.proto.collector.trace.v1.IExportTracePartialSuccess} message ExportTracePartialSuccess message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        ExportTracePartialSuccess.encodeDelimited = function encodeDelimited(message, writer) {
                            return this.encode(message, writer).ldelim();
                        };
                        /**
                         * Decodes an ExportTracePartialSuccess message from the specified reader or buffer.
                         * @function decode
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @param {number} [length] Message length if known beforehand
                         * @returns {opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess} ExportTracePartialSuccess
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        ExportTracePartialSuccess.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                    case 1: {
                                        message.rejectedSpans = reader.int64();
                                        break;
                                    }
                                    case 2: {
                                        message.errorMessage = reader.string();
                                        break;
                                    }
                                    default:
                                        reader.skipType(tag & 7);
                                        break;
                                }
                            }
                            return message;
                        };
                        /**
                         * Decodes an ExportTracePartialSuccess message from the specified reader or buffer, length delimited.
                         * @function decodeDelimited
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @returns {opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess} ExportTracePartialSuccess
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        ExportTracePartialSuccess.decodeDelimited = function decodeDelimited(reader) {
                            if (!(reader instanceof $Reader))
                                reader = new $Reader(reader);
                            return this.decode(reader, reader.uint32());
                        };
                        /**
                         * Verifies an ExportTracePartialSuccess message.
                         * @function verify
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess
                         * @static
                         * @param {Object.<string,*>} message Plain object to verify
                         * @returns {string|null} `null` if valid, otherwise the reason why it is not
                         */
                        ExportTracePartialSuccess.verify = function verify(message) {
                            if (typeof message !== "object" || message === null)
                                return "object expected";
                            if (message.rejectedSpans != null && message.hasOwnProperty("rejectedSpans"))
                                if (!$util.isInteger(message.rejectedSpans) && !(message.rejectedSpans && $util.isInteger(message.rejectedSpans.low) && $util.isInteger(message.rejectedSpans.high)))
                                    return "rejectedSpans: integer|Long expected";
                            if (message.errorMessage != null && message.hasOwnProperty("errorMessage"))
                                if (!$util.isString(message.errorMessage))
                                    return "errorMessage: string expected";
                            return null;
                        };
                        /**
                         * Creates an ExportTracePartialSuccess message from a plain object. Also converts values to their respective internal types.
                         * @function fromObject
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess
                         * @static
                         * @param {Object.<string,*>} object Plain object
                         * @returns {opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess} ExportTracePartialSuccess
                         */
                        ExportTracePartialSuccess.fromObject = function fromObject(object) {
                            if (object instanceof $root.opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess)
                                return object;
                            var message = new $root.opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess();
                            if (object.rejectedSpans != null)
                                if ($util.Long)
                                    (message.rejectedSpans = $util.Long.fromValue(object.rejectedSpans)).unsigned = false;
                                else if (typeof object.rejectedSpans === "string")
                                    message.rejectedSpans = parseInt(object.rejectedSpans, 10);
                                else if (typeof object.rejectedSpans === "number")
                                    message.rejectedSpans = object.rejectedSpans;
                                else if (typeof object.rejectedSpans === "object")
                                    message.rejectedSpans = new $util.LongBits(object.rejectedSpans.low >>> 0, object.rejectedSpans.high >>> 0).toNumber();
                            if (object.errorMessage != null)
                                message.errorMessage = String(object.errorMessage);
                            return message;
                        };
                        /**
                         * Creates a plain object from an ExportTracePartialSuccess message. Also converts values to other types if specified.
                         * @function toObject
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess
                         * @static
                         * @param {opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess} message ExportTracePartialSuccess
                         * @param {$protobuf.IConversionOptions} [options] Conversion options
                         * @returns {Object.<string,*>} Plain object
                         */
                        ExportTracePartialSuccess.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.defaults) {
                                if ($util.Long) {
                                    var long = new $util.Long(0, 0, false);
                                    object.rejectedSpans = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                                }
                                else
                                    object.rejectedSpans = options.longs === String ? "0" : 0;
                                object.errorMessage = "";
                            }
                            if (message.rejectedSpans != null && message.hasOwnProperty("rejectedSpans"))
                                if (typeof message.rejectedSpans === "number")
                                    object.rejectedSpans = options.longs === String ? String(message.rejectedSpans) : message.rejectedSpans;
                                else
                                    object.rejectedSpans = options.longs === String ? $util.Long.prototype.toString.call(message.rejectedSpans) : options.longs === Number ? new $util.LongBits(message.rejectedSpans.low >>> 0, message.rejectedSpans.high >>> 0).toNumber() : message.rejectedSpans;
                            if (message.errorMessage != null && message.hasOwnProperty("errorMessage"))
                                object.errorMessage = message.errorMessage;
                            return object;
                        };
                        /**
                         * Converts this ExportTracePartialSuccess to JSON.
                         * @function toJSON
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess
                         * @instance
                         * @returns {Object.<string,*>} JSON object
                         */
                        ExportTracePartialSuccess.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };
                        /**
                         * Gets the default type url for ExportTracePartialSuccess
                         * @function getTypeUrl
                         * @memberof opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess
                         * @static
                         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns {string} The default type url
                         */
                        ExportTracePartialSuccess.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                            if (typeUrlPrefix === undefined) {
                                typeUrlPrefix = "type.googleapis.com";
                            }
                            return typeUrlPrefix + "/opentelemetry.proto.collector.trace.v1.ExportTracePartialSuccess";
                        };
                        return ExportTracePartialSuccess;
                    })();
                    return v1;
                })();
                return trace;
            })();
            collector.metrics = (function () {
                /**
                 * Namespace metrics.
                 * @memberof opentelemetry.proto.collector
                 * @namespace
                 */
                var metrics = {};
                metrics.v1 = (function () {
                    /**
                     * Namespace v1.
                     * @memberof opentelemetry.proto.collector.metrics
                     * @namespace
                     */
                    var v1 = {};
                    v1.MetricsService = (function () {
                        /**
                         * Constructs a new MetricsService service.
                         * @memberof opentelemetry.proto.collector.metrics.v1
                         * @classdesc Represents a MetricsService
                         * @extends $protobuf.rpc.Service
                         * @constructor
                         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
                         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
                         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
                         */
                        function MetricsService(rpcImpl, requestDelimited, responseDelimited) {
                            $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
                        }
                        (MetricsService.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = MetricsService;
                        /**
                         * Creates new MetricsService service using the specified rpc implementation.
                         * @function create
                         * @memberof opentelemetry.proto.collector.metrics.v1.MetricsService
                         * @static
                         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
                         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
                         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
                         * @returns {MetricsService} RPC service. Useful where requests and/or responses are streamed.
                         */
                        MetricsService.create = function create(rpcImpl, requestDelimited, responseDelimited) {
                            return new this(rpcImpl, requestDelimited, responseDelimited);
                        };
                        /**
                         * Callback as used by {@link opentelemetry.proto.collector.metrics.v1.MetricsService#export_}.
                         * @memberof opentelemetry.proto.collector.metrics.v1.MetricsService
                         * @typedef ExportCallback
                         * @type {function}
                         * @param {Error|null} error Error, if any
                         * @param {opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse} [response] ExportMetricsServiceResponse
                         */
                        /**
                         * Calls Export.
                         * @function export
                         * @memberof opentelemetry.proto.collector.metrics.v1.MetricsService
                         * @instance
                         * @param {opentelemetry.proto.collector.metrics.v1.IExportMetricsServiceRequest} request ExportMetricsServiceRequest message or plain object
                         * @param {opentelemetry.proto.collector.metrics.v1.MetricsService.ExportCallback} callback Node-style callback called with the error, if any, and ExportMetricsServiceResponse
                         * @returns {undefined}
                         * @variation 1
                         */
                        Object.defineProperty(MetricsService.prototype["export"] = function export_(request, callback) {
                            return this.rpcCall(export_, $root.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest, $root.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse, request, callback);
                        }, "name", { value: "Export" });
                        /**
                         * Calls Export.
                         * @function export
                         * @memberof opentelemetry.proto.collector.metrics.v1.MetricsService
                         * @instance
                         * @param {opentelemetry.proto.collector.metrics.v1.IExportMetricsServiceRequest} request ExportMetricsServiceRequest message or plain object
                         * @returns {Promise<opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse>} Promise
                         * @variation 2
                         */
                        return MetricsService;
                    })();
                    v1.ExportMetricsServiceRequest = (function () {
                        /**
                         * Properties of an ExportMetricsServiceRequest.
                         * @memberof opentelemetry.proto.collector.metrics.v1
                         * @interface IExportMetricsServiceRequest
                         * @property {Array.<opentelemetry.proto.metrics.v1.IResourceMetrics>|null} [resourceMetrics] ExportMetricsServiceRequest resourceMetrics
                         */
                        /**
                         * Constructs a new ExportMetricsServiceRequest.
                         * @memberof opentelemetry.proto.collector.metrics.v1
                         * @classdesc Represents an ExportMetricsServiceRequest.
                         * @implements IExportMetricsServiceRequest
                         * @constructor
                         * @param {opentelemetry.proto.collector.metrics.v1.IExportMetricsServiceRequest=} [properties] Properties to set
                         */
                        function ExportMetricsServiceRequest(properties) {
                            this.resourceMetrics = [];
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    if (properties[keys[i]] != null)
                                        this[keys[i]] = properties[keys[i]];
                        }
                        /**
                         * ExportMetricsServiceRequest resourceMetrics.
                         * @member {Array.<opentelemetry.proto.metrics.v1.IResourceMetrics>} resourceMetrics
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest
                         * @instance
                         */
                        ExportMetricsServiceRequest.prototype.resourceMetrics = $util.emptyArray;
                        /**
                         * Creates a new ExportMetricsServiceRequest instance using the specified properties.
                         * @function create
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest
                         * @static
                         * @param {opentelemetry.proto.collector.metrics.v1.IExportMetricsServiceRequest=} [properties] Properties to set
                         * @returns {opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest} ExportMetricsServiceRequest instance
                         */
                        ExportMetricsServiceRequest.create = function create(properties) {
                            return new ExportMetricsServiceRequest(properties);
                        };
                        /**
                         * Encodes the specified ExportMetricsServiceRequest message. Does not implicitly {@link opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest.verify|verify} messages.
                         * @function encode
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest
                         * @static
                         * @param {opentelemetry.proto.collector.metrics.v1.IExportMetricsServiceRequest} message ExportMetricsServiceRequest message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        ExportMetricsServiceRequest.encode = function encode(message, writer) {
                            if (!writer)
                                writer = $Writer.create();
                            if (message.resourceMetrics != null && message.resourceMetrics.length)
                                for (var i = 0; i < message.resourceMetrics.length; ++i)
                                    $root.opentelemetry.proto.metrics.v1.ResourceMetrics.encode(message.resourceMetrics[i], writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                            return writer;
                        };
                        /**
                         * Encodes the specified ExportMetricsServiceRequest message, length delimited. Does not implicitly {@link opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest.verify|verify} messages.
                         * @function encodeDelimited
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest
                         * @static
                         * @param {opentelemetry.proto.collector.metrics.v1.IExportMetricsServiceRequest} message ExportMetricsServiceRequest message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        ExportMetricsServiceRequest.encodeDelimited = function encodeDelimited(message, writer) {
                            return this.encode(message, writer).ldelim();
                        };
                        /**
                         * Decodes an ExportMetricsServiceRequest message from the specified reader or buffer.
                         * @function decode
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @param {number} [length] Message length if known beforehand
                         * @returns {opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest} ExportMetricsServiceRequest
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        ExportMetricsServiceRequest.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                    case 1: {
                                        if (!(message.resourceMetrics && message.resourceMetrics.length))
                                            message.resourceMetrics = [];
                                        message.resourceMetrics.push($root.opentelemetry.proto.metrics.v1.ResourceMetrics.decode(reader, reader.uint32()));
                                        break;
                                    }
                                    default:
                                        reader.skipType(tag & 7);
                                        break;
                                }
                            }
                            return message;
                        };
                        /**
                         * Decodes an ExportMetricsServiceRequest message from the specified reader or buffer, length delimited.
                         * @function decodeDelimited
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @returns {opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest} ExportMetricsServiceRequest
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        ExportMetricsServiceRequest.decodeDelimited = function decodeDelimited(reader) {
                            if (!(reader instanceof $Reader))
                                reader = new $Reader(reader);
                            return this.decode(reader, reader.uint32());
                        };
                        /**
                         * Verifies an ExportMetricsServiceRequest message.
                         * @function verify
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest
                         * @static
                         * @param {Object.<string,*>} message Plain object to verify
                         * @returns {string|null} `null` if valid, otherwise the reason why it is not
                         */
                        ExportMetricsServiceRequest.verify = function verify(message) {
                            if (typeof message !== "object" || message === null)
                                return "object expected";
                            if (message.resourceMetrics != null && message.hasOwnProperty("resourceMetrics")) {
                                if (!Array.isArray(message.resourceMetrics))
                                    return "resourceMetrics: array expected";
                                for (var i = 0; i < message.resourceMetrics.length; ++i) {
                                    var error = $root.opentelemetry.proto.metrics.v1.ResourceMetrics.verify(message.resourceMetrics[i]);
                                    if (error)
                                        return "resourceMetrics." + error;
                                }
                            }
                            return null;
                        };
                        /**
                         * Creates an ExportMetricsServiceRequest message from a plain object. Also converts values to their respective internal types.
                         * @function fromObject
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest
                         * @static
                         * @param {Object.<string,*>} object Plain object
                         * @returns {opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest} ExportMetricsServiceRequest
                         */
                        ExportMetricsServiceRequest.fromObject = function fromObject(object) {
                            if (object instanceof $root.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest)
                                return object;
                            var message = new $root.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest();
                            if (object.resourceMetrics) {
                                if (!Array.isArray(object.resourceMetrics))
                                    throw TypeError(".opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest.resourceMetrics: array expected");
                                message.resourceMetrics = [];
                                for (var i = 0; i < object.resourceMetrics.length; ++i) {
                                    if (typeof object.resourceMetrics[i] !== "object")
                                        throw TypeError(".opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest.resourceMetrics: object expected");
                                    message.resourceMetrics[i] = $root.opentelemetry.proto.metrics.v1.ResourceMetrics.fromObject(object.resourceMetrics[i]);
                                }
                            }
                            return message;
                        };
                        /**
                         * Creates a plain object from an ExportMetricsServiceRequest message. Also converts values to other types if specified.
                         * @function toObject
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest
                         * @static
                         * @param {opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest} message ExportMetricsServiceRequest
                         * @param {$protobuf.IConversionOptions} [options] Conversion options
                         * @returns {Object.<string,*>} Plain object
                         */
                        ExportMetricsServiceRequest.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.arrays || options.defaults)
                                object.resourceMetrics = [];
                            if (message.resourceMetrics && message.resourceMetrics.length) {
                                object.resourceMetrics = [];
                                for (var j = 0; j < message.resourceMetrics.length; ++j)
                                    object.resourceMetrics[j] = $root.opentelemetry.proto.metrics.v1.ResourceMetrics.toObject(message.resourceMetrics[j], options);
                            }
                            return object;
                        };
                        /**
                         * Converts this ExportMetricsServiceRequest to JSON.
                         * @function toJSON
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest
                         * @instance
                         * @returns {Object.<string,*>} JSON object
                         */
                        ExportMetricsServiceRequest.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };
                        /**
                         * Gets the default type url for ExportMetricsServiceRequest
                         * @function getTypeUrl
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest
                         * @static
                         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns {string} The default type url
                         */
                        ExportMetricsServiceRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                            if (typeUrlPrefix === undefined) {
                                typeUrlPrefix = "type.googleapis.com";
                            }
                            return typeUrlPrefix + "/opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest";
                        };
                        return ExportMetricsServiceRequest;
                    })();
                    v1.ExportMetricsServiceResponse = (function () {
                        /**
                         * Properties of an ExportMetricsServiceResponse.
                         * @memberof opentelemetry.proto.collector.metrics.v1
                         * @interface IExportMetricsServiceResponse
                         * @property {opentelemetry.proto.collector.metrics.v1.IExportMetricsPartialSuccess|null} [partialSuccess] ExportMetricsServiceResponse partialSuccess
                         */
                        /**
                         * Constructs a new ExportMetricsServiceResponse.
                         * @memberof opentelemetry.proto.collector.metrics.v1
                         * @classdesc Represents an ExportMetricsServiceResponse.
                         * @implements IExportMetricsServiceResponse
                         * @constructor
                         * @param {opentelemetry.proto.collector.metrics.v1.IExportMetricsServiceResponse=} [properties] Properties to set
                         */
                        function ExportMetricsServiceResponse(properties) {
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    if (properties[keys[i]] != null)
                                        this[keys[i]] = properties[keys[i]];
                        }
                        /**
                         * ExportMetricsServiceResponse partialSuccess.
                         * @member {opentelemetry.proto.collector.metrics.v1.IExportMetricsPartialSuccess|null|undefined} partialSuccess
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse
                         * @instance
                         */
                        ExportMetricsServiceResponse.prototype.partialSuccess = null;
                        /**
                         * Creates a new ExportMetricsServiceResponse instance using the specified properties.
                         * @function create
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse
                         * @static
                         * @param {opentelemetry.proto.collector.metrics.v1.IExportMetricsServiceResponse=} [properties] Properties to set
                         * @returns {opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse} ExportMetricsServiceResponse instance
                         */
                        ExportMetricsServiceResponse.create = function create(properties) {
                            return new ExportMetricsServiceResponse(properties);
                        };
                        /**
                         * Encodes the specified ExportMetricsServiceResponse message. Does not implicitly {@link opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse.verify|verify} messages.
                         * @function encode
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse
                         * @static
                         * @param {opentelemetry.proto.collector.metrics.v1.IExportMetricsServiceResponse} message ExportMetricsServiceResponse message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        ExportMetricsServiceResponse.encode = function encode(message, writer) {
                            if (!writer)
                                writer = $Writer.create();
                            if (message.partialSuccess != null && Object.hasOwnProperty.call(message, "partialSuccess"))
                                $root.opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess.encode(message.partialSuccess, writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                            return writer;
                        };
                        /**
                         * Encodes the specified ExportMetricsServiceResponse message, length delimited. Does not implicitly {@link opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse.verify|verify} messages.
                         * @function encodeDelimited
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse
                         * @static
                         * @param {opentelemetry.proto.collector.metrics.v1.IExportMetricsServiceResponse} message ExportMetricsServiceResponse message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        ExportMetricsServiceResponse.encodeDelimited = function encodeDelimited(message, writer) {
                            return this.encode(message, writer).ldelim();
                        };
                        /**
                         * Decodes an ExportMetricsServiceResponse message from the specified reader or buffer.
                         * @function decode
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @param {number} [length] Message length if known beforehand
                         * @returns {opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse} ExportMetricsServiceResponse
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        ExportMetricsServiceResponse.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                    case 1: {
                                        message.partialSuccess = $root.opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess.decode(reader, reader.uint32());
                                        break;
                                    }
                                    default:
                                        reader.skipType(tag & 7);
                                        break;
                                }
                            }
                            return message;
                        };
                        /**
                         * Decodes an ExportMetricsServiceResponse message from the specified reader or buffer, length delimited.
                         * @function decodeDelimited
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @returns {opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse} ExportMetricsServiceResponse
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        ExportMetricsServiceResponse.decodeDelimited = function decodeDelimited(reader) {
                            if (!(reader instanceof $Reader))
                                reader = new $Reader(reader);
                            return this.decode(reader, reader.uint32());
                        };
                        /**
                         * Verifies an ExportMetricsServiceResponse message.
                         * @function verify
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse
                         * @static
                         * @param {Object.<string,*>} message Plain object to verify
                         * @returns {string|null} `null` if valid, otherwise the reason why it is not
                         */
                        ExportMetricsServiceResponse.verify = function verify(message) {
                            if (typeof message !== "object" || message === null)
                                return "object expected";
                            if (message.partialSuccess != null && message.hasOwnProperty("partialSuccess")) {
                                var error = $root.opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess.verify(message.partialSuccess);
                                if (error)
                                    return "partialSuccess." + error;
                            }
                            return null;
                        };
                        /**
                         * Creates an ExportMetricsServiceResponse message from a plain object. Also converts values to their respective internal types.
                         * @function fromObject
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse
                         * @static
                         * @param {Object.<string,*>} object Plain object
                         * @returns {opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse} ExportMetricsServiceResponse
                         */
                        ExportMetricsServiceResponse.fromObject = function fromObject(object) {
                            if (object instanceof $root.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse)
                                return object;
                            var message = new $root.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse();
                            if (object.partialSuccess != null) {
                                if (typeof object.partialSuccess !== "object")
                                    throw TypeError(".opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse.partialSuccess: object expected");
                                message.partialSuccess = $root.opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess.fromObject(object.partialSuccess);
                            }
                            return message;
                        };
                        /**
                         * Creates a plain object from an ExportMetricsServiceResponse message. Also converts values to other types if specified.
                         * @function toObject
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse
                         * @static
                         * @param {opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse} message ExportMetricsServiceResponse
                         * @param {$protobuf.IConversionOptions} [options] Conversion options
                         * @returns {Object.<string,*>} Plain object
                         */
                        ExportMetricsServiceResponse.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.defaults)
                                object.partialSuccess = null;
                            if (message.partialSuccess != null && message.hasOwnProperty("partialSuccess"))
                                object.partialSuccess = $root.opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess.toObject(message.partialSuccess, options);
                            return object;
                        };
                        /**
                         * Converts this ExportMetricsServiceResponse to JSON.
                         * @function toJSON
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse
                         * @instance
                         * @returns {Object.<string,*>} JSON object
                         */
                        ExportMetricsServiceResponse.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };
                        /**
                         * Gets the default type url for ExportMetricsServiceResponse
                         * @function getTypeUrl
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse
                         * @static
                         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns {string} The default type url
                         */
                        ExportMetricsServiceResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                            if (typeUrlPrefix === undefined) {
                                typeUrlPrefix = "type.googleapis.com";
                            }
                            return typeUrlPrefix + "/opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceResponse";
                        };
                        return ExportMetricsServiceResponse;
                    })();
                    v1.ExportMetricsPartialSuccess = (function () {
                        /**
                         * Properties of an ExportMetricsPartialSuccess.
                         * @memberof opentelemetry.proto.collector.metrics.v1
                         * @interface IExportMetricsPartialSuccess
                         * @property {number|Long|null} [rejectedDataPoints] ExportMetricsPartialSuccess rejectedDataPoints
                         * @property {string|null} [errorMessage] ExportMetricsPartialSuccess errorMessage
                         */
                        /**
                         * Constructs a new ExportMetricsPartialSuccess.
                         * @memberof opentelemetry.proto.collector.metrics.v1
                         * @classdesc Represents an ExportMetricsPartialSuccess.
                         * @implements IExportMetricsPartialSuccess
                         * @constructor
                         * @param {opentelemetry.proto.collector.metrics.v1.IExportMetricsPartialSuccess=} [properties] Properties to set
                         */
                        function ExportMetricsPartialSuccess(properties) {
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    if (properties[keys[i]] != null)
                                        this[keys[i]] = properties[keys[i]];
                        }
                        /**
                         * ExportMetricsPartialSuccess rejectedDataPoints.
                         * @member {number|Long|null|undefined} rejectedDataPoints
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess
                         * @instance
                         */
                        ExportMetricsPartialSuccess.prototype.rejectedDataPoints = null;
                        /**
                         * ExportMetricsPartialSuccess errorMessage.
                         * @member {string|null|undefined} errorMessage
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess
                         * @instance
                         */
                        ExportMetricsPartialSuccess.prototype.errorMessage = null;
                        /**
                         * Creates a new ExportMetricsPartialSuccess instance using the specified properties.
                         * @function create
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess
                         * @static
                         * @param {opentelemetry.proto.collector.metrics.v1.IExportMetricsPartialSuccess=} [properties] Properties to set
                         * @returns {opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess} ExportMetricsPartialSuccess instance
                         */
                        ExportMetricsPartialSuccess.create = function create(properties) {
                            return new ExportMetricsPartialSuccess(properties);
                        };
                        /**
                         * Encodes the specified ExportMetricsPartialSuccess message. Does not implicitly {@link opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess.verify|verify} messages.
                         * @function encode
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess
                         * @static
                         * @param {opentelemetry.proto.collector.metrics.v1.IExportMetricsPartialSuccess} message ExportMetricsPartialSuccess message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        ExportMetricsPartialSuccess.encode = function encode(message, writer) {
                            if (!writer)
                                writer = $Writer.create();
                            if (message.rejectedDataPoints != null && Object.hasOwnProperty.call(message, "rejectedDataPoints"))
                                writer.uint32(/* id 1, wireType 0 =*/ 8).int64(message.rejectedDataPoints);
                            if (message.errorMessage != null && Object.hasOwnProperty.call(message, "errorMessage"))
                                writer.uint32(/* id 2, wireType 2 =*/ 18).string(message.errorMessage);
                            return writer;
                        };
                        /**
                         * Encodes the specified ExportMetricsPartialSuccess message, length delimited. Does not implicitly {@link opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess.verify|verify} messages.
                         * @function encodeDelimited
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess
                         * @static
                         * @param {opentelemetry.proto.collector.metrics.v1.IExportMetricsPartialSuccess} message ExportMetricsPartialSuccess message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        ExportMetricsPartialSuccess.encodeDelimited = function encodeDelimited(message, writer) {
                            return this.encode(message, writer).ldelim();
                        };
                        /**
                         * Decodes an ExportMetricsPartialSuccess message from the specified reader or buffer.
                         * @function decode
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @param {number} [length] Message length if known beforehand
                         * @returns {opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess} ExportMetricsPartialSuccess
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        ExportMetricsPartialSuccess.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                    case 1: {
                                        message.rejectedDataPoints = reader.int64();
                                        break;
                                    }
                                    case 2: {
                                        message.errorMessage = reader.string();
                                        break;
                                    }
                                    default:
                                        reader.skipType(tag & 7);
                                        break;
                                }
                            }
                            return message;
                        };
                        /**
                         * Decodes an ExportMetricsPartialSuccess message from the specified reader or buffer, length delimited.
                         * @function decodeDelimited
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @returns {opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess} ExportMetricsPartialSuccess
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        ExportMetricsPartialSuccess.decodeDelimited = function decodeDelimited(reader) {
                            if (!(reader instanceof $Reader))
                                reader = new $Reader(reader);
                            return this.decode(reader, reader.uint32());
                        };
                        /**
                         * Verifies an ExportMetricsPartialSuccess message.
                         * @function verify
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess
                         * @static
                         * @param {Object.<string,*>} message Plain object to verify
                         * @returns {string|null} `null` if valid, otherwise the reason why it is not
                         */
                        ExportMetricsPartialSuccess.verify = function verify(message) {
                            if (typeof message !== "object" || message === null)
                                return "object expected";
                            if (message.rejectedDataPoints != null && message.hasOwnProperty("rejectedDataPoints"))
                                if (!$util.isInteger(message.rejectedDataPoints) && !(message.rejectedDataPoints && $util.isInteger(message.rejectedDataPoints.low) && $util.isInteger(message.rejectedDataPoints.high)))
                                    return "rejectedDataPoints: integer|Long expected";
                            if (message.errorMessage != null && message.hasOwnProperty("errorMessage"))
                                if (!$util.isString(message.errorMessage))
                                    return "errorMessage: string expected";
                            return null;
                        };
                        /**
                         * Creates an ExportMetricsPartialSuccess message from a plain object. Also converts values to their respective internal types.
                         * @function fromObject
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess
                         * @static
                         * @param {Object.<string,*>} object Plain object
                         * @returns {opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess} ExportMetricsPartialSuccess
                         */
                        ExportMetricsPartialSuccess.fromObject = function fromObject(object) {
                            if (object instanceof $root.opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess)
                                return object;
                            var message = new $root.opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess();
                            if (object.rejectedDataPoints != null)
                                if ($util.Long)
                                    (message.rejectedDataPoints = $util.Long.fromValue(object.rejectedDataPoints)).unsigned = false;
                                else if (typeof object.rejectedDataPoints === "string")
                                    message.rejectedDataPoints = parseInt(object.rejectedDataPoints, 10);
                                else if (typeof object.rejectedDataPoints === "number")
                                    message.rejectedDataPoints = object.rejectedDataPoints;
                                else if (typeof object.rejectedDataPoints === "object")
                                    message.rejectedDataPoints = new $util.LongBits(object.rejectedDataPoints.low >>> 0, object.rejectedDataPoints.high >>> 0).toNumber();
                            if (object.errorMessage != null)
                                message.errorMessage = String(object.errorMessage);
                            return message;
                        };
                        /**
                         * Creates a plain object from an ExportMetricsPartialSuccess message. Also converts values to other types if specified.
                         * @function toObject
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess
                         * @static
                         * @param {opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess} message ExportMetricsPartialSuccess
                         * @param {$protobuf.IConversionOptions} [options] Conversion options
                         * @returns {Object.<string,*>} Plain object
                         */
                        ExportMetricsPartialSuccess.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.defaults) {
                                if ($util.Long) {
                                    var long = new $util.Long(0, 0, false);
                                    object.rejectedDataPoints = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                                }
                                else
                                    object.rejectedDataPoints = options.longs === String ? "0" : 0;
                                object.errorMessage = "";
                            }
                            if (message.rejectedDataPoints != null && message.hasOwnProperty("rejectedDataPoints"))
                                if (typeof message.rejectedDataPoints === "number")
                                    object.rejectedDataPoints = options.longs === String ? String(message.rejectedDataPoints) : message.rejectedDataPoints;
                                else
                                    object.rejectedDataPoints = options.longs === String ? $util.Long.prototype.toString.call(message.rejectedDataPoints) : options.longs === Number ? new $util.LongBits(message.rejectedDataPoints.low >>> 0, message.rejectedDataPoints.high >>> 0).toNumber() : message.rejectedDataPoints;
                            if (message.errorMessage != null && message.hasOwnProperty("errorMessage"))
                                object.errorMessage = message.errorMessage;
                            return object;
                        };
                        /**
                         * Converts this ExportMetricsPartialSuccess to JSON.
                         * @function toJSON
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess
                         * @instance
                         * @returns {Object.<string,*>} JSON object
                         */
                        ExportMetricsPartialSuccess.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };
                        /**
                         * Gets the default type url for ExportMetricsPartialSuccess
                         * @function getTypeUrl
                         * @memberof opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess
                         * @static
                         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns {string} The default type url
                         */
                        ExportMetricsPartialSuccess.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                            if (typeUrlPrefix === undefined) {
                                typeUrlPrefix = "type.googleapis.com";
                            }
                            return typeUrlPrefix + "/opentelemetry.proto.collector.metrics.v1.ExportMetricsPartialSuccess";
                        };
                        return ExportMetricsPartialSuccess;
                    })();
                    return v1;
                })();
                return metrics;
            })();
            collector.logs = (function () {
                /**
                 * Namespace logs.
                 * @memberof opentelemetry.proto.collector
                 * @namespace
                 */
                var logs = {};
                logs.v1 = (function () {
                    /**
                     * Namespace v1.
                     * @memberof opentelemetry.proto.collector.logs
                     * @namespace
                     */
                    var v1 = {};
                    v1.LogsService = (function () {
                        /**
                         * Constructs a new LogsService service.
                         * @memberof opentelemetry.proto.collector.logs.v1
                         * @classdesc Represents a LogsService
                         * @extends $protobuf.rpc.Service
                         * @constructor
                         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
                         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
                         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
                         */
                        function LogsService(rpcImpl, requestDelimited, responseDelimited) {
                            $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
                        }
                        (LogsService.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = LogsService;
                        /**
                         * Creates new LogsService service using the specified rpc implementation.
                         * @function create
                         * @memberof opentelemetry.proto.collector.logs.v1.LogsService
                         * @static
                         * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
                         * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
                         * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
                         * @returns {LogsService} RPC service. Useful where requests and/or responses are streamed.
                         */
                        LogsService.create = function create(rpcImpl, requestDelimited, responseDelimited) {
                            return new this(rpcImpl, requestDelimited, responseDelimited);
                        };
                        /**
                         * Callback as used by {@link opentelemetry.proto.collector.logs.v1.LogsService#export_}.
                         * @memberof opentelemetry.proto.collector.logs.v1.LogsService
                         * @typedef ExportCallback
                         * @type {function}
                         * @param {Error|null} error Error, if any
                         * @param {opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse} [response] ExportLogsServiceResponse
                         */
                        /**
                         * Calls Export.
                         * @function export
                         * @memberof opentelemetry.proto.collector.logs.v1.LogsService
                         * @instance
                         * @param {opentelemetry.proto.collector.logs.v1.IExportLogsServiceRequest} request ExportLogsServiceRequest message or plain object
                         * @param {opentelemetry.proto.collector.logs.v1.LogsService.ExportCallback} callback Node-style callback called with the error, if any, and ExportLogsServiceResponse
                         * @returns {undefined}
                         * @variation 1
                         */
                        Object.defineProperty(LogsService.prototype["export"] = function export_(request, callback) {
                            return this.rpcCall(export_, $root.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest, $root.opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse, request, callback);
                        }, "name", { value: "Export" });
                        /**
                         * Calls Export.
                         * @function export
                         * @memberof opentelemetry.proto.collector.logs.v1.LogsService
                         * @instance
                         * @param {opentelemetry.proto.collector.logs.v1.IExportLogsServiceRequest} request ExportLogsServiceRequest message or plain object
                         * @returns {Promise<opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse>} Promise
                         * @variation 2
                         */
                        return LogsService;
                    })();
                    v1.ExportLogsServiceRequest = (function () {
                        /**
                         * Properties of an ExportLogsServiceRequest.
                         * @memberof opentelemetry.proto.collector.logs.v1
                         * @interface IExportLogsServiceRequest
                         * @property {Array.<opentelemetry.proto.logs.v1.IResourceLogs>|null} [resourceLogs] ExportLogsServiceRequest resourceLogs
                         */
                        /**
                         * Constructs a new ExportLogsServiceRequest.
                         * @memberof opentelemetry.proto.collector.logs.v1
                         * @classdesc Represents an ExportLogsServiceRequest.
                         * @implements IExportLogsServiceRequest
                         * @constructor
                         * @param {opentelemetry.proto.collector.logs.v1.IExportLogsServiceRequest=} [properties] Properties to set
                         */
                        function ExportLogsServiceRequest(properties) {
                            this.resourceLogs = [];
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    if (properties[keys[i]] != null)
                                        this[keys[i]] = properties[keys[i]];
                        }
                        /**
                         * ExportLogsServiceRequest resourceLogs.
                         * @member {Array.<opentelemetry.proto.logs.v1.IResourceLogs>} resourceLogs
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest
                         * @instance
                         */
                        ExportLogsServiceRequest.prototype.resourceLogs = $util.emptyArray;
                        /**
                         * Creates a new ExportLogsServiceRequest instance using the specified properties.
                         * @function create
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest
                         * @static
                         * @param {opentelemetry.proto.collector.logs.v1.IExportLogsServiceRequest=} [properties] Properties to set
                         * @returns {opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest} ExportLogsServiceRequest instance
                         */
                        ExportLogsServiceRequest.create = function create(properties) {
                            return new ExportLogsServiceRequest(properties);
                        };
                        /**
                         * Encodes the specified ExportLogsServiceRequest message. Does not implicitly {@link opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest.verify|verify} messages.
                         * @function encode
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest
                         * @static
                         * @param {opentelemetry.proto.collector.logs.v1.IExportLogsServiceRequest} message ExportLogsServiceRequest message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        ExportLogsServiceRequest.encode = function encode(message, writer) {
                            if (!writer)
                                writer = $Writer.create();
                            if (message.resourceLogs != null && message.resourceLogs.length)
                                for (var i = 0; i < message.resourceLogs.length; ++i)
                                    $root.opentelemetry.proto.logs.v1.ResourceLogs.encode(message.resourceLogs[i], writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                            return writer;
                        };
                        /**
                         * Encodes the specified ExportLogsServiceRequest message, length delimited. Does not implicitly {@link opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest.verify|verify} messages.
                         * @function encodeDelimited
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest
                         * @static
                         * @param {opentelemetry.proto.collector.logs.v1.IExportLogsServiceRequest} message ExportLogsServiceRequest message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        ExportLogsServiceRequest.encodeDelimited = function encodeDelimited(message, writer) {
                            return this.encode(message, writer).ldelim();
                        };
                        /**
                         * Decodes an ExportLogsServiceRequest message from the specified reader or buffer.
                         * @function decode
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @param {number} [length] Message length if known beforehand
                         * @returns {opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest} ExportLogsServiceRequest
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        ExportLogsServiceRequest.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                    case 1: {
                                        if (!(message.resourceLogs && message.resourceLogs.length))
                                            message.resourceLogs = [];
                                        message.resourceLogs.push($root.opentelemetry.proto.logs.v1.ResourceLogs.decode(reader, reader.uint32()));
                                        break;
                                    }
                                    default:
                                        reader.skipType(tag & 7);
                                        break;
                                }
                            }
                            return message;
                        };
                        /**
                         * Decodes an ExportLogsServiceRequest message from the specified reader or buffer, length delimited.
                         * @function decodeDelimited
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @returns {opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest} ExportLogsServiceRequest
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        ExportLogsServiceRequest.decodeDelimited = function decodeDelimited(reader) {
                            if (!(reader instanceof $Reader))
                                reader = new $Reader(reader);
                            return this.decode(reader, reader.uint32());
                        };
                        /**
                         * Verifies an ExportLogsServiceRequest message.
                         * @function verify
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest
                         * @static
                         * @param {Object.<string,*>} message Plain object to verify
                         * @returns {string|null} `null` if valid, otherwise the reason why it is not
                         */
                        ExportLogsServiceRequest.verify = function verify(message) {
                            if (typeof message !== "object" || message === null)
                                return "object expected";
                            if (message.resourceLogs != null && message.hasOwnProperty("resourceLogs")) {
                                if (!Array.isArray(message.resourceLogs))
                                    return "resourceLogs: array expected";
                                for (var i = 0; i < message.resourceLogs.length; ++i) {
                                    var error = $root.opentelemetry.proto.logs.v1.ResourceLogs.verify(message.resourceLogs[i]);
                                    if (error)
                                        return "resourceLogs." + error;
                                }
                            }
                            return null;
                        };
                        /**
                         * Creates an ExportLogsServiceRequest message from a plain object. Also converts values to their respective internal types.
                         * @function fromObject
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest
                         * @static
                         * @param {Object.<string,*>} object Plain object
                         * @returns {opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest} ExportLogsServiceRequest
                         */
                        ExportLogsServiceRequest.fromObject = function fromObject(object) {
                            if (object instanceof $root.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest)
                                return object;
                            var message = new $root.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest();
                            if (object.resourceLogs) {
                                if (!Array.isArray(object.resourceLogs))
                                    throw TypeError(".opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest.resourceLogs: array expected");
                                message.resourceLogs = [];
                                for (var i = 0; i < object.resourceLogs.length; ++i) {
                                    if (typeof object.resourceLogs[i] !== "object")
                                        throw TypeError(".opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest.resourceLogs: object expected");
                                    message.resourceLogs[i] = $root.opentelemetry.proto.logs.v1.ResourceLogs.fromObject(object.resourceLogs[i]);
                                }
                            }
                            return message;
                        };
                        /**
                         * Creates a plain object from an ExportLogsServiceRequest message. Also converts values to other types if specified.
                         * @function toObject
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest
                         * @static
                         * @param {opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest} message ExportLogsServiceRequest
                         * @param {$protobuf.IConversionOptions} [options] Conversion options
                         * @returns {Object.<string,*>} Plain object
                         */
                        ExportLogsServiceRequest.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.arrays || options.defaults)
                                object.resourceLogs = [];
                            if (message.resourceLogs && message.resourceLogs.length) {
                                object.resourceLogs = [];
                                for (var j = 0; j < message.resourceLogs.length; ++j)
                                    object.resourceLogs[j] = $root.opentelemetry.proto.logs.v1.ResourceLogs.toObject(message.resourceLogs[j], options);
                            }
                            return object;
                        };
                        /**
                         * Converts this ExportLogsServiceRequest to JSON.
                         * @function toJSON
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest
                         * @instance
                         * @returns {Object.<string,*>} JSON object
                         */
                        ExportLogsServiceRequest.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };
                        /**
                         * Gets the default type url for ExportLogsServiceRequest
                         * @function getTypeUrl
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest
                         * @static
                         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns {string} The default type url
                         */
                        ExportLogsServiceRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                            if (typeUrlPrefix === undefined) {
                                typeUrlPrefix = "type.googleapis.com";
                            }
                            return typeUrlPrefix + "/opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest";
                        };
                        return ExportLogsServiceRequest;
                    })();
                    v1.ExportLogsServiceResponse = (function () {
                        /**
                         * Properties of an ExportLogsServiceResponse.
                         * @memberof opentelemetry.proto.collector.logs.v1
                         * @interface IExportLogsServiceResponse
                         * @property {opentelemetry.proto.collector.logs.v1.IExportLogsPartialSuccess|null} [partialSuccess] ExportLogsServiceResponse partialSuccess
                         */
                        /**
                         * Constructs a new ExportLogsServiceResponse.
                         * @memberof opentelemetry.proto.collector.logs.v1
                         * @classdesc Represents an ExportLogsServiceResponse.
                         * @implements IExportLogsServiceResponse
                         * @constructor
                         * @param {opentelemetry.proto.collector.logs.v1.IExportLogsServiceResponse=} [properties] Properties to set
                         */
                        function ExportLogsServiceResponse(properties) {
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    if (properties[keys[i]] != null)
                                        this[keys[i]] = properties[keys[i]];
                        }
                        /**
                         * ExportLogsServiceResponse partialSuccess.
                         * @member {opentelemetry.proto.collector.logs.v1.IExportLogsPartialSuccess|null|undefined} partialSuccess
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse
                         * @instance
                         */
                        ExportLogsServiceResponse.prototype.partialSuccess = null;
                        /**
                         * Creates a new ExportLogsServiceResponse instance using the specified properties.
                         * @function create
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse
                         * @static
                         * @param {opentelemetry.proto.collector.logs.v1.IExportLogsServiceResponse=} [properties] Properties to set
                         * @returns {opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse} ExportLogsServiceResponse instance
                         */
                        ExportLogsServiceResponse.create = function create(properties) {
                            return new ExportLogsServiceResponse(properties);
                        };
                        /**
                         * Encodes the specified ExportLogsServiceResponse message. Does not implicitly {@link opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse.verify|verify} messages.
                         * @function encode
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse
                         * @static
                         * @param {opentelemetry.proto.collector.logs.v1.IExportLogsServiceResponse} message ExportLogsServiceResponse message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        ExportLogsServiceResponse.encode = function encode(message, writer) {
                            if (!writer)
                                writer = $Writer.create();
                            if (message.partialSuccess != null && Object.hasOwnProperty.call(message, "partialSuccess"))
                                $root.opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess.encode(message.partialSuccess, writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                            return writer;
                        };
                        /**
                         * Encodes the specified ExportLogsServiceResponse message, length delimited. Does not implicitly {@link opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse.verify|verify} messages.
                         * @function encodeDelimited
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse
                         * @static
                         * @param {opentelemetry.proto.collector.logs.v1.IExportLogsServiceResponse} message ExportLogsServiceResponse message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        ExportLogsServiceResponse.encodeDelimited = function encodeDelimited(message, writer) {
                            return this.encode(message, writer).ldelim();
                        };
                        /**
                         * Decodes an ExportLogsServiceResponse message from the specified reader or buffer.
                         * @function decode
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @param {number} [length] Message length if known beforehand
                         * @returns {opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse} ExportLogsServiceResponse
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        ExportLogsServiceResponse.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                    case 1: {
                                        message.partialSuccess = $root.opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess.decode(reader, reader.uint32());
                                        break;
                                    }
                                    default:
                                        reader.skipType(tag & 7);
                                        break;
                                }
                            }
                            return message;
                        };
                        /**
                         * Decodes an ExportLogsServiceResponse message from the specified reader or buffer, length delimited.
                         * @function decodeDelimited
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @returns {opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse} ExportLogsServiceResponse
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        ExportLogsServiceResponse.decodeDelimited = function decodeDelimited(reader) {
                            if (!(reader instanceof $Reader))
                                reader = new $Reader(reader);
                            return this.decode(reader, reader.uint32());
                        };
                        /**
                         * Verifies an ExportLogsServiceResponse message.
                         * @function verify
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse
                         * @static
                         * @param {Object.<string,*>} message Plain object to verify
                         * @returns {string|null} `null` if valid, otherwise the reason why it is not
                         */
                        ExportLogsServiceResponse.verify = function verify(message) {
                            if (typeof message !== "object" || message === null)
                                return "object expected";
                            if (message.partialSuccess != null && message.hasOwnProperty("partialSuccess")) {
                                var error = $root.opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess.verify(message.partialSuccess);
                                if (error)
                                    return "partialSuccess." + error;
                            }
                            return null;
                        };
                        /**
                         * Creates an ExportLogsServiceResponse message from a plain object. Also converts values to their respective internal types.
                         * @function fromObject
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse
                         * @static
                         * @param {Object.<string,*>} object Plain object
                         * @returns {opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse} ExportLogsServiceResponse
                         */
                        ExportLogsServiceResponse.fromObject = function fromObject(object) {
                            if (object instanceof $root.opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse)
                                return object;
                            var message = new $root.opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse();
                            if (object.partialSuccess != null) {
                                if (typeof object.partialSuccess !== "object")
                                    throw TypeError(".opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse.partialSuccess: object expected");
                                message.partialSuccess = $root.opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess.fromObject(object.partialSuccess);
                            }
                            return message;
                        };
                        /**
                         * Creates a plain object from an ExportLogsServiceResponse message. Also converts values to other types if specified.
                         * @function toObject
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse
                         * @static
                         * @param {opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse} message ExportLogsServiceResponse
                         * @param {$protobuf.IConversionOptions} [options] Conversion options
                         * @returns {Object.<string,*>} Plain object
                         */
                        ExportLogsServiceResponse.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.defaults)
                                object.partialSuccess = null;
                            if (message.partialSuccess != null && message.hasOwnProperty("partialSuccess"))
                                object.partialSuccess = $root.opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess.toObject(message.partialSuccess, options);
                            return object;
                        };
                        /**
                         * Converts this ExportLogsServiceResponse to JSON.
                         * @function toJSON
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse
                         * @instance
                         * @returns {Object.<string,*>} JSON object
                         */
                        ExportLogsServiceResponse.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };
                        /**
                         * Gets the default type url for ExportLogsServiceResponse
                         * @function getTypeUrl
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse
                         * @static
                         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns {string} The default type url
                         */
                        ExportLogsServiceResponse.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                            if (typeUrlPrefix === undefined) {
                                typeUrlPrefix = "type.googleapis.com";
                            }
                            return typeUrlPrefix + "/opentelemetry.proto.collector.logs.v1.ExportLogsServiceResponse";
                        };
                        return ExportLogsServiceResponse;
                    })();
                    v1.ExportLogsPartialSuccess = (function () {
                        /**
                         * Properties of an ExportLogsPartialSuccess.
                         * @memberof opentelemetry.proto.collector.logs.v1
                         * @interface IExportLogsPartialSuccess
                         * @property {number|Long|null} [rejectedLogRecords] ExportLogsPartialSuccess rejectedLogRecords
                         * @property {string|null} [errorMessage] ExportLogsPartialSuccess errorMessage
                         */
                        /**
                         * Constructs a new ExportLogsPartialSuccess.
                         * @memberof opentelemetry.proto.collector.logs.v1
                         * @classdesc Represents an ExportLogsPartialSuccess.
                         * @implements IExportLogsPartialSuccess
                         * @constructor
                         * @param {opentelemetry.proto.collector.logs.v1.IExportLogsPartialSuccess=} [properties] Properties to set
                         */
                        function ExportLogsPartialSuccess(properties) {
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    if (properties[keys[i]] != null)
                                        this[keys[i]] = properties[keys[i]];
                        }
                        /**
                         * ExportLogsPartialSuccess rejectedLogRecords.
                         * @member {number|Long|null|undefined} rejectedLogRecords
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess
                         * @instance
                         */
                        ExportLogsPartialSuccess.prototype.rejectedLogRecords = null;
                        /**
                         * ExportLogsPartialSuccess errorMessage.
                         * @member {string|null|undefined} errorMessage
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess
                         * @instance
                         */
                        ExportLogsPartialSuccess.prototype.errorMessage = null;
                        /**
                         * Creates a new ExportLogsPartialSuccess instance using the specified properties.
                         * @function create
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess
                         * @static
                         * @param {opentelemetry.proto.collector.logs.v1.IExportLogsPartialSuccess=} [properties] Properties to set
                         * @returns {opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess} ExportLogsPartialSuccess instance
                         */
                        ExportLogsPartialSuccess.create = function create(properties) {
                            return new ExportLogsPartialSuccess(properties);
                        };
                        /**
                         * Encodes the specified ExportLogsPartialSuccess message. Does not implicitly {@link opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess.verify|verify} messages.
                         * @function encode
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess
                         * @static
                         * @param {opentelemetry.proto.collector.logs.v1.IExportLogsPartialSuccess} message ExportLogsPartialSuccess message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        ExportLogsPartialSuccess.encode = function encode(message, writer) {
                            if (!writer)
                                writer = $Writer.create();
                            if (message.rejectedLogRecords != null && Object.hasOwnProperty.call(message, "rejectedLogRecords"))
                                writer.uint32(/* id 1, wireType 0 =*/ 8).int64(message.rejectedLogRecords);
                            if (message.errorMessage != null && Object.hasOwnProperty.call(message, "errorMessage"))
                                writer.uint32(/* id 2, wireType 2 =*/ 18).string(message.errorMessage);
                            return writer;
                        };
                        /**
                         * Encodes the specified ExportLogsPartialSuccess message, length delimited. Does not implicitly {@link opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess.verify|verify} messages.
                         * @function encodeDelimited
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess
                         * @static
                         * @param {opentelemetry.proto.collector.logs.v1.IExportLogsPartialSuccess} message ExportLogsPartialSuccess message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        ExportLogsPartialSuccess.encodeDelimited = function encodeDelimited(message, writer) {
                            return this.encode(message, writer).ldelim();
                        };
                        /**
                         * Decodes an ExportLogsPartialSuccess message from the specified reader or buffer.
                         * @function decode
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @param {number} [length] Message length if known beforehand
                         * @returns {opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess} ExportLogsPartialSuccess
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        ExportLogsPartialSuccess.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                    case 1: {
                                        message.rejectedLogRecords = reader.int64();
                                        break;
                                    }
                                    case 2: {
                                        message.errorMessage = reader.string();
                                        break;
                                    }
                                    default:
                                        reader.skipType(tag & 7);
                                        break;
                                }
                            }
                            return message;
                        };
                        /**
                         * Decodes an ExportLogsPartialSuccess message from the specified reader or buffer, length delimited.
                         * @function decodeDelimited
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @returns {opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess} ExportLogsPartialSuccess
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        ExportLogsPartialSuccess.decodeDelimited = function decodeDelimited(reader) {
                            if (!(reader instanceof $Reader))
                                reader = new $Reader(reader);
                            return this.decode(reader, reader.uint32());
                        };
                        /**
                         * Verifies an ExportLogsPartialSuccess message.
                         * @function verify
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess
                         * @static
                         * @param {Object.<string,*>} message Plain object to verify
                         * @returns {string|null} `null` if valid, otherwise the reason why it is not
                         */
                        ExportLogsPartialSuccess.verify = function verify(message) {
                            if (typeof message !== "object" || message === null)
                                return "object expected";
                            if (message.rejectedLogRecords != null && message.hasOwnProperty("rejectedLogRecords"))
                                if (!$util.isInteger(message.rejectedLogRecords) && !(message.rejectedLogRecords && $util.isInteger(message.rejectedLogRecords.low) && $util.isInteger(message.rejectedLogRecords.high)))
                                    return "rejectedLogRecords: integer|Long expected";
                            if (message.errorMessage != null && message.hasOwnProperty("errorMessage"))
                                if (!$util.isString(message.errorMessage))
                                    return "errorMessage: string expected";
                            return null;
                        };
                        /**
                         * Creates an ExportLogsPartialSuccess message from a plain object. Also converts values to their respective internal types.
                         * @function fromObject
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess
                         * @static
                         * @param {Object.<string,*>} object Plain object
                         * @returns {opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess} ExportLogsPartialSuccess
                         */
                        ExportLogsPartialSuccess.fromObject = function fromObject(object) {
                            if (object instanceof $root.opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess)
                                return object;
                            var message = new $root.opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess();
                            if (object.rejectedLogRecords != null)
                                if ($util.Long)
                                    (message.rejectedLogRecords = $util.Long.fromValue(object.rejectedLogRecords)).unsigned = false;
                                else if (typeof object.rejectedLogRecords === "string")
                                    message.rejectedLogRecords = parseInt(object.rejectedLogRecords, 10);
                                else if (typeof object.rejectedLogRecords === "number")
                                    message.rejectedLogRecords = object.rejectedLogRecords;
                                else if (typeof object.rejectedLogRecords === "object")
                                    message.rejectedLogRecords = new $util.LongBits(object.rejectedLogRecords.low >>> 0, object.rejectedLogRecords.high >>> 0).toNumber();
                            if (object.errorMessage != null)
                                message.errorMessage = String(object.errorMessage);
                            return message;
                        };
                        /**
                         * Creates a plain object from an ExportLogsPartialSuccess message. Also converts values to other types if specified.
                         * @function toObject
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess
                         * @static
                         * @param {opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess} message ExportLogsPartialSuccess
                         * @param {$protobuf.IConversionOptions} [options] Conversion options
                         * @returns {Object.<string,*>} Plain object
                         */
                        ExportLogsPartialSuccess.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.defaults) {
                                if ($util.Long) {
                                    var long = new $util.Long(0, 0, false);
                                    object.rejectedLogRecords = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                                }
                                else
                                    object.rejectedLogRecords = options.longs === String ? "0" : 0;
                                object.errorMessage = "";
                            }
                            if (message.rejectedLogRecords != null && message.hasOwnProperty("rejectedLogRecords"))
                                if (typeof message.rejectedLogRecords === "number")
                                    object.rejectedLogRecords = options.longs === String ? String(message.rejectedLogRecords) : message.rejectedLogRecords;
                                else
                                    object.rejectedLogRecords = options.longs === String ? $util.Long.prototype.toString.call(message.rejectedLogRecords) : options.longs === Number ? new $util.LongBits(message.rejectedLogRecords.low >>> 0, message.rejectedLogRecords.high >>> 0).toNumber() : message.rejectedLogRecords;
                            if (message.errorMessage != null && message.hasOwnProperty("errorMessage"))
                                object.errorMessage = message.errorMessage;
                            return object;
                        };
                        /**
                         * Converts this ExportLogsPartialSuccess to JSON.
                         * @function toJSON
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess
                         * @instance
                         * @returns {Object.<string,*>} JSON object
                         */
                        ExportLogsPartialSuccess.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };
                        /**
                         * Gets the default type url for ExportLogsPartialSuccess
                         * @function getTypeUrl
                         * @memberof opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess
                         * @static
                         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns {string} The default type url
                         */
                        ExportLogsPartialSuccess.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                            if (typeUrlPrefix === undefined) {
                                typeUrlPrefix = "type.googleapis.com";
                            }
                            return typeUrlPrefix + "/opentelemetry.proto.collector.logs.v1.ExportLogsPartialSuccess";
                        };
                        return ExportLogsPartialSuccess;
                    })();
                    return v1;
                })();
                return logs;
            })();
            return collector;
        })();
        proto.metrics = (function () {
            /**
             * Namespace metrics.
             * @memberof opentelemetry.proto
             * @namespace
             */
            var metrics = {};
            metrics.v1 = (function () {
                /**
                 * Namespace v1.
                 * @memberof opentelemetry.proto.metrics
                 * @namespace
                 */
                var v1 = {};
                v1.MetricsData = (function () {
                    /**
                     * Properties of a MetricsData.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @interface IMetricsData
                     * @property {Array.<opentelemetry.proto.metrics.v1.IResourceMetrics>|null} [resourceMetrics] MetricsData resourceMetrics
                     */
                    /**
                     * Constructs a new MetricsData.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @classdesc Represents a MetricsData.
                     * @implements IMetricsData
                     * @constructor
                     * @param {opentelemetry.proto.metrics.v1.IMetricsData=} [properties] Properties to set
                     */
                    function MetricsData(properties) {
                        this.resourceMetrics = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * MetricsData resourceMetrics.
                     * @member {Array.<opentelemetry.proto.metrics.v1.IResourceMetrics>} resourceMetrics
                     * @memberof opentelemetry.proto.metrics.v1.MetricsData
                     * @instance
                     */
                    MetricsData.prototype.resourceMetrics = $util.emptyArray;
                    /**
                     * Creates a new MetricsData instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.metrics.v1.MetricsData
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IMetricsData=} [properties] Properties to set
                     * @returns {opentelemetry.proto.metrics.v1.MetricsData} MetricsData instance
                     */
                    MetricsData.create = function create(properties) {
                        return new MetricsData(properties);
                    };
                    /**
                     * Encodes the specified MetricsData message. Does not implicitly {@link opentelemetry.proto.metrics.v1.MetricsData.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.metrics.v1.MetricsData
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IMetricsData} message MetricsData message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    MetricsData.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.resourceMetrics != null && message.resourceMetrics.length)
                            for (var i = 0; i < message.resourceMetrics.length; ++i)
                                $root.opentelemetry.proto.metrics.v1.ResourceMetrics.encode(message.resourceMetrics[i], writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                        return writer;
                    };
                    /**
                     * Encodes the specified MetricsData message, length delimited. Does not implicitly {@link opentelemetry.proto.metrics.v1.MetricsData.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.MetricsData
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IMetricsData} message MetricsData message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    MetricsData.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a MetricsData message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.metrics.v1.MetricsData
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.metrics.v1.MetricsData} MetricsData
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    MetricsData.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.metrics.v1.MetricsData();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    if (!(message.resourceMetrics && message.resourceMetrics.length))
                                        message.resourceMetrics = [];
                                    message.resourceMetrics.push($root.opentelemetry.proto.metrics.v1.ResourceMetrics.decode(reader, reader.uint32()));
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a MetricsData message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.MetricsData
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.metrics.v1.MetricsData} MetricsData
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    MetricsData.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a MetricsData message.
                     * @function verify
                     * @memberof opentelemetry.proto.metrics.v1.MetricsData
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    MetricsData.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.resourceMetrics != null && message.hasOwnProperty("resourceMetrics")) {
                            if (!Array.isArray(message.resourceMetrics))
                                return "resourceMetrics: array expected";
                            for (var i = 0; i < message.resourceMetrics.length; ++i) {
                                var error = $root.opentelemetry.proto.metrics.v1.ResourceMetrics.verify(message.resourceMetrics[i]);
                                if (error)
                                    return "resourceMetrics." + error;
                            }
                        }
                        return null;
                    };
                    /**
                     * Creates a MetricsData message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.metrics.v1.MetricsData
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.metrics.v1.MetricsData} MetricsData
                     */
                    MetricsData.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.metrics.v1.MetricsData)
                            return object;
                        var message = new $root.opentelemetry.proto.metrics.v1.MetricsData();
                        if (object.resourceMetrics) {
                            if (!Array.isArray(object.resourceMetrics))
                                throw TypeError(".opentelemetry.proto.metrics.v1.MetricsData.resourceMetrics: array expected");
                            message.resourceMetrics = [];
                            for (var i = 0; i < object.resourceMetrics.length; ++i) {
                                if (typeof object.resourceMetrics[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.metrics.v1.MetricsData.resourceMetrics: object expected");
                                message.resourceMetrics[i] = $root.opentelemetry.proto.metrics.v1.ResourceMetrics.fromObject(object.resourceMetrics[i]);
                            }
                        }
                        return message;
                    };
                    /**
                     * Creates a plain object from a MetricsData message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.metrics.v1.MetricsData
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.MetricsData} message MetricsData
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    MetricsData.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.resourceMetrics = [];
                        if (message.resourceMetrics && message.resourceMetrics.length) {
                            object.resourceMetrics = [];
                            for (var j = 0; j < message.resourceMetrics.length; ++j)
                                object.resourceMetrics[j] = $root.opentelemetry.proto.metrics.v1.ResourceMetrics.toObject(message.resourceMetrics[j], options);
                        }
                        return object;
                    };
                    /**
                     * Converts this MetricsData to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.metrics.v1.MetricsData
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    MetricsData.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for MetricsData
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.metrics.v1.MetricsData
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    MetricsData.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.metrics.v1.MetricsData";
                    };
                    return MetricsData;
                })();
                v1.ResourceMetrics = (function () {
                    /**
                     * Properties of a ResourceMetrics.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @interface IResourceMetrics
                     * @property {opentelemetry.proto.resource.v1.IResource|null} [resource] ResourceMetrics resource
                     * @property {Array.<opentelemetry.proto.metrics.v1.IScopeMetrics>|null} [scopeMetrics] ResourceMetrics scopeMetrics
                     * @property {string|null} [schemaUrl] ResourceMetrics schemaUrl
                     */
                    /**
                     * Constructs a new ResourceMetrics.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @classdesc Represents a ResourceMetrics.
                     * @implements IResourceMetrics
                     * @constructor
                     * @param {opentelemetry.proto.metrics.v1.IResourceMetrics=} [properties] Properties to set
                     */
                    function ResourceMetrics(properties) {
                        this.scopeMetrics = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * ResourceMetrics resource.
                     * @member {opentelemetry.proto.resource.v1.IResource|null|undefined} resource
                     * @memberof opentelemetry.proto.metrics.v1.ResourceMetrics
                     * @instance
                     */
                    ResourceMetrics.prototype.resource = null;
                    /**
                     * ResourceMetrics scopeMetrics.
                     * @member {Array.<opentelemetry.proto.metrics.v1.IScopeMetrics>} scopeMetrics
                     * @memberof opentelemetry.proto.metrics.v1.ResourceMetrics
                     * @instance
                     */
                    ResourceMetrics.prototype.scopeMetrics = $util.emptyArray;
                    /**
                     * ResourceMetrics schemaUrl.
                     * @member {string|null|undefined} schemaUrl
                     * @memberof opentelemetry.proto.metrics.v1.ResourceMetrics
                     * @instance
                     */
                    ResourceMetrics.prototype.schemaUrl = null;
                    /**
                     * Creates a new ResourceMetrics instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.metrics.v1.ResourceMetrics
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IResourceMetrics=} [properties] Properties to set
                     * @returns {opentelemetry.proto.metrics.v1.ResourceMetrics} ResourceMetrics instance
                     */
                    ResourceMetrics.create = function create(properties) {
                        return new ResourceMetrics(properties);
                    };
                    /**
                     * Encodes the specified ResourceMetrics message. Does not implicitly {@link opentelemetry.proto.metrics.v1.ResourceMetrics.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.metrics.v1.ResourceMetrics
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IResourceMetrics} message ResourceMetrics message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    ResourceMetrics.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.resource != null && Object.hasOwnProperty.call(message, "resource"))
                            $root.opentelemetry.proto.resource.v1.Resource.encode(message.resource, writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                        if (message.scopeMetrics != null && message.scopeMetrics.length)
                            for (var i = 0; i < message.scopeMetrics.length; ++i)
                                $root.opentelemetry.proto.metrics.v1.ScopeMetrics.encode(message.scopeMetrics[i], writer.uint32(/* id 2, wireType 2 =*/ 18).fork()).ldelim();
                        if (message.schemaUrl != null && Object.hasOwnProperty.call(message, "schemaUrl"))
                            writer.uint32(/* id 3, wireType 2 =*/ 26).string(message.schemaUrl);
                        return writer;
                    };
                    /**
                     * Encodes the specified ResourceMetrics message, length delimited. Does not implicitly {@link opentelemetry.proto.metrics.v1.ResourceMetrics.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.ResourceMetrics
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IResourceMetrics} message ResourceMetrics message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    ResourceMetrics.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a ResourceMetrics message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.metrics.v1.ResourceMetrics
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.metrics.v1.ResourceMetrics} ResourceMetrics
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    ResourceMetrics.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.metrics.v1.ResourceMetrics();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    message.resource = $root.opentelemetry.proto.resource.v1.Resource.decode(reader, reader.uint32());
                                    break;
                                }
                                case 2: {
                                    if (!(message.scopeMetrics && message.scopeMetrics.length))
                                        message.scopeMetrics = [];
                                    message.scopeMetrics.push($root.opentelemetry.proto.metrics.v1.ScopeMetrics.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 3: {
                                    message.schemaUrl = reader.string();
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a ResourceMetrics message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.ResourceMetrics
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.metrics.v1.ResourceMetrics} ResourceMetrics
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    ResourceMetrics.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a ResourceMetrics message.
                     * @function verify
                     * @memberof opentelemetry.proto.metrics.v1.ResourceMetrics
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    ResourceMetrics.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.resource != null && message.hasOwnProperty("resource")) {
                            var error = $root.opentelemetry.proto.resource.v1.Resource.verify(message.resource);
                            if (error)
                                return "resource." + error;
                        }
                        if (message.scopeMetrics != null && message.hasOwnProperty("scopeMetrics")) {
                            if (!Array.isArray(message.scopeMetrics))
                                return "scopeMetrics: array expected";
                            for (var i = 0; i < message.scopeMetrics.length; ++i) {
                                var error = $root.opentelemetry.proto.metrics.v1.ScopeMetrics.verify(message.scopeMetrics[i]);
                                if (error)
                                    return "scopeMetrics." + error;
                            }
                        }
                        if (message.schemaUrl != null && message.hasOwnProperty("schemaUrl"))
                            if (!$util.isString(message.schemaUrl))
                                return "schemaUrl: string expected";
                        return null;
                    };
                    /**
                     * Creates a ResourceMetrics message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.metrics.v1.ResourceMetrics
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.metrics.v1.ResourceMetrics} ResourceMetrics
                     */
                    ResourceMetrics.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.metrics.v1.ResourceMetrics)
                            return object;
                        var message = new $root.opentelemetry.proto.metrics.v1.ResourceMetrics();
                        if (object.resource != null) {
                            if (typeof object.resource !== "object")
                                throw TypeError(".opentelemetry.proto.metrics.v1.ResourceMetrics.resource: object expected");
                            message.resource = $root.opentelemetry.proto.resource.v1.Resource.fromObject(object.resource);
                        }
                        if (object.scopeMetrics) {
                            if (!Array.isArray(object.scopeMetrics))
                                throw TypeError(".opentelemetry.proto.metrics.v1.ResourceMetrics.scopeMetrics: array expected");
                            message.scopeMetrics = [];
                            for (var i = 0; i < object.scopeMetrics.length; ++i) {
                                if (typeof object.scopeMetrics[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.metrics.v1.ResourceMetrics.scopeMetrics: object expected");
                                message.scopeMetrics[i] = $root.opentelemetry.proto.metrics.v1.ScopeMetrics.fromObject(object.scopeMetrics[i]);
                            }
                        }
                        if (object.schemaUrl != null)
                            message.schemaUrl = String(object.schemaUrl);
                        return message;
                    };
                    /**
                     * Creates a plain object from a ResourceMetrics message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.metrics.v1.ResourceMetrics
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.ResourceMetrics} message ResourceMetrics
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    ResourceMetrics.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.scopeMetrics = [];
                        if (options.defaults) {
                            object.resource = null;
                            object.schemaUrl = "";
                        }
                        if (message.resource != null && message.hasOwnProperty("resource"))
                            object.resource = $root.opentelemetry.proto.resource.v1.Resource.toObject(message.resource, options);
                        if (message.scopeMetrics && message.scopeMetrics.length) {
                            object.scopeMetrics = [];
                            for (var j = 0; j < message.scopeMetrics.length; ++j)
                                object.scopeMetrics[j] = $root.opentelemetry.proto.metrics.v1.ScopeMetrics.toObject(message.scopeMetrics[j], options);
                        }
                        if (message.schemaUrl != null && message.hasOwnProperty("schemaUrl"))
                            object.schemaUrl = message.schemaUrl;
                        return object;
                    };
                    /**
                     * Converts this ResourceMetrics to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.metrics.v1.ResourceMetrics
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    ResourceMetrics.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for ResourceMetrics
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.metrics.v1.ResourceMetrics
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    ResourceMetrics.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.metrics.v1.ResourceMetrics";
                    };
                    return ResourceMetrics;
                })();
                v1.ScopeMetrics = (function () {
                    /**
                     * Properties of a ScopeMetrics.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @interface IScopeMetrics
                     * @property {opentelemetry.proto.common.v1.IInstrumentationScope|null} [scope] ScopeMetrics scope
                     * @property {Array.<opentelemetry.proto.metrics.v1.IMetric>|null} [metrics] ScopeMetrics metrics
                     * @property {string|null} [schemaUrl] ScopeMetrics schemaUrl
                     */
                    /**
                     * Constructs a new ScopeMetrics.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @classdesc Represents a ScopeMetrics.
                     * @implements IScopeMetrics
                     * @constructor
                     * @param {opentelemetry.proto.metrics.v1.IScopeMetrics=} [properties] Properties to set
                     */
                    function ScopeMetrics(properties) {
                        this.metrics = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * ScopeMetrics scope.
                     * @member {opentelemetry.proto.common.v1.IInstrumentationScope|null|undefined} scope
                     * @memberof opentelemetry.proto.metrics.v1.ScopeMetrics
                     * @instance
                     */
                    ScopeMetrics.prototype.scope = null;
                    /**
                     * ScopeMetrics metrics.
                     * @member {Array.<opentelemetry.proto.metrics.v1.IMetric>} metrics
                     * @memberof opentelemetry.proto.metrics.v1.ScopeMetrics
                     * @instance
                     */
                    ScopeMetrics.prototype.metrics = $util.emptyArray;
                    /**
                     * ScopeMetrics schemaUrl.
                     * @member {string|null|undefined} schemaUrl
                     * @memberof opentelemetry.proto.metrics.v1.ScopeMetrics
                     * @instance
                     */
                    ScopeMetrics.prototype.schemaUrl = null;
                    /**
                     * Creates a new ScopeMetrics instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.metrics.v1.ScopeMetrics
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IScopeMetrics=} [properties] Properties to set
                     * @returns {opentelemetry.proto.metrics.v1.ScopeMetrics} ScopeMetrics instance
                     */
                    ScopeMetrics.create = function create(properties) {
                        return new ScopeMetrics(properties);
                    };
                    /**
                     * Encodes the specified ScopeMetrics message. Does not implicitly {@link opentelemetry.proto.metrics.v1.ScopeMetrics.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.metrics.v1.ScopeMetrics
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IScopeMetrics} message ScopeMetrics message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    ScopeMetrics.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.scope != null && Object.hasOwnProperty.call(message, "scope"))
                            $root.opentelemetry.proto.common.v1.InstrumentationScope.encode(message.scope, writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                        if (message.metrics != null && message.metrics.length)
                            for (var i = 0; i < message.metrics.length; ++i)
                                $root.opentelemetry.proto.metrics.v1.Metric.encode(message.metrics[i], writer.uint32(/* id 2, wireType 2 =*/ 18).fork()).ldelim();
                        if (message.schemaUrl != null && Object.hasOwnProperty.call(message, "schemaUrl"))
                            writer.uint32(/* id 3, wireType 2 =*/ 26).string(message.schemaUrl);
                        return writer;
                    };
                    /**
                     * Encodes the specified ScopeMetrics message, length delimited. Does not implicitly {@link opentelemetry.proto.metrics.v1.ScopeMetrics.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.ScopeMetrics
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IScopeMetrics} message ScopeMetrics message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    ScopeMetrics.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a ScopeMetrics message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.metrics.v1.ScopeMetrics
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.metrics.v1.ScopeMetrics} ScopeMetrics
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    ScopeMetrics.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.metrics.v1.ScopeMetrics();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    message.scope = $root.opentelemetry.proto.common.v1.InstrumentationScope.decode(reader, reader.uint32());
                                    break;
                                }
                                case 2: {
                                    if (!(message.metrics && message.metrics.length))
                                        message.metrics = [];
                                    message.metrics.push($root.opentelemetry.proto.metrics.v1.Metric.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 3: {
                                    message.schemaUrl = reader.string();
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a ScopeMetrics message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.ScopeMetrics
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.metrics.v1.ScopeMetrics} ScopeMetrics
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    ScopeMetrics.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a ScopeMetrics message.
                     * @function verify
                     * @memberof opentelemetry.proto.metrics.v1.ScopeMetrics
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    ScopeMetrics.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.scope != null && message.hasOwnProperty("scope")) {
                            var error = $root.opentelemetry.proto.common.v1.InstrumentationScope.verify(message.scope);
                            if (error)
                                return "scope." + error;
                        }
                        if (message.metrics != null && message.hasOwnProperty("metrics")) {
                            if (!Array.isArray(message.metrics))
                                return "metrics: array expected";
                            for (var i = 0; i < message.metrics.length; ++i) {
                                var error = $root.opentelemetry.proto.metrics.v1.Metric.verify(message.metrics[i]);
                                if (error)
                                    return "metrics." + error;
                            }
                        }
                        if (message.schemaUrl != null && message.hasOwnProperty("schemaUrl"))
                            if (!$util.isString(message.schemaUrl))
                                return "schemaUrl: string expected";
                        return null;
                    };
                    /**
                     * Creates a ScopeMetrics message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.metrics.v1.ScopeMetrics
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.metrics.v1.ScopeMetrics} ScopeMetrics
                     */
                    ScopeMetrics.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.metrics.v1.ScopeMetrics)
                            return object;
                        var message = new $root.opentelemetry.proto.metrics.v1.ScopeMetrics();
                        if (object.scope != null) {
                            if (typeof object.scope !== "object")
                                throw TypeError(".opentelemetry.proto.metrics.v1.ScopeMetrics.scope: object expected");
                            message.scope = $root.opentelemetry.proto.common.v1.InstrumentationScope.fromObject(object.scope);
                        }
                        if (object.metrics) {
                            if (!Array.isArray(object.metrics))
                                throw TypeError(".opentelemetry.proto.metrics.v1.ScopeMetrics.metrics: array expected");
                            message.metrics = [];
                            for (var i = 0; i < object.metrics.length; ++i) {
                                if (typeof object.metrics[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.metrics.v1.ScopeMetrics.metrics: object expected");
                                message.metrics[i] = $root.opentelemetry.proto.metrics.v1.Metric.fromObject(object.metrics[i]);
                            }
                        }
                        if (object.schemaUrl != null)
                            message.schemaUrl = String(object.schemaUrl);
                        return message;
                    };
                    /**
                     * Creates a plain object from a ScopeMetrics message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.metrics.v1.ScopeMetrics
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.ScopeMetrics} message ScopeMetrics
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    ScopeMetrics.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.metrics = [];
                        if (options.defaults) {
                            object.scope = null;
                            object.schemaUrl = "";
                        }
                        if (message.scope != null && message.hasOwnProperty("scope"))
                            object.scope = $root.opentelemetry.proto.common.v1.InstrumentationScope.toObject(message.scope, options);
                        if (message.metrics && message.metrics.length) {
                            object.metrics = [];
                            for (var j = 0; j < message.metrics.length; ++j)
                                object.metrics[j] = $root.opentelemetry.proto.metrics.v1.Metric.toObject(message.metrics[j], options);
                        }
                        if (message.schemaUrl != null && message.hasOwnProperty("schemaUrl"))
                            object.schemaUrl = message.schemaUrl;
                        return object;
                    };
                    /**
                     * Converts this ScopeMetrics to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.metrics.v1.ScopeMetrics
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    ScopeMetrics.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for ScopeMetrics
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.metrics.v1.ScopeMetrics
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    ScopeMetrics.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.metrics.v1.ScopeMetrics";
                    };
                    return ScopeMetrics;
                })();
                v1.Metric = (function () {
                    /**
                     * Properties of a Metric.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @interface IMetric
                     * @property {string|null} [name] Metric name
                     * @property {string|null} [description] Metric description
                     * @property {string|null} [unit] Metric unit
                     * @property {opentelemetry.proto.metrics.v1.IGauge|null} [gauge] Metric gauge
                     * @property {opentelemetry.proto.metrics.v1.ISum|null} [sum] Metric sum
                     * @property {opentelemetry.proto.metrics.v1.IHistogram|null} [histogram] Metric histogram
                     * @property {opentelemetry.proto.metrics.v1.IExponentialHistogram|null} [exponentialHistogram] Metric exponentialHistogram
                     * @property {opentelemetry.proto.metrics.v1.ISummary|null} [summary] Metric summary
                     */
                    /**
                     * Constructs a new Metric.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @classdesc Represents a Metric.
                     * @implements IMetric
                     * @constructor
                     * @param {opentelemetry.proto.metrics.v1.IMetric=} [properties] Properties to set
                     */
                    function Metric(properties) {
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * Metric name.
                     * @member {string|null|undefined} name
                     * @memberof opentelemetry.proto.metrics.v1.Metric
                     * @instance
                     */
                    Metric.prototype.name = null;
                    /**
                     * Metric description.
                     * @member {string|null|undefined} description
                     * @memberof opentelemetry.proto.metrics.v1.Metric
                     * @instance
                     */
                    Metric.prototype.description = null;
                    /**
                     * Metric unit.
                     * @member {string|null|undefined} unit
                     * @memberof opentelemetry.proto.metrics.v1.Metric
                     * @instance
                     */
                    Metric.prototype.unit = null;
                    /**
                     * Metric gauge.
                     * @member {opentelemetry.proto.metrics.v1.IGauge|null|undefined} gauge
                     * @memberof opentelemetry.proto.metrics.v1.Metric
                     * @instance
                     */
                    Metric.prototype.gauge = null;
                    /**
                     * Metric sum.
                     * @member {opentelemetry.proto.metrics.v1.ISum|null|undefined} sum
                     * @memberof opentelemetry.proto.metrics.v1.Metric
                     * @instance
                     */
                    Metric.prototype.sum = null;
                    /**
                     * Metric histogram.
                     * @member {opentelemetry.proto.metrics.v1.IHistogram|null|undefined} histogram
                     * @memberof opentelemetry.proto.metrics.v1.Metric
                     * @instance
                     */
                    Metric.prototype.histogram = null;
                    /**
                     * Metric exponentialHistogram.
                     * @member {opentelemetry.proto.metrics.v1.IExponentialHistogram|null|undefined} exponentialHistogram
                     * @memberof opentelemetry.proto.metrics.v1.Metric
                     * @instance
                     */
                    Metric.prototype.exponentialHistogram = null;
                    /**
                     * Metric summary.
                     * @member {opentelemetry.proto.metrics.v1.ISummary|null|undefined} summary
                     * @memberof opentelemetry.proto.metrics.v1.Metric
                     * @instance
                     */
                    Metric.prototype.summary = null;
                    // OneOf field names bound to virtual getters and setters
                    var $oneOfFields;
                    /**
                     * Metric data.
                     * @member {"gauge"|"sum"|"histogram"|"exponentialHistogram"|"summary"|undefined} data
                     * @memberof opentelemetry.proto.metrics.v1.Metric
                     * @instance
                     */
                    Object.defineProperty(Metric.prototype, "data", {
                        get: $util.oneOfGetter($oneOfFields = ["gauge", "sum", "histogram", "exponentialHistogram", "summary"]),
                        set: $util.oneOfSetter($oneOfFields)
                    });
                    /**
                     * Creates a new Metric instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.metrics.v1.Metric
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IMetric=} [properties] Properties to set
                     * @returns {opentelemetry.proto.metrics.v1.Metric} Metric instance
                     */
                    Metric.create = function create(properties) {
                        return new Metric(properties);
                    };
                    /**
                     * Encodes the specified Metric message. Does not implicitly {@link opentelemetry.proto.metrics.v1.Metric.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.metrics.v1.Metric
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IMetric} message Metric message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Metric.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                            writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.name);
                        if (message.description != null && Object.hasOwnProperty.call(message, "description"))
                            writer.uint32(/* id 2, wireType 2 =*/ 18).string(message.description);
                        if (message.unit != null && Object.hasOwnProperty.call(message, "unit"))
                            writer.uint32(/* id 3, wireType 2 =*/ 26).string(message.unit);
                        if (message.gauge != null && Object.hasOwnProperty.call(message, "gauge"))
                            $root.opentelemetry.proto.metrics.v1.Gauge.encode(message.gauge, writer.uint32(/* id 5, wireType 2 =*/ 42).fork()).ldelim();
                        if (message.sum != null && Object.hasOwnProperty.call(message, "sum"))
                            $root.opentelemetry.proto.metrics.v1.Sum.encode(message.sum, writer.uint32(/* id 7, wireType 2 =*/ 58).fork()).ldelim();
                        if (message.histogram != null && Object.hasOwnProperty.call(message, "histogram"))
                            $root.opentelemetry.proto.metrics.v1.Histogram.encode(message.histogram, writer.uint32(/* id 9, wireType 2 =*/ 74).fork()).ldelim();
                        if (message.exponentialHistogram != null && Object.hasOwnProperty.call(message, "exponentialHistogram"))
                            $root.opentelemetry.proto.metrics.v1.ExponentialHistogram.encode(message.exponentialHistogram, writer.uint32(/* id 10, wireType 2 =*/ 82).fork()).ldelim();
                        if (message.summary != null && Object.hasOwnProperty.call(message, "summary"))
                            $root.opentelemetry.proto.metrics.v1.Summary.encode(message.summary, writer.uint32(/* id 11, wireType 2 =*/ 90).fork()).ldelim();
                        return writer;
                    };
                    /**
                     * Encodes the specified Metric message, length delimited. Does not implicitly {@link opentelemetry.proto.metrics.v1.Metric.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.Metric
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IMetric} message Metric message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Metric.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a Metric message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.metrics.v1.Metric
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.metrics.v1.Metric} Metric
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Metric.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.metrics.v1.Metric();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    message.name = reader.string();
                                    break;
                                }
                                case 2: {
                                    message.description = reader.string();
                                    break;
                                }
                                case 3: {
                                    message.unit = reader.string();
                                    break;
                                }
                                case 5: {
                                    message.gauge = $root.opentelemetry.proto.metrics.v1.Gauge.decode(reader, reader.uint32());
                                    break;
                                }
                                case 7: {
                                    message.sum = $root.opentelemetry.proto.metrics.v1.Sum.decode(reader, reader.uint32());
                                    break;
                                }
                                case 9: {
                                    message.histogram = $root.opentelemetry.proto.metrics.v1.Histogram.decode(reader, reader.uint32());
                                    break;
                                }
                                case 10: {
                                    message.exponentialHistogram = $root.opentelemetry.proto.metrics.v1.ExponentialHistogram.decode(reader, reader.uint32());
                                    break;
                                }
                                case 11: {
                                    message.summary = $root.opentelemetry.proto.metrics.v1.Summary.decode(reader, reader.uint32());
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a Metric message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.Metric
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.metrics.v1.Metric} Metric
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Metric.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a Metric message.
                     * @function verify
                     * @memberof opentelemetry.proto.metrics.v1.Metric
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    Metric.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        var properties = {};
                        if (message.name != null && message.hasOwnProperty("name"))
                            if (!$util.isString(message.name))
                                return "name: string expected";
                        if (message.description != null && message.hasOwnProperty("description"))
                            if (!$util.isString(message.description))
                                return "description: string expected";
                        if (message.unit != null && message.hasOwnProperty("unit"))
                            if (!$util.isString(message.unit))
                                return "unit: string expected";
                        if (message.gauge != null && message.hasOwnProperty("gauge")) {
                            properties.data = 1;
                            {
                                var error = $root.opentelemetry.proto.metrics.v1.Gauge.verify(message.gauge);
                                if (error)
                                    return "gauge." + error;
                            }
                        }
                        if (message.sum != null && message.hasOwnProperty("sum")) {
                            if (properties.data === 1)
                                return "data: multiple values";
                            properties.data = 1;
                            {
                                var error = $root.opentelemetry.proto.metrics.v1.Sum.verify(message.sum);
                                if (error)
                                    return "sum." + error;
                            }
                        }
                        if (message.histogram != null && message.hasOwnProperty("histogram")) {
                            if (properties.data === 1)
                                return "data: multiple values";
                            properties.data = 1;
                            {
                                var error = $root.opentelemetry.proto.metrics.v1.Histogram.verify(message.histogram);
                                if (error)
                                    return "histogram." + error;
                            }
                        }
                        if (message.exponentialHistogram != null && message.hasOwnProperty("exponentialHistogram")) {
                            if (properties.data === 1)
                                return "data: multiple values";
                            properties.data = 1;
                            {
                                var error = $root.opentelemetry.proto.metrics.v1.ExponentialHistogram.verify(message.exponentialHistogram);
                                if (error)
                                    return "exponentialHistogram." + error;
                            }
                        }
                        if (message.summary != null && message.hasOwnProperty("summary")) {
                            if (properties.data === 1)
                                return "data: multiple values";
                            properties.data = 1;
                            {
                                var error = $root.opentelemetry.proto.metrics.v1.Summary.verify(message.summary);
                                if (error)
                                    return "summary." + error;
                            }
                        }
                        return null;
                    };
                    /**
                     * Creates a Metric message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.metrics.v1.Metric
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.metrics.v1.Metric} Metric
                     */
                    Metric.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.metrics.v1.Metric)
                            return object;
                        var message = new $root.opentelemetry.proto.metrics.v1.Metric();
                        if (object.name != null)
                            message.name = String(object.name);
                        if (object.description != null)
                            message.description = String(object.description);
                        if (object.unit != null)
                            message.unit = String(object.unit);
                        if (object.gauge != null) {
                            if (typeof object.gauge !== "object")
                                throw TypeError(".opentelemetry.proto.metrics.v1.Metric.gauge: object expected");
                            message.gauge = $root.opentelemetry.proto.metrics.v1.Gauge.fromObject(object.gauge);
                        }
                        if (object.sum != null) {
                            if (typeof object.sum !== "object")
                                throw TypeError(".opentelemetry.proto.metrics.v1.Metric.sum: object expected");
                            message.sum = $root.opentelemetry.proto.metrics.v1.Sum.fromObject(object.sum);
                        }
                        if (object.histogram != null) {
                            if (typeof object.histogram !== "object")
                                throw TypeError(".opentelemetry.proto.metrics.v1.Metric.histogram: object expected");
                            message.histogram = $root.opentelemetry.proto.metrics.v1.Histogram.fromObject(object.histogram);
                        }
                        if (object.exponentialHistogram != null) {
                            if (typeof object.exponentialHistogram !== "object")
                                throw TypeError(".opentelemetry.proto.metrics.v1.Metric.exponentialHistogram: object expected");
                            message.exponentialHistogram = $root.opentelemetry.proto.metrics.v1.ExponentialHistogram.fromObject(object.exponentialHistogram);
                        }
                        if (object.summary != null) {
                            if (typeof object.summary !== "object")
                                throw TypeError(".opentelemetry.proto.metrics.v1.Metric.summary: object expected");
                            message.summary = $root.opentelemetry.proto.metrics.v1.Summary.fromObject(object.summary);
                        }
                        return message;
                    };
                    /**
                     * Creates a plain object from a Metric message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.metrics.v1.Metric
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.Metric} message Metric
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    Metric.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.defaults) {
                            object.name = "";
                            object.description = "";
                            object.unit = "";
                        }
                        if (message.name != null && message.hasOwnProperty("name"))
                            object.name = message.name;
                        if (message.description != null && message.hasOwnProperty("description"))
                            object.description = message.description;
                        if (message.unit != null && message.hasOwnProperty("unit"))
                            object.unit = message.unit;
                        if (message.gauge != null && message.hasOwnProperty("gauge")) {
                            object.gauge = $root.opentelemetry.proto.metrics.v1.Gauge.toObject(message.gauge, options);
                            if (options.oneofs)
                                object.data = "gauge";
                        }
                        if (message.sum != null && message.hasOwnProperty("sum")) {
                            object.sum = $root.opentelemetry.proto.metrics.v1.Sum.toObject(message.sum, options);
                            if (options.oneofs)
                                object.data = "sum";
                        }
                        if (message.histogram != null && message.hasOwnProperty("histogram")) {
                            object.histogram = $root.opentelemetry.proto.metrics.v1.Histogram.toObject(message.histogram, options);
                            if (options.oneofs)
                                object.data = "histogram";
                        }
                        if (message.exponentialHistogram != null && message.hasOwnProperty("exponentialHistogram")) {
                            object.exponentialHistogram = $root.opentelemetry.proto.metrics.v1.ExponentialHistogram.toObject(message.exponentialHistogram, options);
                            if (options.oneofs)
                                object.data = "exponentialHistogram";
                        }
                        if (message.summary != null && message.hasOwnProperty("summary")) {
                            object.summary = $root.opentelemetry.proto.metrics.v1.Summary.toObject(message.summary, options);
                            if (options.oneofs)
                                object.data = "summary";
                        }
                        return object;
                    };
                    /**
                     * Converts this Metric to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.metrics.v1.Metric
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    Metric.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for Metric
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.metrics.v1.Metric
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    Metric.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.metrics.v1.Metric";
                    };
                    return Metric;
                })();
                v1.Gauge = (function () {
                    /**
                     * Properties of a Gauge.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @interface IGauge
                     * @property {Array.<opentelemetry.proto.metrics.v1.INumberDataPoint>|null} [dataPoints] Gauge dataPoints
                     */
                    /**
                     * Constructs a new Gauge.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @classdesc Represents a Gauge.
                     * @implements IGauge
                     * @constructor
                     * @param {opentelemetry.proto.metrics.v1.IGauge=} [properties] Properties to set
                     */
                    function Gauge(properties) {
                        this.dataPoints = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * Gauge dataPoints.
                     * @member {Array.<opentelemetry.proto.metrics.v1.INumberDataPoint>} dataPoints
                     * @memberof opentelemetry.proto.metrics.v1.Gauge
                     * @instance
                     */
                    Gauge.prototype.dataPoints = $util.emptyArray;
                    /**
                     * Creates a new Gauge instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.metrics.v1.Gauge
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IGauge=} [properties] Properties to set
                     * @returns {opentelemetry.proto.metrics.v1.Gauge} Gauge instance
                     */
                    Gauge.create = function create(properties) {
                        return new Gauge(properties);
                    };
                    /**
                     * Encodes the specified Gauge message. Does not implicitly {@link opentelemetry.proto.metrics.v1.Gauge.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.metrics.v1.Gauge
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IGauge} message Gauge message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Gauge.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.dataPoints != null && message.dataPoints.length)
                            for (var i = 0; i < message.dataPoints.length; ++i)
                                $root.opentelemetry.proto.metrics.v1.NumberDataPoint.encode(message.dataPoints[i], writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                        return writer;
                    };
                    /**
                     * Encodes the specified Gauge message, length delimited. Does not implicitly {@link opentelemetry.proto.metrics.v1.Gauge.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.Gauge
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IGauge} message Gauge message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Gauge.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a Gauge message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.metrics.v1.Gauge
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.metrics.v1.Gauge} Gauge
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Gauge.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.metrics.v1.Gauge();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    if (!(message.dataPoints && message.dataPoints.length))
                                        message.dataPoints = [];
                                    message.dataPoints.push($root.opentelemetry.proto.metrics.v1.NumberDataPoint.decode(reader, reader.uint32()));
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a Gauge message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.Gauge
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.metrics.v1.Gauge} Gauge
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Gauge.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a Gauge message.
                     * @function verify
                     * @memberof opentelemetry.proto.metrics.v1.Gauge
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    Gauge.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.dataPoints != null && message.hasOwnProperty("dataPoints")) {
                            if (!Array.isArray(message.dataPoints))
                                return "dataPoints: array expected";
                            for (var i = 0; i < message.dataPoints.length; ++i) {
                                var error = $root.opentelemetry.proto.metrics.v1.NumberDataPoint.verify(message.dataPoints[i]);
                                if (error)
                                    return "dataPoints." + error;
                            }
                        }
                        return null;
                    };
                    /**
                     * Creates a Gauge message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.metrics.v1.Gauge
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.metrics.v1.Gauge} Gauge
                     */
                    Gauge.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.metrics.v1.Gauge)
                            return object;
                        var message = new $root.opentelemetry.proto.metrics.v1.Gauge();
                        if (object.dataPoints) {
                            if (!Array.isArray(object.dataPoints))
                                throw TypeError(".opentelemetry.proto.metrics.v1.Gauge.dataPoints: array expected");
                            message.dataPoints = [];
                            for (var i = 0; i < object.dataPoints.length; ++i) {
                                if (typeof object.dataPoints[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.metrics.v1.Gauge.dataPoints: object expected");
                                message.dataPoints[i] = $root.opentelemetry.proto.metrics.v1.NumberDataPoint.fromObject(object.dataPoints[i]);
                            }
                        }
                        return message;
                    };
                    /**
                     * Creates a plain object from a Gauge message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.metrics.v1.Gauge
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.Gauge} message Gauge
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    Gauge.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.dataPoints = [];
                        if (message.dataPoints && message.dataPoints.length) {
                            object.dataPoints = [];
                            for (var j = 0; j < message.dataPoints.length; ++j)
                                object.dataPoints[j] = $root.opentelemetry.proto.metrics.v1.NumberDataPoint.toObject(message.dataPoints[j], options);
                        }
                        return object;
                    };
                    /**
                     * Converts this Gauge to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.metrics.v1.Gauge
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    Gauge.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for Gauge
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.metrics.v1.Gauge
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    Gauge.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.metrics.v1.Gauge";
                    };
                    return Gauge;
                })();
                v1.Sum = (function () {
                    /**
                     * Properties of a Sum.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @interface ISum
                     * @property {Array.<opentelemetry.proto.metrics.v1.INumberDataPoint>|null} [dataPoints] Sum dataPoints
                     * @property {opentelemetry.proto.metrics.v1.AggregationTemporality|null} [aggregationTemporality] Sum aggregationTemporality
                     * @property {boolean|null} [isMonotonic] Sum isMonotonic
                     */
                    /**
                     * Constructs a new Sum.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @classdesc Represents a Sum.
                     * @implements ISum
                     * @constructor
                     * @param {opentelemetry.proto.metrics.v1.ISum=} [properties] Properties to set
                     */
                    function Sum(properties) {
                        this.dataPoints = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * Sum dataPoints.
                     * @member {Array.<opentelemetry.proto.metrics.v1.INumberDataPoint>} dataPoints
                     * @memberof opentelemetry.proto.metrics.v1.Sum
                     * @instance
                     */
                    Sum.prototype.dataPoints = $util.emptyArray;
                    /**
                     * Sum aggregationTemporality.
                     * @member {opentelemetry.proto.metrics.v1.AggregationTemporality|null|undefined} aggregationTemporality
                     * @memberof opentelemetry.proto.metrics.v1.Sum
                     * @instance
                     */
                    Sum.prototype.aggregationTemporality = null;
                    /**
                     * Sum isMonotonic.
                     * @member {boolean|null|undefined} isMonotonic
                     * @memberof opentelemetry.proto.metrics.v1.Sum
                     * @instance
                     */
                    Sum.prototype.isMonotonic = null;
                    /**
                     * Creates a new Sum instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.metrics.v1.Sum
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.ISum=} [properties] Properties to set
                     * @returns {opentelemetry.proto.metrics.v1.Sum} Sum instance
                     */
                    Sum.create = function create(properties) {
                        return new Sum(properties);
                    };
                    /**
                     * Encodes the specified Sum message. Does not implicitly {@link opentelemetry.proto.metrics.v1.Sum.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.metrics.v1.Sum
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.ISum} message Sum message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Sum.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.dataPoints != null && message.dataPoints.length)
                            for (var i = 0; i < message.dataPoints.length; ++i)
                                $root.opentelemetry.proto.metrics.v1.NumberDataPoint.encode(message.dataPoints[i], writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                        if (message.aggregationTemporality != null && Object.hasOwnProperty.call(message, "aggregationTemporality"))
                            writer.uint32(/* id 2, wireType 0 =*/ 16).int32(message.aggregationTemporality);
                        if (message.isMonotonic != null && Object.hasOwnProperty.call(message, "isMonotonic"))
                            writer.uint32(/* id 3, wireType 0 =*/ 24).bool(message.isMonotonic);
                        return writer;
                    };
                    /**
                     * Encodes the specified Sum message, length delimited. Does not implicitly {@link opentelemetry.proto.metrics.v1.Sum.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.Sum
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.ISum} message Sum message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Sum.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a Sum message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.metrics.v1.Sum
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.metrics.v1.Sum} Sum
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Sum.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.metrics.v1.Sum();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    if (!(message.dataPoints && message.dataPoints.length))
                                        message.dataPoints = [];
                                    message.dataPoints.push($root.opentelemetry.proto.metrics.v1.NumberDataPoint.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 2: {
                                    message.aggregationTemporality = reader.int32();
                                    break;
                                }
                                case 3: {
                                    message.isMonotonic = reader.bool();
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a Sum message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.Sum
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.metrics.v1.Sum} Sum
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Sum.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a Sum message.
                     * @function verify
                     * @memberof opentelemetry.proto.metrics.v1.Sum
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    Sum.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.dataPoints != null && message.hasOwnProperty("dataPoints")) {
                            if (!Array.isArray(message.dataPoints))
                                return "dataPoints: array expected";
                            for (var i = 0; i < message.dataPoints.length; ++i) {
                                var error = $root.opentelemetry.proto.metrics.v1.NumberDataPoint.verify(message.dataPoints[i]);
                                if (error)
                                    return "dataPoints." + error;
                            }
                        }
                        if (message.aggregationTemporality != null && message.hasOwnProperty("aggregationTemporality"))
                            switch (message.aggregationTemporality) {
                                default:
                                    return "aggregationTemporality: enum value expected";
                                case 0:
                                case 1:
                                case 2:
                                    break;
                            }
                        if (message.isMonotonic != null && message.hasOwnProperty("isMonotonic"))
                            if (typeof message.isMonotonic !== "boolean")
                                return "isMonotonic: boolean expected";
                        return null;
                    };
                    /**
                     * Creates a Sum message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.metrics.v1.Sum
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.metrics.v1.Sum} Sum
                     */
                    Sum.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.metrics.v1.Sum)
                            return object;
                        var message = new $root.opentelemetry.proto.metrics.v1.Sum();
                        if (object.dataPoints) {
                            if (!Array.isArray(object.dataPoints))
                                throw TypeError(".opentelemetry.proto.metrics.v1.Sum.dataPoints: array expected");
                            message.dataPoints = [];
                            for (var i = 0; i < object.dataPoints.length; ++i) {
                                if (typeof object.dataPoints[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.metrics.v1.Sum.dataPoints: object expected");
                                message.dataPoints[i] = $root.opentelemetry.proto.metrics.v1.NumberDataPoint.fromObject(object.dataPoints[i]);
                            }
                        }
                        switch (object.aggregationTemporality) {
                            default:
                                if (typeof object.aggregationTemporality === "number") {
                                    message.aggregationTemporality = object.aggregationTemporality;
                                    break;
                                }
                                break;
                            case "AGGREGATION_TEMPORALITY_UNSPECIFIED":
                            case 0:
                                message.aggregationTemporality = 0;
                                break;
                            case "AGGREGATION_TEMPORALITY_DELTA":
                            case 1:
                                message.aggregationTemporality = 1;
                                break;
                            case "AGGREGATION_TEMPORALITY_CUMULATIVE":
                            case 2:
                                message.aggregationTemporality = 2;
                                break;
                        }
                        if (object.isMonotonic != null)
                            message.isMonotonic = Boolean(object.isMonotonic);
                        return message;
                    };
                    /**
                     * Creates a plain object from a Sum message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.metrics.v1.Sum
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.Sum} message Sum
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    Sum.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.dataPoints = [];
                        if (options.defaults) {
                            object.aggregationTemporality = options.enums === String ? "AGGREGATION_TEMPORALITY_UNSPECIFIED" : 0;
                            object.isMonotonic = false;
                        }
                        if (message.dataPoints && message.dataPoints.length) {
                            object.dataPoints = [];
                            for (var j = 0; j < message.dataPoints.length; ++j)
                                object.dataPoints[j] = $root.opentelemetry.proto.metrics.v1.NumberDataPoint.toObject(message.dataPoints[j], options);
                        }
                        if (message.aggregationTemporality != null && message.hasOwnProperty("aggregationTemporality"))
                            object.aggregationTemporality = options.enums === String ? $root.opentelemetry.proto.metrics.v1.AggregationTemporality[message.aggregationTemporality] === undefined ? message.aggregationTemporality : $root.opentelemetry.proto.metrics.v1.AggregationTemporality[message.aggregationTemporality] : message.aggregationTemporality;
                        if (message.isMonotonic != null && message.hasOwnProperty("isMonotonic"))
                            object.isMonotonic = message.isMonotonic;
                        return object;
                    };
                    /**
                     * Converts this Sum to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.metrics.v1.Sum
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    Sum.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for Sum
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.metrics.v1.Sum
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    Sum.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.metrics.v1.Sum";
                    };
                    return Sum;
                })();
                v1.Histogram = (function () {
                    /**
                     * Properties of a Histogram.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @interface IHistogram
                     * @property {Array.<opentelemetry.proto.metrics.v1.IHistogramDataPoint>|null} [dataPoints] Histogram dataPoints
                     * @property {opentelemetry.proto.metrics.v1.AggregationTemporality|null} [aggregationTemporality] Histogram aggregationTemporality
                     */
                    /**
                     * Constructs a new Histogram.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @classdesc Represents a Histogram.
                     * @implements IHistogram
                     * @constructor
                     * @param {opentelemetry.proto.metrics.v1.IHistogram=} [properties] Properties to set
                     */
                    function Histogram(properties) {
                        this.dataPoints = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * Histogram dataPoints.
                     * @member {Array.<opentelemetry.proto.metrics.v1.IHistogramDataPoint>} dataPoints
                     * @memberof opentelemetry.proto.metrics.v1.Histogram
                     * @instance
                     */
                    Histogram.prototype.dataPoints = $util.emptyArray;
                    /**
                     * Histogram aggregationTemporality.
                     * @member {opentelemetry.proto.metrics.v1.AggregationTemporality|null|undefined} aggregationTemporality
                     * @memberof opentelemetry.proto.metrics.v1.Histogram
                     * @instance
                     */
                    Histogram.prototype.aggregationTemporality = null;
                    /**
                     * Creates a new Histogram instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.metrics.v1.Histogram
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IHistogram=} [properties] Properties to set
                     * @returns {opentelemetry.proto.metrics.v1.Histogram} Histogram instance
                     */
                    Histogram.create = function create(properties) {
                        return new Histogram(properties);
                    };
                    /**
                     * Encodes the specified Histogram message. Does not implicitly {@link opentelemetry.proto.metrics.v1.Histogram.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.metrics.v1.Histogram
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IHistogram} message Histogram message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Histogram.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.dataPoints != null && message.dataPoints.length)
                            for (var i = 0; i < message.dataPoints.length; ++i)
                                $root.opentelemetry.proto.metrics.v1.HistogramDataPoint.encode(message.dataPoints[i], writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                        if (message.aggregationTemporality != null && Object.hasOwnProperty.call(message, "aggregationTemporality"))
                            writer.uint32(/* id 2, wireType 0 =*/ 16).int32(message.aggregationTemporality);
                        return writer;
                    };
                    /**
                     * Encodes the specified Histogram message, length delimited. Does not implicitly {@link opentelemetry.proto.metrics.v1.Histogram.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.Histogram
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IHistogram} message Histogram message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Histogram.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a Histogram message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.metrics.v1.Histogram
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.metrics.v1.Histogram} Histogram
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Histogram.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.metrics.v1.Histogram();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    if (!(message.dataPoints && message.dataPoints.length))
                                        message.dataPoints = [];
                                    message.dataPoints.push($root.opentelemetry.proto.metrics.v1.HistogramDataPoint.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 2: {
                                    message.aggregationTemporality = reader.int32();
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a Histogram message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.Histogram
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.metrics.v1.Histogram} Histogram
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Histogram.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a Histogram message.
                     * @function verify
                     * @memberof opentelemetry.proto.metrics.v1.Histogram
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    Histogram.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.dataPoints != null && message.hasOwnProperty("dataPoints")) {
                            if (!Array.isArray(message.dataPoints))
                                return "dataPoints: array expected";
                            for (var i = 0; i < message.dataPoints.length; ++i) {
                                var error = $root.opentelemetry.proto.metrics.v1.HistogramDataPoint.verify(message.dataPoints[i]);
                                if (error)
                                    return "dataPoints." + error;
                            }
                        }
                        if (message.aggregationTemporality != null && message.hasOwnProperty("aggregationTemporality"))
                            switch (message.aggregationTemporality) {
                                default:
                                    return "aggregationTemporality: enum value expected";
                                case 0:
                                case 1:
                                case 2:
                                    break;
                            }
                        return null;
                    };
                    /**
                     * Creates a Histogram message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.metrics.v1.Histogram
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.metrics.v1.Histogram} Histogram
                     */
                    Histogram.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.metrics.v1.Histogram)
                            return object;
                        var message = new $root.opentelemetry.proto.metrics.v1.Histogram();
                        if (object.dataPoints) {
                            if (!Array.isArray(object.dataPoints))
                                throw TypeError(".opentelemetry.proto.metrics.v1.Histogram.dataPoints: array expected");
                            message.dataPoints = [];
                            for (var i = 0; i < object.dataPoints.length; ++i) {
                                if (typeof object.dataPoints[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.metrics.v1.Histogram.dataPoints: object expected");
                                message.dataPoints[i] = $root.opentelemetry.proto.metrics.v1.HistogramDataPoint.fromObject(object.dataPoints[i]);
                            }
                        }
                        switch (object.aggregationTemporality) {
                            default:
                                if (typeof object.aggregationTemporality === "number") {
                                    message.aggregationTemporality = object.aggregationTemporality;
                                    break;
                                }
                                break;
                            case "AGGREGATION_TEMPORALITY_UNSPECIFIED":
                            case 0:
                                message.aggregationTemporality = 0;
                                break;
                            case "AGGREGATION_TEMPORALITY_DELTA":
                            case 1:
                                message.aggregationTemporality = 1;
                                break;
                            case "AGGREGATION_TEMPORALITY_CUMULATIVE":
                            case 2:
                                message.aggregationTemporality = 2;
                                break;
                        }
                        return message;
                    };
                    /**
                     * Creates a plain object from a Histogram message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.metrics.v1.Histogram
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.Histogram} message Histogram
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    Histogram.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.dataPoints = [];
                        if (options.defaults)
                            object.aggregationTemporality = options.enums === String ? "AGGREGATION_TEMPORALITY_UNSPECIFIED" : 0;
                        if (message.dataPoints && message.dataPoints.length) {
                            object.dataPoints = [];
                            for (var j = 0; j < message.dataPoints.length; ++j)
                                object.dataPoints[j] = $root.opentelemetry.proto.metrics.v1.HistogramDataPoint.toObject(message.dataPoints[j], options);
                        }
                        if (message.aggregationTemporality != null && message.hasOwnProperty("aggregationTemporality"))
                            object.aggregationTemporality = options.enums === String ? $root.opentelemetry.proto.metrics.v1.AggregationTemporality[message.aggregationTemporality] === undefined ? message.aggregationTemporality : $root.opentelemetry.proto.metrics.v1.AggregationTemporality[message.aggregationTemporality] : message.aggregationTemporality;
                        return object;
                    };
                    /**
                     * Converts this Histogram to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.metrics.v1.Histogram
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    Histogram.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for Histogram
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.metrics.v1.Histogram
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    Histogram.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.metrics.v1.Histogram";
                    };
                    return Histogram;
                })();
                v1.ExponentialHistogram = (function () {
                    /**
                     * Properties of an ExponentialHistogram.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @interface IExponentialHistogram
                     * @property {Array.<opentelemetry.proto.metrics.v1.IExponentialHistogramDataPoint>|null} [dataPoints] ExponentialHistogram dataPoints
                     * @property {opentelemetry.proto.metrics.v1.AggregationTemporality|null} [aggregationTemporality] ExponentialHistogram aggregationTemporality
                     */
                    /**
                     * Constructs a new ExponentialHistogram.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @classdesc Represents an ExponentialHistogram.
                     * @implements IExponentialHistogram
                     * @constructor
                     * @param {opentelemetry.proto.metrics.v1.IExponentialHistogram=} [properties] Properties to set
                     */
                    function ExponentialHistogram(properties) {
                        this.dataPoints = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * ExponentialHistogram dataPoints.
                     * @member {Array.<opentelemetry.proto.metrics.v1.IExponentialHistogramDataPoint>} dataPoints
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogram
                     * @instance
                     */
                    ExponentialHistogram.prototype.dataPoints = $util.emptyArray;
                    /**
                     * ExponentialHistogram aggregationTemporality.
                     * @member {opentelemetry.proto.metrics.v1.AggregationTemporality|null|undefined} aggregationTemporality
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogram
                     * @instance
                     */
                    ExponentialHistogram.prototype.aggregationTemporality = null;
                    /**
                     * Creates a new ExponentialHistogram instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogram
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IExponentialHistogram=} [properties] Properties to set
                     * @returns {opentelemetry.proto.metrics.v1.ExponentialHistogram} ExponentialHistogram instance
                     */
                    ExponentialHistogram.create = function create(properties) {
                        return new ExponentialHistogram(properties);
                    };
                    /**
                     * Encodes the specified ExponentialHistogram message. Does not implicitly {@link opentelemetry.proto.metrics.v1.ExponentialHistogram.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogram
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IExponentialHistogram} message ExponentialHistogram message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    ExponentialHistogram.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.dataPoints != null && message.dataPoints.length)
                            for (var i = 0; i < message.dataPoints.length; ++i)
                                $root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.encode(message.dataPoints[i], writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                        if (message.aggregationTemporality != null && Object.hasOwnProperty.call(message, "aggregationTemporality"))
                            writer.uint32(/* id 2, wireType 0 =*/ 16).int32(message.aggregationTemporality);
                        return writer;
                    };
                    /**
                     * Encodes the specified ExponentialHistogram message, length delimited. Does not implicitly {@link opentelemetry.proto.metrics.v1.ExponentialHistogram.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogram
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IExponentialHistogram} message ExponentialHistogram message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    ExponentialHistogram.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes an ExponentialHistogram message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogram
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.metrics.v1.ExponentialHistogram} ExponentialHistogram
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    ExponentialHistogram.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.metrics.v1.ExponentialHistogram();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    if (!(message.dataPoints && message.dataPoints.length))
                                        message.dataPoints = [];
                                    message.dataPoints.push($root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 2: {
                                    message.aggregationTemporality = reader.int32();
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes an ExponentialHistogram message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogram
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.metrics.v1.ExponentialHistogram} ExponentialHistogram
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    ExponentialHistogram.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies an ExponentialHistogram message.
                     * @function verify
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogram
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    ExponentialHistogram.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.dataPoints != null && message.hasOwnProperty("dataPoints")) {
                            if (!Array.isArray(message.dataPoints))
                                return "dataPoints: array expected";
                            for (var i = 0; i < message.dataPoints.length; ++i) {
                                var error = $root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.verify(message.dataPoints[i]);
                                if (error)
                                    return "dataPoints." + error;
                            }
                        }
                        if (message.aggregationTemporality != null && message.hasOwnProperty("aggregationTemporality"))
                            switch (message.aggregationTemporality) {
                                default:
                                    return "aggregationTemporality: enum value expected";
                                case 0:
                                case 1:
                                case 2:
                                    break;
                            }
                        return null;
                    };
                    /**
                     * Creates an ExponentialHistogram message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogram
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.metrics.v1.ExponentialHistogram} ExponentialHistogram
                     */
                    ExponentialHistogram.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.metrics.v1.ExponentialHistogram)
                            return object;
                        var message = new $root.opentelemetry.proto.metrics.v1.ExponentialHistogram();
                        if (object.dataPoints) {
                            if (!Array.isArray(object.dataPoints))
                                throw TypeError(".opentelemetry.proto.metrics.v1.ExponentialHistogram.dataPoints: array expected");
                            message.dataPoints = [];
                            for (var i = 0; i < object.dataPoints.length; ++i) {
                                if (typeof object.dataPoints[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.metrics.v1.ExponentialHistogram.dataPoints: object expected");
                                message.dataPoints[i] = $root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.fromObject(object.dataPoints[i]);
                            }
                        }
                        switch (object.aggregationTemporality) {
                            default:
                                if (typeof object.aggregationTemporality === "number") {
                                    message.aggregationTemporality = object.aggregationTemporality;
                                    break;
                                }
                                break;
                            case "AGGREGATION_TEMPORALITY_UNSPECIFIED":
                            case 0:
                                message.aggregationTemporality = 0;
                                break;
                            case "AGGREGATION_TEMPORALITY_DELTA":
                            case 1:
                                message.aggregationTemporality = 1;
                                break;
                            case "AGGREGATION_TEMPORALITY_CUMULATIVE":
                            case 2:
                                message.aggregationTemporality = 2;
                                break;
                        }
                        return message;
                    };
                    /**
                     * Creates a plain object from an ExponentialHistogram message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogram
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.ExponentialHistogram} message ExponentialHistogram
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    ExponentialHistogram.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.dataPoints = [];
                        if (options.defaults)
                            object.aggregationTemporality = options.enums === String ? "AGGREGATION_TEMPORALITY_UNSPECIFIED" : 0;
                        if (message.dataPoints && message.dataPoints.length) {
                            object.dataPoints = [];
                            for (var j = 0; j < message.dataPoints.length; ++j)
                                object.dataPoints[j] = $root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.toObject(message.dataPoints[j], options);
                        }
                        if (message.aggregationTemporality != null && message.hasOwnProperty("aggregationTemporality"))
                            object.aggregationTemporality = options.enums === String ? $root.opentelemetry.proto.metrics.v1.AggregationTemporality[message.aggregationTemporality] === undefined ? message.aggregationTemporality : $root.opentelemetry.proto.metrics.v1.AggregationTemporality[message.aggregationTemporality] : message.aggregationTemporality;
                        return object;
                    };
                    /**
                     * Converts this ExponentialHistogram to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogram
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    ExponentialHistogram.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for ExponentialHistogram
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogram
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    ExponentialHistogram.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.metrics.v1.ExponentialHistogram";
                    };
                    return ExponentialHistogram;
                })();
                v1.Summary = (function () {
                    /**
                     * Properties of a Summary.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @interface ISummary
                     * @property {Array.<opentelemetry.proto.metrics.v1.ISummaryDataPoint>|null} [dataPoints] Summary dataPoints
                     */
                    /**
                     * Constructs a new Summary.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @classdesc Represents a Summary.
                     * @implements ISummary
                     * @constructor
                     * @param {opentelemetry.proto.metrics.v1.ISummary=} [properties] Properties to set
                     */
                    function Summary(properties) {
                        this.dataPoints = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * Summary dataPoints.
                     * @member {Array.<opentelemetry.proto.metrics.v1.ISummaryDataPoint>} dataPoints
                     * @memberof opentelemetry.proto.metrics.v1.Summary
                     * @instance
                     */
                    Summary.prototype.dataPoints = $util.emptyArray;
                    /**
                     * Creates a new Summary instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.metrics.v1.Summary
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.ISummary=} [properties] Properties to set
                     * @returns {opentelemetry.proto.metrics.v1.Summary} Summary instance
                     */
                    Summary.create = function create(properties) {
                        return new Summary(properties);
                    };
                    /**
                     * Encodes the specified Summary message. Does not implicitly {@link opentelemetry.proto.metrics.v1.Summary.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.metrics.v1.Summary
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.ISummary} message Summary message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Summary.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.dataPoints != null && message.dataPoints.length)
                            for (var i = 0; i < message.dataPoints.length; ++i)
                                $root.opentelemetry.proto.metrics.v1.SummaryDataPoint.encode(message.dataPoints[i], writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                        return writer;
                    };
                    /**
                     * Encodes the specified Summary message, length delimited. Does not implicitly {@link opentelemetry.proto.metrics.v1.Summary.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.Summary
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.ISummary} message Summary message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Summary.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a Summary message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.metrics.v1.Summary
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.metrics.v1.Summary} Summary
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Summary.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.metrics.v1.Summary();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    if (!(message.dataPoints && message.dataPoints.length))
                                        message.dataPoints = [];
                                    message.dataPoints.push($root.opentelemetry.proto.metrics.v1.SummaryDataPoint.decode(reader, reader.uint32()));
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a Summary message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.Summary
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.metrics.v1.Summary} Summary
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Summary.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a Summary message.
                     * @function verify
                     * @memberof opentelemetry.proto.metrics.v1.Summary
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    Summary.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.dataPoints != null && message.hasOwnProperty("dataPoints")) {
                            if (!Array.isArray(message.dataPoints))
                                return "dataPoints: array expected";
                            for (var i = 0; i < message.dataPoints.length; ++i) {
                                var error = $root.opentelemetry.proto.metrics.v1.SummaryDataPoint.verify(message.dataPoints[i]);
                                if (error)
                                    return "dataPoints." + error;
                            }
                        }
                        return null;
                    };
                    /**
                     * Creates a Summary message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.metrics.v1.Summary
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.metrics.v1.Summary} Summary
                     */
                    Summary.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.metrics.v1.Summary)
                            return object;
                        var message = new $root.opentelemetry.proto.metrics.v1.Summary();
                        if (object.dataPoints) {
                            if (!Array.isArray(object.dataPoints))
                                throw TypeError(".opentelemetry.proto.metrics.v1.Summary.dataPoints: array expected");
                            message.dataPoints = [];
                            for (var i = 0; i < object.dataPoints.length; ++i) {
                                if (typeof object.dataPoints[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.metrics.v1.Summary.dataPoints: object expected");
                                message.dataPoints[i] = $root.opentelemetry.proto.metrics.v1.SummaryDataPoint.fromObject(object.dataPoints[i]);
                            }
                        }
                        return message;
                    };
                    /**
                     * Creates a plain object from a Summary message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.metrics.v1.Summary
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.Summary} message Summary
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    Summary.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.dataPoints = [];
                        if (message.dataPoints && message.dataPoints.length) {
                            object.dataPoints = [];
                            for (var j = 0; j < message.dataPoints.length; ++j)
                                object.dataPoints[j] = $root.opentelemetry.proto.metrics.v1.SummaryDataPoint.toObject(message.dataPoints[j], options);
                        }
                        return object;
                    };
                    /**
                     * Converts this Summary to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.metrics.v1.Summary
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    Summary.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for Summary
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.metrics.v1.Summary
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    Summary.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.metrics.v1.Summary";
                    };
                    return Summary;
                })();
                /**
                 * AggregationTemporality enum.
                 * @name opentelemetry.proto.metrics.v1.AggregationTemporality
                 * @enum {number}
                 * @property {number} AGGREGATION_TEMPORALITY_UNSPECIFIED=0 AGGREGATION_TEMPORALITY_UNSPECIFIED value
                 * @property {number} AGGREGATION_TEMPORALITY_DELTA=1 AGGREGATION_TEMPORALITY_DELTA value
                 * @property {number} AGGREGATION_TEMPORALITY_CUMULATIVE=2 AGGREGATION_TEMPORALITY_CUMULATIVE value
                 */
                v1.AggregationTemporality = (function () {
                    var valuesById = {}, values = Object.create(valuesById);
                    values[valuesById[0] = "AGGREGATION_TEMPORALITY_UNSPECIFIED"] = 0;
                    values[valuesById[1] = "AGGREGATION_TEMPORALITY_DELTA"] = 1;
                    values[valuesById[2] = "AGGREGATION_TEMPORALITY_CUMULATIVE"] = 2;
                    return values;
                })();
                /**
                 * DataPointFlags enum.
                 * @name opentelemetry.proto.metrics.v1.DataPointFlags
                 * @enum {number}
                 * @property {number} DATA_POINT_FLAGS_DO_NOT_USE=0 DATA_POINT_FLAGS_DO_NOT_USE value
                 * @property {number} DATA_POINT_FLAGS_NO_RECORDED_VALUE_MASK=1 DATA_POINT_FLAGS_NO_RECORDED_VALUE_MASK value
                 */
                v1.DataPointFlags = (function () {
                    var valuesById = {}, values = Object.create(valuesById);
                    values[valuesById[0] = "DATA_POINT_FLAGS_DO_NOT_USE"] = 0;
                    values[valuesById[1] = "DATA_POINT_FLAGS_NO_RECORDED_VALUE_MASK"] = 1;
                    return values;
                })();
                v1.NumberDataPoint = (function () {
                    /**
                     * Properties of a NumberDataPoint.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @interface INumberDataPoint
                     * @property {Array.<opentelemetry.proto.common.v1.IKeyValue>|null} [attributes] NumberDataPoint attributes
                     * @property {number|Long|null} [startTimeUnixNano] NumberDataPoint startTimeUnixNano
                     * @property {number|Long|null} [timeUnixNano] NumberDataPoint timeUnixNano
                     * @property {number|null} [asDouble] NumberDataPoint asDouble
                     * @property {number|Long|null} [asInt] NumberDataPoint asInt
                     * @property {Array.<opentelemetry.proto.metrics.v1.IExemplar>|null} [exemplars] NumberDataPoint exemplars
                     * @property {number|null} [flags] NumberDataPoint flags
                     */
                    /**
                     * Constructs a new NumberDataPoint.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @classdesc Represents a NumberDataPoint.
                     * @implements INumberDataPoint
                     * @constructor
                     * @param {opentelemetry.proto.metrics.v1.INumberDataPoint=} [properties] Properties to set
                     */
                    function NumberDataPoint(properties) {
                        this.attributes = [];
                        this.exemplars = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * NumberDataPoint attributes.
                     * @member {Array.<opentelemetry.proto.common.v1.IKeyValue>} attributes
                     * @memberof opentelemetry.proto.metrics.v1.NumberDataPoint
                     * @instance
                     */
                    NumberDataPoint.prototype.attributes = $util.emptyArray;
                    /**
                     * NumberDataPoint startTimeUnixNano.
                     * @member {number|Long|null|undefined} startTimeUnixNano
                     * @memberof opentelemetry.proto.metrics.v1.NumberDataPoint
                     * @instance
                     */
                    NumberDataPoint.prototype.startTimeUnixNano = null;
                    /**
                     * NumberDataPoint timeUnixNano.
                     * @member {number|Long|null|undefined} timeUnixNano
                     * @memberof opentelemetry.proto.metrics.v1.NumberDataPoint
                     * @instance
                     */
                    NumberDataPoint.prototype.timeUnixNano = null;
                    /**
                     * NumberDataPoint asDouble.
                     * @member {number|null|undefined} asDouble
                     * @memberof opentelemetry.proto.metrics.v1.NumberDataPoint
                     * @instance
                     */
                    NumberDataPoint.prototype.asDouble = null;
                    /**
                     * NumberDataPoint asInt.
                     * @member {number|Long|null|undefined} asInt
                     * @memberof opentelemetry.proto.metrics.v1.NumberDataPoint
                     * @instance
                     */
                    NumberDataPoint.prototype.asInt = null;
                    /**
                     * NumberDataPoint exemplars.
                     * @member {Array.<opentelemetry.proto.metrics.v1.IExemplar>} exemplars
                     * @memberof opentelemetry.proto.metrics.v1.NumberDataPoint
                     * @instance
                     */
                    NumberDataPoint.prototype.exemplars = $util.emptyArray;
                    /**
                     * NumberDataPoint flags.
                     * @member {number|null|undefined} flags
                     * @memberof opentelemetry.proto.metrics.v1.NumberDataPoint
                     * @instance
                     */
                    NumberDataPoint.prototype.flags = null;
                    // OneOf field names bound to virtual getters and setters
                    var $oneOfFields;
                    /**
                     * NumberDataPoint value.
                     * @member {"asDouble"|"asInt"|undefined} value
                     * @memberof opentelemetry.proto.metrics.v1.NumberDataPoint
                     * @instance
                     */
                    Object.defineProperty(NumberDataPoint.prototype, "value", {
                        get: $util.oneOfGetter($oneOfFields = ["asDouble", "asInt"]),
                        set: $util.oneOfSetter($oneOfFields)
                    });
                    /**
                     * Creates a new NumberDataPoint instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.metrics.v1.NumberDataPoint
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.INumberDataPoint=} [properties] Properties to set
                     * @returns {opentelemetry.proto.metrics.v1.NumberDataPoint} NumberDataPoint instance
                     */
                    NumberDataPoint.create = function create(properties) {
                        return new NumberDataPoint(properties);
                    };
                    /**
                     * Encodes the specified NumberDataPoint message. Does not implicitly {@link opentelemetry.proto.metrics.v1.NumberDataPoint.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.metrics.v1.NumberDataPoint
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.INumberDataPoint} message NumberDataPoint message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    NumberDataPoint.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.startTimeUnixNano != null && Object.hasOwnProperty.call(message, "startTimeUnixNano"))
                            writer.uint32(/* id 2, wireType 1 =*/ 17).fixed64(message.startTimeUnixNano);
                        if (message.timeUnixNano != null && Object.hasOwnProperty.call(message, "timeUnixNano"))
                            writer.uint32(/* id 3, wireType 1 =*/ 25).fixed64(message.timeUnixNano);
                        if (message.asDouble != null && Object.hasOwnProperty.call(message, "asDouble"))
                            writer.uint32(/* id 4, wireType 1 =*/ 33).double(message.asDouble);
                        if (message.exemplars != null && message.exemplars.length)
                            for (var i = 0; i < message.exemplars.length; ++i)
                                $root.opentelemetry.proto.metrics.v1.Exemplar.encode(message.exemplars[i], writer.uint32(/* id 5, wireType 2 =*/ 42).fork()).ldelim();
                        if (message.asInt != null && Object.hasOwnProperty.call(message, "asInt"))
                            writer.uint32(/* id 6, wireType 1 =*/ 49).sfixed64(message.asInt);
                        if (message.attributes != null && message.attributes.length)
                            for (var i = 0; i < message.attributes.length; ++i)
                                $root.opentelemetry.proto.common.v1.KeyValue.encode(message.attributes[i], writer.uint32(/* id 7, wireType 2 =*/ 58).fork()).ldelim();
                        if (message.flags != null && Object.hasOwnProperty.call(message, "flags"))
                            writer.uint32(/* id 8, wireType 0 =*/ 64).uint32(message.flags);
                        return writer;
                    };
                    /**
                     * Encodes the specified NumberDataPoint message, length delimited. Does not implicitly {@link opentelemetry.proto.metrics.v1.NumberDataPoint.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.NumberDataPoint
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.INumberDataPoint} message NumberDataPoint message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    NumberDataPoint.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a NumberDataPoint message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.metrics.v1.NumberDataPoint
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.metrics.v1.NumberDataPoint} NumberDataPoint
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    NumberDataPoint.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.metrics.v1.NumberDataPoint();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 7: {
                                    if (!(message.attributes && message.attributes.length))
                                        message.attributes = [];
                                    message.attributes.push($root.opentelemetry.proto.common.v1.KeyValue.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 2: {
                                    message.startTimeUnixNano = reader.fixed64();
                                    break;
                                }
                                case 3: {
                                    message.timeUnixNano = reader.fixed64();
                                    break;
                                }
                                case 4: {
                                    message.asDouble = reader.double();
                                    break;
                                }
                                case 6: {
                                    message.asInt = reader.sfixed64();
                                    break;
                                }
                                case 5: {
                                    if (!(message.exemplars && message.exemplars.length))
                                        message.exemplars = [];
                                    message.exemplars.push($root.opentelemetry.proto.metrics.v1.Exemplar.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 8: {
                                    message.flags = reader.uint32();
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a NumberDataPoint message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.NumberDataPoint
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.metrics.v1.NumberDataPoint} NumberDataPoint
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    NumberDataPoint.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a NumberDataPoint message.
                     * @function verify
                     * @memberof opentelemetry.proto.metrics.v1.NumberDataPoint
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    NumberDataPoint.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        var properties = {};
                        if (message.attributes != null && message.hasOwnProperty("attributes")) {
                            if (!Array.isArray(message.attributes))
                                return "attributes: array expected";
                            for (var i = 0; i < message.attributes.length; ++i) {
                                var error = $root.opentelemetry.proto.common.v1.KeyValue.verify(message.attributes[i]);
                                if (error)
                                    return "attributes." + error;
                            }
                        }
                        if (message.startTimeUnixNano != null && message.hasOwnProperty("startTimeUnixNano"))
                            if (!$util.isInteger(message.startTimeUnixNano) && !(message.startTimeUnixNano && $util.isInteger(message.startTimeUnixNano.low) && $util.isInteger(message.startTimeUnixNano.high)))
                                return "startTimeUnixNano: integer|Long expected";
                        if (message.timeUnixNano != null && message.hasOwnProperty("timeUnixNano"))
                            if (!$util.isInteger(message.timeUnixNano) && !(message.timeUnixNano && $util.isInteger(message.timeUnixNano.low) && $util.isInteger(message.timeUnixNano.high)))
                                return "timeUnixNano: integer|Long expected";
                        if (message.asDouble != null && message.hasOwnProperty("asDouble")) {
                            properties.value = 1;
                            if (typeof message.asDouble !== "number")
                                return "asDouble: number expected";
                        }
                        if (message.asInt != null && message.hasOwnProperty("asInt")) {
                            if (properties.value === 1)
                                return "value: multiple values";
                            properties.value = 1;
                            if (!$util.isInteger(message.asInt) && !(message.asInt && $util.isInteger(message.asInt.low) && $util.isInteger(message.asInt.high)))
                                return "asInt: integer|Long expected";
                        }
                        if (message.exemplars != null && message.hasOwnProperty("exemplars")) {
                            if (!Array.isArray(message.exemplars))
                                return "exemplars: array expected";
                            for (var i = 0; i < message.exemplars.length; ++i) {
                                var error = $root.opentelemetry.proto.metrics.v1.Exemplar.verify(message.exemplars[i]);
                                if (error)
                                    return "exemplars." + error;
                            }
                        }
                        if (message.flags != null && message.hasOwnProperty("flags"))
                            if (!$util.isInteger(message.flags))
                                return "flags: integer expected";
                        return null;
                    };
                    /**
                     * Creates a NumberDataPoint message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.metrics.v1.NumberDataPoint
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.metrics.v1.NumberDataPoint} NumberDataPoint
                     */
                    NumberDataPoint.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.metrics.v1.NumberDataPoint)
                            return object;
                        var message = new $root.opentelemetry.proto.metrics.v1.NumberDataPoint();
                        if (object.attributes) {
                            if (!Array.isArray(object.attributes))
                                throw TypeError(".opentelemetry.proto.metrics.v1.NumberDataPoint.attributes: array expected");
                            message.attributes = [];
                            for (var i = 0; i < object.attributes.length; ++i) {
                                if (typeof object.attributes[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.metrics.v1.NumberDataPoint.attributes: object expected");
                                message.attributes[i] = $root.opentelemetry.proto.common.v1.KeyValue.fromObject(object.attributes[i]);
                            }
                        }
                        if (object.startTimeUnixNano != null)
                            if ($util.Long)
                                (message.startTimeUnixNano = $util.Long.fromValue(object.startTimeUnixNano)).unsigned = false;
                            else if (typeof object.startTimeUnixNano === "string")
                                message.startTimeUnixNano = parseInt(object.startTimeUnixNano, 10);
                            else if (typeof object.startTimeUnixNano === "number")
                                message.startTimeUnixNano = object.startTimeUnixNano;
                            else if (typeof object.startTimeUnixNano === "object")
                                message.startTimeUnixNano = new $util.LongBits(object.startTimeUnixNano.low >>> 0, object.startTimeUnixNano.high >>> 0).toNumber();
                        if (object.timeUnixNano != null)
                            if ($util.Long)
                                (message.timeUnixNano = $util.Long.fromValue(object.timeUnixNano)).unsigned = false;
                            else if (typeof object.timeUnixNano === "string")
                                message.timeUnixNano = parseInt(object.timeUnixNano, 10);
                            else if (typeof object.timeUnixNano === "number")
                                message.timeUnixNano = object.timeUnixNano;
                            else if (typeof object.timeUnixNano === "object")
                                message.timeUnixNano = new $util.LongBits(object.timeUnixNano.low >>> 0, object.timeUnixNano.high >>> 0).toNumber();
                        if (object.asDouble != null)
                            message.asDouble = Number(object.asDouble);
                        if (object.asInt != null)
                            if ($util.Long)
                                (message.asInt = $util.Long.fromValue(object.asInt)).unsigned = false;
                            else if (typeof object.asInt === "string")
                                message.asInt = parseInt(object.asInt, 10);
                            else if (typeof object.asInt === "number")
                                message.asInt = object.asInt;
                            else if (typeof object.asInt === "object")
                                message.asInt = new $util.LongBits(object.asInt.low >>> 0, object.asInt.high >>> 0).toNumber();
                        if (object.exemplars) {
                            if (!Array.isArray(object.exemplars))
                                throw TypeError(".opentelemetry.proto.metrics.v1.NumberDataPoint.exemplars: array expected");
                            message.exemplars = [];
                            for (var i = 0; i < object.exemplars.length; ++i) {
                                if (typeof object.exemplars[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.metrics.v1.NumberDataPoint.exemplars: object expected");
                                message.exemplars[i] = $root.opentelemetry.proto.metrics.v1.Exemplar.fromObject(object.exemplars[i]);
                            }
                        }
                        if (object.flags != null)
                            message.flags = object.flags >>> 0;
                        return message;
                    };
                    /**
                     * Creates a plain object from a NumberDataPoint message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.metrics.v1.NumberDataPoint
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.NumberDataPoint} message NumberDataPoint
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    NumberDataPoint.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults) {
                            object.exemplars = [];
                            object.attributes = [];
                        }
                        if (options.defaults) {
                            if ($util.Long) {
                                var long = new $util.Long(0, 0, false);
                                object.startTimeUnixNano = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                            }
                            else
                                object.startTimeUnixNano = options.longs === String ? "0" : 0;
                            if ($util.Long) {
                                var long = new $util.Long(0, 0, false);
                                object.timeUnixNano = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                            }
                            else
                                object.timeUnixNano = options.longs === String ? "0" : 0;
                            object.flags = 0;
                        }
                        if (message.startTimeUnixNano != null && message.hasOwnProperty("startTimeUnixNano"))
                            if (typeof message.startTimeUnixNano === "number")
                                object.startTimeUnixNano = options.longs === String ? String(message.startTimeUnixNano) : message.startTimeUnixNano;
                            else
                                object.startTimeUnixNano = options.longs === String ? $util.Long.prototype.toString.call(message.startTimeUnixNano) : options.longs === Number ? new $util.LongBits(message.startTimeUnixNano.low >>> 0, message.startTimeUnixNano.high >>> 0).toNumber() : message.startTimeUnixNano;
                        if (message.timeUnixNano != null && message.hasOwnProperty("timeUnixNano"))
                            if (typeof message.timeUnixNano === "number")
                                object.timeUnixNano = options.longs === String ? String(message.timeUnixNano) : message.timeUnixNano;
                            else
                                object.timeUnixNano = options.longs === String ? $util.Long.prototype.toString.call(message.timeUnixNano) : options.longs === Number ? new $util.LongBits(message.timeUnixNano.low >>> 0, message.timeUnixNano.high >>> 0).toNumber() : message.timeUnixNano;
                        if (message.asDouble != null && message.hasOwnProperty("asDouble")) {
                            object.asDouble = options.json && !isFinite(message.asDouble) ? String(message.asDouble) : message.asDouble;
                            if (options.oneofs)
                                object.value = "asDouble";
                        }
                        if (message.exemplars && message.exemplars.length) {
                            object.exemplars = [];
                            for (var j = 0; j < message.exemplars.length; ++j)
                                object.exemplars[j] = $root.opentelemetry.proto.metrics.v1.Exemplar.toObject(message.exemplars[j], options);
                        }
                        if (message.asInt != null && message.hasOwnProperty("asInt")) {
                            if (typeof message.asInt === "number")
                                object.asInt = options.longs === String ? String(message.asInt) : message.asInt;
                            else
                                object.asInt = options.longs === String ? $util.Long.prototype.toString.call(message.asInt) : options.longs === Number ? new $util.LongBits(message.asInt.low >>> 0, message.asInt.high >>> 0).toNumber() : message.asInt;
                            if (options.oneofs)
                                object.value = "asInt";
                        }
                        if (message.attributes && message.attributes.length) {
                            object.attributes = [];
                            for (var j = 0; j < message.attributes.length; ++j)
                                object.attributes[j] = $root.opentelemetry.proto.common.v1.KeyValue.toObject(message.attributes[j], options);
                        }
                        if (message.flags != null && message.hasOwnProperty("flags"))
                            object.flags = message.flags;
                        return object;
                    };
                    /**
                     * Converts this NumberDataPoint to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.metrics.v1.NumberDataPoint
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    NumberDataPoint.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for NumberDataPoint
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.metrics.v1.NumberDataPoint
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    NumberDataPoint.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.metrics.v1.NumberDataPoint";
                    };
                    return NumberDataPoint;
                })();
                v1.HistogramDataPoint = (function () {
                    /**
                     * Properties of a HistogramDataPoint.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @interface IHistogramDataPoint
                     * @property {Array.<opentelemetry.proto.common.v1.IKeyValue>|null} [attributes] HistogramDataPoint attributes
                     * @property {number|Long|null} [startTimeUnixNano] HistogramDataPoint startTimeUnixNano
                     * @property {number|Long|null} [timeUnixNano] HistogramDataPoint timeUnixNano
                     * @property {number|Long|null} [count] HistogramDataPoint count
                     * @property {number|null} [sum] HistogramDataPoint sum
                     * @property {Array.<number|Long>|null} [bucketCounts] HistogramDataPoint bucketCounts
                     * @property {Array.<number>|null} [explicitBounds] HistogramDataPoint explicitBounds
                     * @property {Array.<opentelemetry.proto.metrics.v1.IExemplar>|null} [exemplars] HistogramDataPoint exemplars
                     * @property {number|null} [flags] HistogramDataPoint flags
                     * @property {number|null} [min] HistogramDataPoint min
                     * @property {number|null} [max] HistogramDataPoint max
                     */
                    /**
                     * Constructs a new HistogramDataPoint.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @classdesc Represents a HistogramDataPoint.
                     * @implements IHistogramDataPoint
                     * @constructor
                     * @param {opentelemetry.proto.metrics.v1.IHistogramDataPoint=} [properties] Properties to set
                     */
                    function HistogramDataPoint(properties) {
                        this.attributes = [];
                        this.bucketCounts = [];
                        this.explicitBounds = [];
                        this.exemplars = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * HistogramDataPoint attributes.
                     * @member {Array.<opentelemetry.proto.common.v1.IKeyValue>} attributes
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @instance
                     */
                    HistogramDataPoint.prototype.attributes = $util.emptyArray;
                    /**
                     * HistogramDataPoint startTimeUnixNano.
                     * @member {number|Long|null|undefined} startTimeUnixNano
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @instance
                     */
                    HistogramDataPoint.prototype.startTimeUnixNano = null;
                    /**
                     * HistogramDataPoint timeUnixNano.
                     * @member {number|Long|null|undefined} timeUnixNano
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @instance
                     */
                    HistogramDataPoint.prototype.timeUnixNano = null;
                    /**
                     * HistogramDataPoint count.
                     * @member {number|Long|null|undefined} count
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @instance
                     */
                    HistogramDataPoint.prototype.count = null;
                    /**
                     * HistogramDataPoint sum.
                     * @member {number|null|undefined} sum
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @instance
                     */
                    HistogramDataPoint.prototype.sum = null;
                    /**
                     * HistogramDataPoint bucketCounts.
                     * @member {Array.<number|Long>} bucketCounts
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @instance
                     */
                    HistogramDataPoint.prototype.bucketCounts = $util.emptyArray;
                    /**
                     * HistogramDataPoint explicitBounds.
                     * @member {Array.<number>} explicitBounds
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @instance
                     */
                    HistogramDataPoint.prototype.explicitBounds = $util.emptyArray;
                    /**
                     * HistogramDataPoint exemplars.
                     * @member {Array.<opentelemetry.proto.metrics.v1.IExemplar>} exemplars
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @instance
                     */
                    HistogramDataPoint.prototype.exemplars = $util.emptyArray;
                    /**
                     * HistogramDataPoint flags.
                     * @member {number|null|undefined} flags
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @instance
                     */
                    HistogramDataPoint.prototype.flags = null;
                    /**
                     * HistogramDataPoint min.
                     * @member {number|null|undefined} min
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @instance
                     */
                    HistogramDataPoint.prototype.min = null;
                    /**
                     * HistogramDataPoint max.
                     * @member {number|null|undefined} max
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @instance
                     */
                    HistogramDataPoint.prototype.max = null;
                    // OneOf field names bound to virtual getters and setters
                    var $oneOfFields;
                    /**
                     * HistogramDataPoint _sum.
                     * @member {"sum"|undefined} _sum
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @instance
                     */
                    Object.defineProperty(HistogramDataPoint.prototype, "_sum", {
                        get: $util.oneOfGetter($oneOfFields = ["sum"]),
                        set: $util.oneOfSetter($oneOfFields)
                    });
                    /**
                     * HistogramDataPoint _min.
                     * @member {"min"|undefined} _min
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @instance
                     */
                    Object.defineProperty(HistogramDataPoint.prototype, "_min", {
                        get: $util.oneOfGetter($oneOfFields = ["min"]),
                        set: $util.oneOfSetter($oneOfFields)
                    });
                    /**
                     * HistogramDataPoint _max.
                     * @member {"max"|undefined} _max
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @instance
                     */
                    Object.defineProperty(HistogramDataPoint.prototype, "_max", {
                        get: $util.oneOfGetter($oneOfFields = ["max"]),
                        set: $util.oneOfSetter($oneOfFields)
                    });
                    /**
                     * Creates a new HistogramDataPoint instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IHistogramDataPoint=} [properties] Properties to set
                     * @returns {opentelemetry.proto.metrics.v1.HistogramDataPoint} HistogramDataPoint instance
                     */
                    HistogramDataPoint.create = function create(properties) {
                        return new HistogramDataPoint(properties);
                    };
                    /**
                     * Encodes the specified HistogramDataPoint message. Does not implicitly {@link opentelemetry.proto.metrics.v1.HistogramDataPoint.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IHistogramDataPoint} message HistogramDataPoint message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    HistogramDataPoint.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.startTimeUnixNano != null && Object.hasOwnProperty.call(message, "startTimeUnixNano"))
                            writer.uint32(/* id 2, wireType 1 =*/ 17).fixed64(message.startTimeUnixNano);
                        if (message.timeUnixNano != null && Object.hasOwnProperty.call(message, "timeUnixNano"))
                            writer.uint32(/* id 3, wireType 1 =*/ 25).fixed64(message.timeUnixNano);
                        if (message.count != null && Object.hasOwnProperty.call(message, "count"))
                            writer.uint32(/* id 4, wireType 1 =*/ 33).fixed64(message.count);
                        if (message.sum != null && Object.hasOwnProperty.call(message, "sum"))
                            writer.uint32(/* id 5, wireType 1 =*/ 41).double(message.sum);
                        if (message.bucketCounts != null && message.bucketCounts.length) {
                            writer.uint32(/* id 6, wireType 2 =*/ 50).fork();
                            for (var i = 0; i < message.bucketCounts.length; ++i)
                                writer.fixed64(message.bucketCounts[i]);
                            writer.ldelim();
                        }
                        if (message.explicitBounds != null && message.explicitBounds.length) {
                            writer.uint32(/* id 7, wireType 2 =*/ 58).fork();
                            for (var i = 0; i < message.explicitBounds.length; ++i)
                                writer.double(message.explicitBounds[i]);
                            writer.ldelim();
                        }
                        if (message.exemplars != null && message.exemplars.length)
                            for (var i = 0; i < message.exemplars.length; ++i)
                                $root.opentelemetry.proto.metrics.v1.Exemplar.encode(message.exemplars[i], writer.uint32(/* id 8, wireType 2 =*/ 66).fork()).ldelim();
                        if (message.attributes != null && message.attributes.length)
                            for (var i = 0; i < message.attributes.length; ++i)
                                $root.opentelemetry.proto.common.v1.KeyValue.encode(message.attributes[i], writer.uint32(/* id 9, wireType 2 =*/ 74).fork()).ldelim();
                        if (message.flags != null && Object.hasOwnProperty.call(message, "flags"))
                            writer.uint32(/* id 10, wireType 0 =*/ 80).uint32(message.flags);
                        if (message.min != null && Object.hasOwnProperty.call(message, "min"))
                            writer.uint32(/* id 11, wireType 1 =*/ 89).double(message.min);
                        if (message.max != null && Object.hasOwnProperty.call(message, "max"))
                            writer.uint32(/* id 12, wireType 1 =*/ 97).double(message.max);
                        return writer;
                    };
                    /**
                     * Encodes the specified HistogramDataPoint message, length delimited. Does not implicitly {@link opentelemetry.proto.metrics.v1.HistogramDataPoint.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IHistogramDataPoint} message HistogramDataPoint message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    HistogramDataPoint.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a HistogramDataPoint message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.metrics.v1.HistogramDataPoint} HistogramDataPoint
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    HistogramDataPoint.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.metrics.v1.HistogramDataPoint();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 9: {
                                    if (!(message.attributes && message.attributes.length))
                                        message.attributes = [];
                                    message.attributes.push($root.opentelemetry.proto.common.v1.KeyValue.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 2: {
                                    message.startTimeUnixNano = reader.fixed64();
                                    break;
                                }
                                case 3: {
                                    message.timeUnixNano = reader.fixed64();
                                    break;
                                }
                                case 4: {
                                    message.count = reader.fixed64();
                                    break;
                                }
                                case 5: {
                                    message.sum = reader.double();
                                    break;
                                }
                                case 6: {
                                    if (!(message.bucketCounts && message.bucketCounts.length))
                                        message.bucketCounts = [];
                                    if ((tag & 7) === 2) {
                                        var end2 = reader.uint32() + reader.pos;
                                        while (reader.pos < end2)
                                            message.bucketCounts.push(reader.fixed64());
                                    }
                                    else
                                        message.bucketCounts.push(reader.fixed64());
                                    break;
                                }
                                case 7: {
                                    if (!(message.explicitBounds && message.explicitBounds.length))
                                        message.explicitBounds = [];
                                    if ((tag & 7) === 2) {
                                        var end2 = reader.uint32() + reader.pos;
                                        while (reader.pos < end2)
                                            message.explicitBounds.push(reader.double());
                                    }
                                    else
                                        message.explicitBounds.push(reader.double());
                                    break;
                                }
                                case 8: {
                                    if (!(message.exemplars && message.exemplars.length))
                                        message.exemplars = [];
                                    message.exemplars.push($root.opentelemetry.proto.metrics.v1.Exemplar.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 10: {
                                    message.flags = reader.uint32();
                                    break;
                                }
                                case 11: {
                                    message.min = reader.double();
                                    break;
                                }
                                case 12: {
                                    message.max = reader.double();
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a HistogramDataPoint message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.metrics.v1.HistogramDataPoint} HistogramDataPoint
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    HistogramDataPoint.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a HistogramDataPoint message.
                     * @function verify
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    HistogramDataPoint.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        var properties = {};
                        if (message.attributes != null && message.hasOwnProperty("attributes")) {
                            if (!Array.isArray(message.attributes))
                                return "attributes: array expected";
                            for (var i = 0; i < message.attributes.length; ++i) {
                                var error = $root.opentelemetry.proto.common.v1.KeyValue.verify(message.attributes[i]);
                                if (error)
                                    return "attributes." + error;
                            }
                        }
                        if (message.startTimeUnixNano != null && message.hasOwnProperty("startTimeUnixNano"))
                            if (!$util.isInteger(message.startTimeUnixNano) && !(message.startTimeUnixNano && $util.isInteger(message.startTimeUnixNano.low) && $util.isInteger(message.startTimeUnixNano.high)))
                                return "startTimeUnixNano: integer|Long expected";
                        if (message.timeUnixNano != null && message.hasOwnProperty("timeUnixNano"))
                            if (!$util.isInteger(message.timeUnixNano) && !(message.timeUnixNano && $util.isInteger(message.timeUnixNano.low) && $util.isInteger(message.timeUnixNano.high)))
                                return "timeUnixNano: integer|Long expected";
                        if (message.count != null && message.hasOwnProperty("count"))
                            if (!$util.isInteger(message.count) && !(message.count && $util.isInteger(message.count.low) && $util.isInteger(message.count.high)))
                                return "count: integer|Long expected";
                        if (message.sum != null && message.hasOwnProperty("sum")) {
                            properties._sum = 1;
                            if (typeof message.sum !== "number")
                                return "sum: number expected";
                        }
                        if (message.bucketCounts != null && message.hasOwnProperty("bucketCounts")) {
                            if (!Array.isArray(message.bucketCounts))
                                return "bucketCounts: array expected";
                            for (var i = 0; i < message.bucketCounts.length; ++i)
                                if (!$util.isInteger(message.bucketCounts[i]) && !(message.bucketCounts[i] && $util.isInteger(message.bucketCounts[i].low) && $util.isInteger(message.bucketCounts[i].high)))
                                    return "bucketCounts: integer|Long[] expected";
                        }
                        if (message.explicitBounds != null && message.hasOwnProperty("explicitBounds")) {
                            if (!Array.isArray(message.explicitBounds))
                                return "explicitBounds: array expected";
                            for (var i = 0; i < message.explicitBounds.length; ++i)
                                if (typeof message.explicitBounds[i] !== "number")
                                    return "explicitBounds: number[] expected";
                        }
                        if (message.exemplars != null && message.hasOwnProperty("exemplars")) {
                            if (!Array.isArray(message.exemplars))
                                return "exemplars: array expected";
                            for (var i = 0; i < message.exemplars.length; ++i) {
                                var error = $root.opentelemetry.proto.metrics.v1.Exemplar.verify(message.exemplars[i]);
                                if (error)
                                    return "exemplars." + error;
                            }
                        }
                        if (message.flags != null && message.hasOwnProperty("flags"))
                            if (!$util.isInteger(message.flags))
                                return "flags: integer expected";
                        if (message.min != null && message.hasOwnProperty("min")) {
                            properties._min = 1;
                            if (typeof message.min !== "number")
                                return "min: number expected";
                        }
                        if (message.max != null && message.hasOwnProperty("max")) {
                            properties._max = 1;
                            if (typeof message.max !== "number")
                                return "max: number expected";
                        }
                        return null;
                    };
                    /**
                     * Creates a HistogramDataPoint message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.metrics.v1.HistogramDataPoint} HistogramDataPoint
                     */
                    HistogramDataPoint.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.metrics.v1.HistogramDataPoint)
                            return object;
                        var message = new $root.opentelemetry.proto.metrics.v1.HistogramDataPoint();
                        if (object.attributes) {
                            if (!Array.isArray(object.attributes))
                                throw TypeError(".opentelemetry.proto.metrics.v1.HistogramDataPoint.attributes: array expected");
                            message.attributes = [];
                            for (var i = 0; i < object.attributes.length; ++i) {
                                if (typeof object.attributes[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.metrics.v1.HistogramDataPoint.attributes: object expected");
                                message.attributes[i] = $root.opentelemetry.proto.common.v1.KeyValue.fromObject(object.attributes[i]);
                            }
                        }
                        if (object.startTimeUnixNano != null)
                            if ($util.Long)
                                (message.startTimeUnixNano = $util.Long.fromValue(object.startTimeUnixNano)).unsigned = false;
                            else if (typeof object.startTimeUnixNano === "string")
                                message.startTimeUnixNano = parseInt(object.startTimeUnixNano, 10);
                            else if (typeof object.startTimeUnixNano === "number")
                                message.startTimeUnixNano = object.startTimeUnixNano;
                            else if (typeof object.startTimeUnixNano === "object")
                                message.startTimeUnixNano = new $util.LongBits(object.startTimeUnixNano.low >>> 0, object.startTimeUnixNano.high >>> 0).toNumber();
                        if (object.timeUnixNano != null)
                            if ($util.Long)
                                (message.timeUnixNano = $util.Long.fromValue(object.timeUnixNano)).unsigned = false;
                            else if (typeof object.timeUnixNano === "string")
                                message.timeUnixNano = parseInt(object.timeUnixNano, 10);
                            else if (typeof object.timeUnixNano === "number")
                                message.timeUnixNano = object.timeUnixNano;
                            else if (typeof object.timeUnixNano === "object")
                                message.timeUnixNano = new $util.LongBits(object.timeUnixNano.low >>> 0, object.timeUnixNano.high >>> 0).toNumber();
                        if (object.count != null)
                            if ($util.Long)
                                (message.count = $util.Long.fromValue(object.count)).unsigned = false;
                            else if (typeof object.count === "string")
                                message.count = parseInt(object.count, 10);
                            else if (typeof object.count === "number")
                                message.count = object.count;
                            else if (typeof object.count === "object")
                                message.count = new $util.LongBits(object.count.low >>> 0, object.count.high >>> 0).toNumber();
                        if (object.sum != null)
                            message.sum = Number(object.sum);
                        if (object.bucketCounts) {
                            if (!Array.isArray(object.bucketCounts))
                                throw TypeError(".opentelemetry.proto.metrics.v1.HistogramDataPoint.bucketCounts: array expected");
                            message.bucketCounts = [];
                            for (var i = 0; i < object.bucketCounts.length; ++i)
                                if ($util.Long)
                                    (message.bucketCounts[i] = $util.Long.fromValue(object.bucketCounts[i])).unsigned = false;
                                else if (typeof object.bucketCounts[i] === "string")
                                    message.bucketCounts[i] = parseInt(object.bucketCounts[i], 10);
                                else if (typeof object.bucketCounts[i] === "number")
                                    message.bucketCounts[i] = object.bucketCounts[i];
                                else if (typeof object.bucketCounts[i] === "object")
                                    message.bucketCounts[i] = new $util.LongBits(object.bucketCounts[i].low >>> 0, object.bucketCounts[i].high >>> 0).toNumber();
                        }
                        if (object.explicitBounds) {
                            if (!Array.isArray(object.explicitBounds))
                                throw TypeError(".opentelemetry.proto.metrics.v1.HistogramDataPoint.explicitBounds: array expected");
                            message.explicitBounds = [];
                            for (var i = 0; i < object.explicitBounds.length; ++i)
                                message.explicitBounds[i] = Number(object.explicitBounds[i]);
                        }
                        if (object.exemplars) {
                            if (!Array.isArray(object.exemplars))
                                throw TypeError(".opentelemetry.proto.metrics.v1.HistogramDataPoint.exemplars: array expected");
                            message.exemplars = [];
                            for (var i = 0; i < object.exemplars.length; ++i) {
                                if (typeof object.exemplars[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.metrics.v1.HistogramDataPoint.exemplars: object expected");
                                message.exemplars[i] = $root.opentelemetry.proto.metrics.v1.Exemplar.fromObject(object.exemplars[i]);
                            }
                        }
                        if (object.flags != null)
                            message.flags = object.flags >>> 0;
                        if (object.min != null)
                            message.min = Number(object.min);
                        if (object.max != null)
                            message.max = Number(object.max);
                        return message;
                    };
                    /**
                     * Creates a plain object from a HistogramDataPoint message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.HistogramDataPoint} message HistogramDataPoint
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    HistogramDataPoint.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults) {
                            object.bucketCounts = [];
                            object.explicitBounds = [];
                            object.exemplars = [];
                            object.attributes = [];
                        }
                        if (options.defaults) {
                            if ($util.Long) {
                                var long = new $util.Long(0, 0, false);
                                object.startTimeUnixNano = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                            }
                            else
                                object.startTimeUnixNano = options.longs === String ? "0" : 0;
                            if ($util.Long) {
                                var long = new $util.Long(0, 0, false);
                                object.timeUnixNano = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                            }
                            else
                                object.timeUnixNano = options.longs === String ? "0" : 0;
                            if ($util.Long) {
                                var long = new $util.Long(0, 0, false);
                                object.count = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                            }
                            else
                                object.count = options.longs === String ? "0" : 0;
                            object.flags = 0;
                        }
                        if (message.startTimeUnixNano != null && message.hasOwnProperty("startTimeUnixNano"))
                            if (typeof message.startTimeUnixNano === "number")
                                object.startTimeUnixNano = options.longs === String ? String(message.startTimeUnixNano) : message.startTimeUnixNano;
                            else
                                object.startTimeUnixNano = options.longs === String ? $util.Long.prototype.toString.call(message.startTimeUnixNano) : options.longs === Number ? new $util.LongBits(message.startTimeUnixNano.low >>> 0, message.startTimeUnixNano.high >>> 0).toNumber() : message.startTimeUnixNano;
                        if (message.timeUnixNano != null && message.hasOwnProperty("timeUnixNano"))
                            if (typeof message.timeUnixNano === "number")
                                object.timeUnixNano = options.longs === String ? String(message.timeUnixNano) : message.timeUnixNano;
                            else
                                object.timeUnixNano = options.longs === String ? $util.Long.prototype.toString.call(message.timeUnixNano) : options.longs === Number ? new $util.LongBits(message.timeUnixNano.low >>> 0, message.timeUnixNano.high >>> 0).toNumber() : message.timeUnixNano;
                        if (message.count != null && message.hasOwnProperty("count"))
                            if (typeof message.count === "number")
                                object.count = options.longs === String ? String(message.count) : message.count;
                            else
                                object.count = options.longs === String ? $util.Long.prototype.toString.call(message.count) : options.longs === Number ? new $util.LongBits(message.count.low >>> 0, message.count.high >>> 0).toNumber() : message.count;
                        if (message.sum != null && message.hasOwnProperty("sum")) {
                            object.sum = options.json && !isFinite(message.sum) ? String(message.sum) : message.sum;
                            if (options.oneofs)
                                object._sum = "sum";
                        }
                        if (message.bucketCounts && message.bucketCounts.length) {
                            object.bucketCounts = [];
                            for (var j = 0; j < message.bucketCounts.length; ++j)
                                if (typeof message.bucketCounts[j] === "number")
                                    object.bucketCounts[j] = options.longs === String ? String(message.bucketCounts[j]) : message.bucketCounts[j];
                                else
                                    object.bucketCounts[j] = options.longs === String ? $util.Long.prototype.toString.call(message.bucketCounts[j]) : options.longs === Number ? new $util.LongBits(message.bucketCounts[j].low >>> 0, message.bucketCounts[j].high >>> 0).toNumber() : message.bucketCounts[j];
                        }
                        if (message.explicitBounds && message.explicitBounds.length) {
                            object.explicitBounds = [];
                            for (var j = 0; j < message.explicitBounds.length; ++j)
                                object.explicitBounds[j] = options.json && !isFinite(message.explicitBounds[j]) ? String(message.explicitBounds[j]) : message.explicitBounds[j];
                        }
                        if (message.exemplars && message.exemplars.length) {
                            object.exemplars = [];
                            for (var j = 0; j < message.exemplars.length; ++j)
                                object.exemplars[j] = $root.opentelemetry.proto.metrics.v1.Exemplar.toObject(message.exemplars[j], options);
                        }
                        if (message.attributes && message.attributes.length) {
                            object.attributes = [];
                            for (var j = 0; j < message.attributes.length; ++j)
                                object.attributes[j] = $root.opentelemetry.proto.common.v1.KeyValue.toObject(message.attributes[j], options);
                        }
                        if (message.flags != null && message.hasOwnProperty("flags"))
                            object.flags = message.flags;
                        if (message.min != null && message.hasOwnProperty("min")) {
                            object.min = options.json && !isFinite(message.min) ? String(message.min) : message.min;
                            if (options.oneofs)
                                object._min = "min";
                        }
                        if (message.max != null && message.hasOwnProperty("max")) {
                            object.max = options.json && !isFinite(message.max) ? String(message.max) : message.max;
                            if (options.oneofs)
                                object._max = "max";
                        }
                        return object;
                    };
                    /**
                     * Converts this HistogramDataPoint to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    HistogramDataPoint.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for HistogramDataPoint
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.metrics.v1.HistogramDataPoint
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    HistogramDataPoint.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.metrics.v1.HistogramDataPoint";
                    };
                    return HistogramDataPoint;
                })();
                v1.ExponentialHistogramDataPoint = (function () {
                    /**
                     * Properties of an ExponentialHistogramDataPoint.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @interface IExponentialHistogramDataPoint
                     * @property {Array.<opentelemetry.proto.common.v1.IKeyValue>|null} [attributes] ExponentialHistogramDataPoint attributes
                     * @property {number|Long|null} [startTimeUnixNano] ExponentialHistogramDataPoint startTimeUnixNano
                     * @property {number|Long|null} [timeUnixNano] ExponentialHistogramDataPoint timeUnixNano
                     * @property {number|Long|null} [count] ExponentialHistogramDataPoint count
                     * @property {number|null} [sum] ExponentialHistogramDataPoint sum
                     * @property {number|null} [scale] ExponentialHistogramDataPoint scale
                     * @property {number|Long|null} [zeroCount] ExponentialHistogramDataPoint zeroCount
                     * @property {opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.IBuckets|null} [positive] ExponentialHistogramDataPoint positive
                     * @property {opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.IBuckets|null} [negative] ExponentialHistogramDataPoint negative
                     * @property {number|null} [flags] ExponentialHistogramDataPoint flags
                     * @property {Array.<opentelemetry.proto.metrics.v1.IExemplar>|null} [exemplars] ExponentialHistogramDataPoint exemplars
                     * @property {number|null} [min] ExponentialHistogramDataPoint min
                     * @property {number|null} [max] ExponentialHistogramDataPoint max
                     * @property {number|null} [zeroThreshold] ExponentialHistogramDataPoint zeroThreshold
                     */
                    /**
                     * Constructs a new ExponentialHistogramDataPoint.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @classdesc Represents an ExponentialHistogramDataPoint.
                     * @implements IExponentialHistogramDataPoint
                     * @constructor
                     * @param {opentelemetry.proto.metrics.v1.IExponentialHistogramDataPoint=} [properties] Properties to set
                     */
                    function ExponentialHistogramDataPoint(properties) {
                        this.attributes = [];
                        this.exemplars = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * ExponentialHistogramDataPoint attributes.
                     * @member {Array.<opentelemetry.proto.common.v1.IKeyValue>} attributes
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @instance
                     */
                    ExponentialHistogramDataPoint.prototype.attributes = $util.emptyArray;
                    /**
                     * ExponentialHistogramDataPoint startTimeUnixNano.
                     * @member {number|Long|null|undefined} startTimeUnixNano
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @instance
                     */
                    ExponentialHistogramDataPoint.prototype.startTimeUnixNano = null;
                    /**
                     * ExponentialHistogramDataPoint timeUnixNano.
                     * @member {number|Long|null|undefined} timeUnixNano
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @instance
                     */
                    ExponentialHistogramDataPoint.prototype.timeUnixNano = null;
                    /**
                     * ExponentialHistogramDataPoint count.
                     * @member {number|Long|null|undefined} count
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @instance
                     */
                    ExponentialHistogramDataPoint.prototype.count = null;
                    /**
                     * ExponentialHistogramDataPoint sum.
                     * @member {number|null|undefined} sum
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @instance
                     */
                    ExponentialHistogramDataPoint.prototype.sum = null;
                    /**
                     * ExponentialHistogramDataPoint scale.
                     * @member {number|null|undefined} scale
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @instance
                     */
                    ExponentialHistogramDataPoint.prototype.scale = null;
                    /**
                     * ExponentialHistogramDataPoint zeroCount.
                     * @member {number|Long|null|undefined} zeroCount
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @instance
                     */
                    ExponentialHistogramDataPoint.prototype.zeroCount = null;
                    /**
                     * ExponentialHistogramDataPoint positive.
                     * @member {opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.IBuckets|null|undefined} positive
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @instance
                     */
                    ExponentialHistogramDataPoint.prototype.positive = null;
                    /**
                     * ExponentialHistogramDataPoint negative.
                     * @member {opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.IBuckets|null|undefined} negative
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @instance
                     */
                    ExponentialHistogramDataPoint.prototype.negative = null;
                    /**
                     * ExponentialHistogramDataPoint flags.
                     * @member {number|null|undefined} flags
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @instance
                     */
                    ExponentialHistogramDataPoint.prototype.flags = null;
                    /**
                     * ExponentialHistogramDataPoint exemplars.
                     * @member {Array.<opentelemetry.proto.metrics.v1.IExemplar>} exemplars
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @instance
                     */
                    ExponentialHistogramDataPoint.prototype.exemplars = $util.emptyArray;
                    /**
                     * ExponentialHistogramDataPoint min.
                     * @member {number|null|undefined} min
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @instance
                     */
                    ExponentialHistogramDataPoint.prototype.min = null;
                    /**
                     * ExponentialHistogramDataPoint max.
                     * @member {number|null|undefined} max
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @instance
                     */
                    ExponentialHistogramDataPoint.prototype.max = null;
                    /**
                     * ExponentialHistogramDataPoint zeroThreshold.
                     * @member {number|null|undefined} zeroThreshold
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @instance
                     */
                    ExponentialHistogramDataPoint.prototype.zeroThreshold = null;
                    // OneOf field names bound to virtual getters and setters
                    var $oneOfFields;
                    /**
                     * ExponentialHistogramDataPoint _sum.
                     * @member {"sum"|undefined} _sum
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @instance
                     */
                    Object.defineProperty(ExponentialHistogramDataPoint.prototype, "_sum", {
                        get: $util.oneOfGetter($oneOfFields = ["sum"]),
                        set: $util.oneOfSetter($oneOfFields)
                    });
                    /**
                     * ExponentialHistogramDataPoint _min.
                     * @member {"min"|undefined} _min
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @instance
                     */
                    Object.defineProperty(ExponentialHistogramDataPoint.prototype, "_min", {
                        get: $util.oneOfGetter($oneOfFields = ["min"]),
                        set: $util.oneOfSetter($oneOfFields)
                    });
                    /**
                     * ExponentialHistogramDataPoint _max.
                     * @member {"max"|undefined} _max
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @instance
                     */
                    Object.defineProperty(ExponentialHistogramDataPoint.prototype, "_max", {
                        get: $util.oneOfGetter($oneOfFields = ["max"]),
                        set: $util.oneOfSetter($oneOfFields)
                    });
                    /**
                     * Creates a new ExponentialHistogramDataPoint instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IExponentialHistogramDataPoint=} [properties] Properties to set
                     * @returns {opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint} ExponentialHistogramDataPoint instance
                     */
                    ExponentialHistogramDataPoint.create = function create(properties) {
                        return new ExponentialHistogramDataPoint(properties);
                    };
                    /**
                     * Encodes the specified ExponentialHistogramDataPoint message. Does not implicitly {@link opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IExponentialHistogramDataPoint} message ExponentialHistogramDataPoint message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    ExponentialHistogramDataPoint.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.attributes != null && message.attributes.length)
                            for (var i = 0; i < message.attributes.length; ++i)
                                $root.opentelemetry.proto.common.v1.KeyValue.encode(message.attributes[i], writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                        if (message.startTimeUnixNano != null && Object.hasOwnProperty.call(message, "startTimeUnixNano"))
                            writer.uint32(/* id 2, wireType 1 =*/ 17).fixed64(message.startTimeUnixNano);
                        if (message.timeUnixNano != null && Object.hasOwnProperty.call(message, "timeUnixNano"))
                            writer.uint32(/* id 3, wireType 1 =*/ 25).fixed64(message.timeUnixNano);
                        if (message.count != null && Object.hasOwnProperty.call(message, "count"))
                            writer.uint32(/* id 4, wireType 1 =*/ 33).fixed64(message.count);
                        if (message.sum != null && Object.hasOwnProperty.call(message, "sum"))
                            writer.uint32(/* id 5, wireType 1 =*/ 41).double(message.sum);
                        if (message.scale != null && Object.hasOwnProperty.call(message, "scale"))
                            writer.uint32(/* id 6, wireType 0 =*/ 48).sint32(message.scale);
                        if (message.zeroCount != null && Object.hasOwnProperty.call(message, "zeroCount"))
                            writer.uint32(/* id 7, wireType 1 =*/ 57).fixed64(message.zeroCount);
                        if (message.positive != null && Object.hasOwnProperty.call(message, "positive"))
                            $root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets.encode(message.positive, writer.uint32(/* id 8, wireType 2 =*/ 66).fork()).ldelim();
                        if (message.negative != null && Object.hasOwnProperty.call(message, "negative"))
                            $root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets.encode(message.negative, writer.uint32(/* id 9, wireType 2 =*/ 74).fork()).ldelim();
                        if (message.flags != null && Object.hasOwnProperty.call(message, "flags"))
                            writer.uint32(/* id 10, wireType 0 =*/ 80).uint32(message.flags);
                        if (message.exemplars != null && message.exemplars.length)
                            for (var i = 0; i < message.exemplars.length; ++i)
                                $root.opentelemetry.proto.metrics.v1.Exemplar.encode(message.exemplars[i], writer.uint32(/* id 11, wireType 2 =*/ 90).fork()).ldelim();
                        if (message.min != null && Object.hasOwnProperty.call(message, "min"))
                            writer.uint32(/* id 12, wireType 1 =*/ 97).double(message.min);
                        if (message.max != null && Object.hasOwnProperty.call(message, "max"))
                            writer.uint32(/* id 13, wireType 1 =*/ 105).double(message.max);
                        if (message.zeroThreshold != null && Object.hasOwnProperty.call(message, "zeroThreshold"))
                            writer.uint32(/* id 14, wireType 1 =*/ 113).double(message.zeroThreshold);
                        return writer;
                    };
                    /**
                     * Encodes the specified ExponentialHistogramDataPoint message, length delimited. Does not implicitly {@link opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IExponentialHistogramDataPoint} message ExponentialHistogramDataPoint message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    ExponentialHistogramDataPoint.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes an ExponentialHistogramDataPoint message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint} ExponentialHistogramDataPoint
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    ExponentialHistogramDataPoint.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    if (!(message.attributes && message.attributes.length))
                                        message.attributes = [];
                                    message.attributes.push($root.opentelemetry.proto.common.v1.KeyValue.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 2: {
                                    message.startTimeUnixNano = reader.fixed64();
                                    break;
                                }
                                case 3: {
                                    message.timeUnixNano = reader.fixed64();
                                    break;
                                }
                                case 4: {
                                    message.count = reader.fixed64();
                                    break;
                                }
                                case 5: {
                                    message.sum = reader.double();
                                    break;
                                }
                                case 6: {
                                    message.scale = reader.sint32();
                                    break;
                                }
                                case 7: {
                                    message.zeroCount = reader.fixed64();
                                    break;
                                }
                                case 8: {
                                    message.positive = $root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets.decode(reader, reader.uint32());
                                    break;
                                }
                                case 9: {
                                    message.negative = $root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets.decode(reader, reader.uint32());
                                    break;
                                }
                                case 10: {
                                    message.flags = reader.uint32();
                                    break;
                                }
                                case 11: {
                                    if (!(message.exemplars && message.exemplars.length))
                                        message.exemplars = [];
                                    message.exemplars.push($root.opentelemetry.proto.metrics.v1.Exemplar.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 12: {
                                    message.min = reader.double();
                                    break;
                                }
                                case 13: {
                                    message.max = reader.double();
                                    break;
                                }
                                case 14: {
                                    message.zeroThreshold = reader.double();
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes an ExponentialHistogramDataPoint message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint} ExponentialHistogramDataPoint
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    ExponentialHistogramDataPoint.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies an ExponentialHistogramDataPoint message.
                     * @function verify
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    ExponentialHistogramDataPoint.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        var properties = {};
                        if (message.attributes != null && message.hasOwnProperty("attributes")) {
                            if (!Array.isArray(message.attributes))
                                return "attributes: array expected";
                            for (var i = 0; i < message.attributes.length; ++i) {
                                var error = $root.opentelemetry.proto.common.v1.KeyValue.verify(message.attributes[i]);
                                if (error)
                                    return "attributes." + error;
                            }
                        }
                        if (message.startTimeUnixNano != null && message.hasOwnProperty("startTimeUnixNano"))
                            if (!$util.isInteger(message.startTimeUnixNano) && !(message.startTimeUnixNano && $util.isInteger(message.startTimeUnixNano.low) && $util.isInteger(message.startTimeUnixNano.high)))
                                return "startTimeUnixNano: integer|Long expected";
                        if (message.timeUnixNano != null && message.hasOwnProperty("timeUnixNano"))
                            if (!$util.isInteger(message.timeUnixNano) && !(message.timeUnixNano && $util.isInteger(message.timeUnixNano.low) && $util.isInteger(message.timeUnixNano.high)))
                                return "timeUnixNano: integer|Long expected";
                        if (message.count != null && message.hasOwnProperty("count"))
                            if (!$util.isInteger(message.count) && !(message.count && $util.isInteger(message.count.low) && $util.isInteger(message.count.high)))
                                return "count: integer|Long expected";
                        if (message.sum != null && message.hasOwnProperty("sum")) {
                            properties._sum = 1;
                            if (typeof message.sum !== "number")
                                return "sum: number expected";
                        }
                        if (message.scale != null && message.hasOwnProperty("scale"))
                            if (!$util.isInteger(message.scale))
                                return "scale: integer expected";
                        if (message.zeroCount != null && message.hasOwnProperty("zeroCount"))
                            if (!$util.isInteger(message.zeroCount) && !(message.zeroCount && $util.isInteger(message.zeroCount.low) && $util.isInteger(message.zeroCount.high)))
                                return "zeroCount: integer|Long expected";
                        if (message.positive != null && message.hasOwnProperty("positive")) {
                            var error = $root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets.verify(message.positive);
                            if (error)
                                return "positive." + error;
                        }
                        if (message.negative != null && message.hasOwnProperty("negative")) {
                            var error = $root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets.verify(message.negative);
                            if (error)
                                return "negative." + error;
                        }
                        if (message.flags != null && message.hasOwnProperty("flags"))
                            if (!$util.isInteger(message.flags))
                                return "flags: integer expected";
                        if (message.exemplars != null && message.hasOwnProperty("exemplars")) {
                            if (!Array.isArray(message.exemplars))
                                return "exemplars: array expected";
                            for (var i = 0; i < message.exemplars.length; ++i) {
                                var error = $root.opentelemetry.proto.metrics.v1.Exemplar.verify(message.exemplars[i]);
                                if (error)
                                    return "exemplars." + error;
                            }
                        }
                        if (message.min != null && message.hasOwnProperty("min")) {
                            properties._min = 1;
                            if (typeof message.min !== "number")
                                return "min: number expected";
                        }
                        if (message.max != null && message.hasOwnProperty("max")) {
                            properties._max = 1;
                            if (typeof message.max !== "number")
                                return "max: number expected";
                        }
                        if (message.zeroThreshold != null && message.hasOwnProperty("zeroThreshold"))
                            if (typeof message.zeroThreshold !== "number")
                                return "zeroThreshold: number expected";
                        return null;
                    };
                    /**
                     * Creates an ExponentialHistogramDataPoint message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint} ExponentialHistogramDataPoint
                     */
                    ExponentialHistogramDataPoint.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint)
                            return object;
                        var message = new $root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint();
                        if (object.attributes) {
                            if (!Array.isArray(object.attributes))
                                throw TypeError(".opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.attributes: array expected");
                            message.attributes = [];
                            for (var i = 0; i < object.attributes.length; ++i) {
                                if (typeof object.attributes[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.attributes: object expected");
                                message.attributes[i] = $root.opentelemetry.proto.common.v1.KeyValue.fromObject(object.attributes[i]);
                            }
                        }
                        if (object.startTimeUnixNano != null)
                            if ($util.Long)
                                (message.startTimeUnixNano = $util.Long.fromValue(object.startTimeUnixNano)).unsigned = false;
                            else if (typeof object.startTimeUnixNano === "string")
                                message.startTimeUnixNano = parseInt(object.startTimeUnixNano, 10);
                            else if (typeof object.startTimeUnixNano === "number")
                                message.startTimeUnixNano = object.startTimeUnixNano;
                            else if (typeof object.startTimeUnixNano === "object")
                                message.startTimeUnixNano = new $util.LongBits(object.startTimeUnixNano.low >>> 0, object.startTimeUnixNano.high >>> 0).toNumber();
                        if (object.timeUnixNano != null)
                            if ($util.Long)
                                (message.timeUnixNano = $util.Long.fromValue(object.timeUnixNano)).unsigned = false;
                            else if (typeof object.timeUnixNano === "string")
                                message.timeUnixNano = parseInt(object.timeUnixNano, 10);
                            else if (typeof object.timeUnixNano === "number")
                                message.timeUnixNano = object.timeUnixNano;
                            else if (typeof object.timeUnixNano === "object")
                                message.timeUnixNano = new $util.LongBits(object.timeUnixNano.low >>> 0, object.timeUnixNano.high >>> 0).toNumber();
                        if (object.count != null)
                            if ($util.Long)
                                (message.count = $util.Long.fromValue(object.count)).unsigned = false;
                            else if (typeof object.count === "string")
                                message.count = parseInt(object.count, 10);
                            else if (typeof object.count === "number")
                                message.count = object.count;
                            else if (typeof object.count === "object")
                                message.count = new $util.LongBits(object.count.low >>> 0, object.count.high >>> 0).toNumber();
                        if (object.sum != null)
                            message.sum = Number(object.sum);
                        if (object.scale != null)
                            message.scale = object.scale | 0;
                        if (object.zeroCount != null)
                            if ($util.Long)
                                (message.zeroCount = $util.Long.fromValue(object.zeroCount)).unsigned = false;
                            else if (typeof object.zeroCount === "string")
                                message.zeroCount = parseInt(object.zeroCount, 10);
                            else if (typeof object.zeroCount === "number")
                                message.zeroCount = object.zeroCount;
                            else if (typeof object.zeroCount === "object")
                                message.zeroCount = new $util.LongBits(object.zeroCount.low >>> 0, object.zeroCount.high >>> 0).toNumber();
                        if (object.positive != null) {
                            if (typeof object.positive !== "object")
                                throw TypeError(".opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.positive: object expected");
                            message.positive = $root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets.fromObject(object.positive);
                        }
                        if (object.negative != null) {
                            if (typeof object.negative !== "object")
                                throw TypeError(".opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.negative: object expected");
                            message.negative = $root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets.fromObject(object.negative);
                        }
                        if (object.flags != null)
                            message.flags = object.flags >>> 0;
                        if (object.exemplars) {
                            if (!Array.isArray(object.exemplars))
                                throw TypeError(".opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.exemplars: array expected");
                            message.exemplars = [];
                            for (var i = 0; i < object.exemplars.length; ++i) {
                                if (typeof object.exemplars[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.exemplars: object expected");
                                message.exemplars[i] = $root.opentelemetry.proto.metrics.v1.Exemplar.fromObject(object.exemplars[i]);
                            }
                        }
                        if (object.min != null)
                            message.min = Number(object.min);
                        if (object.max != null)
                            message.max = Number(object.max);
                        if (object.zeroThreshold != null)
                            message.zeroThreshold = Number(object.zeroThreshold);
                        return message;
                    };
                    /**
                     * Creates a plain object from an ExponentialHistogramDataPoint message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint} message ExponentialHistogramDataPoint
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    ExponentialHistogramDataPoint.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults) {
                            object.attributes = [];
                            object.exemplars = [];
                        }
                        if (options.defaults) {
                            if ($util.Long) {
                                var long = new $util.Long(0, 0, false);
                                object.startTimeUnixNano = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                            }
                            else
                                object.startTimeUnixNano = options.longs === String ? "0" : 0;
                            if ($util.Long) {
                                var long = new $util.Long(0, 0, false);
                                object.timeUnixNano = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                            }
                            else
                                object.timeUnixNano = options.longs === String ? "0" : 0;
                            if ($util.Long) {
                                var long = new $util.Long(0, 0, false);
                                object.count = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                            }
                            else
                                object.count = options.longs === String ? "0" : 0;
                            object.scale = 0;
                            if ($util.Long) {
                                var long = new $util.Long(0, 0, false);
                                object.zeroCount = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                            }
                            else
                                object.zeroCount = options.longs === String ? "0" : 0;
                            object.positive = null;
                            object.negative = null;
                            object.flags = 0;
                            object.zeroThreshold = 0;
                        }
                        if (message.attributes && message.attributes.length) {
                            object.attributes = [];
                            for (var j = 0; j < message.attributes.length; ++j)
                                object.attributes[j] = $root.opentelemetry.proto.common.v1.KeyValue.toObject(message.attributes[j], options);
                        }
                        if (message.startTimeUnixNano != null && message.hasOwnProperty("startTimeUnixNano"))
                            if (typeof message.startTimeUnixNano === "number")
                                object.startTimeUnixNano = options.longs === String ? String(message.startTimeUnixNano) : message.startTimeUnixNano;
                            else
                                object.startTimeUnixNano = options.longs === String ? $util.Long.prototype.toString.call(message.startTimeUnixNano) : options.longs === Number ? new $util.LongBits(message.startTimeUnixNano.low >>> 0, message.startTimeUnixNano.high >>> 0).toNumber() : message.startTimeUnixNano;
                        if (message.timeUnixNano != null && message.hasOwnProperty("timeUnixNano"))
                            if (typeof message.timeUnixNano === "number")
                                object.timeUnixNano = options.longs === String ? String(message.timeUnixNano) : message.timeUnixNano;
                            else
                                object.timeUnixNano = options.longs === String ? $util.Long.prototype.toString.call(message.timeUnixNano) : options.longs === Number ? new $util.LongBits(message.timeUnixNano.low >>> 0, message.timeUnixNano.high >>> 0).toNumber() : message.timeUnixNano;
                        if (message.count != null && message.hasOwnProperty("count"))
                            if (typeof message.count === "number")
                                object.count = options.longs === String ? String(message.count) : message.count;
                            else
                                object.count = options.longs === String ? $util.Long.prototype.toString.call(message.count) : options.longs === Number ? new $util.LongBits(message.count.low >>> 0, message.count.high >>> 0).toNumber() : message.count;
                        if (message.sum != null && message.hasOwnProperty("sum")) {
                            object.sum = options.json && !isFinite(message.sum) ? String(message.sum) : message.sum;
                            if (options.oneofs)
                                object._sum = "sum";
                        }
                        if (message.scale != null && message.hasOwnProperty("scale"))
                            object.scale = message.scale;
                        if (message.zeroCount != null && message.hasOwnProperty("zeroCount"))
                            if (typeof message.zeroCount === "number")
                                object.zeroCount = options.longs === String ? String(message.zeroCount) : message.zeroCount;
                            else
                                object.zeroCount = options.longs === String ? $util.Long.prototype.toString.call(message.zeroCount) : options.longs === Number ? new $util.LongBits(message.zeroCount.low >>> 0, message.zeroCount.high >>> 0).toNumber() : message.zeroCount;
                        if (message.positive != null && message.hasOwnProperty("positive"))
                            object.positive = $root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets.toObject(message.positive, options);
                        if (message.negative != null && message.hasOwnProperty("negative"))
                            object.negative = $root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets.toObject(message.negative, options);
                        if (message.flags != null && message.hasOwnProperty("flags"))
                            object.flags = message.flags;
                        if (message.exemplars && message.exemplars.length) {
                            object.exemplars = [];
                            for (var j = 0; j < message.exemplars.length; ++j)
                                object.exemplars[j] = $root.opentelemetry.proto.metrics.v1.Exemplar.toObject(message.exemplars[j], options);
                        }
                        if (message.min != null && message.hasOwnProperty("min")) {
                            object.min = options.json && !isFinite(message.min) ? String(message.min) : message.min;
                            if (options.oneofs)
                                object._min = "min";
                        }
                        if (message.max != null && message.hasOwnProperty("max")) {
                            object.max = options.json && !isFinite(message.max) ? String(message.max) : message.max;
                            if (options.oneofs)
                                object._max = "max";
                        }
                        if (message.zeroThreshold != null && message.hasOwnProperty("zeroThreshold"))
                            object.zeroThreshold = options.json && !isFinite(message.zeroThreshold) ? String(message.zeroThreshold) : message.zeroThreshold;
                        return object;
                    };
                    /**
                     * Converts this ExponentialHistogramDataPoint to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    ExponentialHistogramDataPoint.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for ExponentialHistogramDataPoint
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    ExponentialHistogramDataPoint.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint";
                    };
                    ExponentialHistogramDataPoint.Buckets = (function () {
                        /**
                         * Properties of a Buckets.
                         * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                         * @interface IBuckets
                         * @property {number|null} [offset] Buckets offset
                         * @property {Array.<number|Long>|null} [bucketCounts] Buckets bucketCounts
                         */
                        /**
                         * Constructs a new Buckets.
                         * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint
                         * @classdesc Represents a Buckets.
                         * @implements IBuckets
                         * @constructor
                         * @param {opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.IBuckets=} [properties] Properties to set
                         */
                        function Buckets(properties) {
                            this.bucketCounts = [];
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    if (properties[keys[i]] != null)
                                        this[keys[i]] = properties[keys[i]];
                        }
                        /**
                         * Buckets offset.
                         * @member {number|null|undefined} offset
                         * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets
                         * @instance
                         */
                        Buckets.prototype.offset = null;
                        /**
                         * Buckets bucketCounts.
                         * @member {Array.<number|Long>} bucketCounts
                         * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets
                         * @instance
                         */
                        Buckets.prototype.bucketCounts = $util.emptyArray;
                        /**
                         * Creates a new Buckets instance using the specified properties.
                         * @function create
                         * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets
                         * @static
                         * @param {opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.IBuckets=} [properties] Properties to set
                         * @returns {opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets} Buckets instance
                         */
                        Buckets.create = function create(properties) {
                            return new Buckets(properties);
                        };
                        /**
                         * Encodes the specified Buckets message. Does not implicitly {@link opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets.verify|verify} messages.
                         * @function encode
                         * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets
                         * @static
                         * @param {opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.IBuckets} message Buckets message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        Buckets.encode = function encode(message, writer) {
                            if (!writer)
                                writer = $Writer.create();
                            if (message.offset != null && Object.hasOwnProperty.call(message, "offset"))
                                writer.uint32(/* id 1, wireType 0 =*/ 8).sint32(message.offset);
                            if (message.bucketCounts != null && message.bucketCounts.length) {
                                writer.uint32(/* id 2, wireType 2 =*/ 18).fork();
                                for (var i = 0; i < message.bucketCounts.length; ++i)
                                    writer.uint64(message.bucketCounts[i]);
                                writer.ldelim();
                            }
                            return writer;
                        };
                        /**
                         * Encodes the specified Buckets message, length delimited. Does not implicitly {@link opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets.verify|verify} messages.
                         * @function encodeDelimited
                         * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets
                         * @static
                         * @param {opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.IBuckets} message Buckets message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        Buckets.encodeDelimited = function encodeDelimited(message, writer) {
                            return this.encode(message, writer).ldelim();
                        };
                        /**
                         * Decodes a Buckets message from the specified reader or buffer.
                         * @function decode
                         * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @param {number} [length] Message length if known beforehand
                         * @returns {opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets} Buckets
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        Buckets.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                    case 1: {
                                        message.offset = reader.sint32();
                                        break;
                                    }
                                    case 2: {
                                        if (!(message.bucketCounts && message.bucketCounts.length))
                                            message.bucketCounts = [];
                                        if ((tag & 7) === 2) {
                                            var end2 = reader.uint32() + reader.pos;
                                            while (reader.pos < end2)
                                                message.bucketCounts.push(reader.uint64());
                                        }
                                        else
                                            message.bucketCounts.push(reader.uint64());
                                        break;
                                    }
                                    default:
                                        reader.skipType(tag & 7);
                                        break;
                                }
                            }
                            return message;
                        };
                        /**
                         * Decodes a Buckets message from the specified reader or buffer, length delimited.
                         * @function decodeDelimited
                         * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @returns {opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets} Buckets
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        Buckets.decodeDelimited = function decodeDelimited(reader) {
                            if (!(reader instanceof $Reader))
                                reader = new $Reader(reader);
                            return this.decode(reader, reader.uint32());
                        };
                        /**
                         * Verifies a Buckets message.
                         * @function verify
                         * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets
                         * @static
                         * @param {Object.<string,*>} message Plain object to verify
                         * @returns {string|null} `null` if valid, otherwise the reason why it is not
                         */
                        Buckets.verify = function verify(message) {
                            if (typeof message !== "object" || message === null)
                                return "object expected";
                            if (message.offset != null && message.hasOwnProperty("offset"))
                                if (!$util.isInteger(message.offset))
                                    return "offset: integer expected";
                            if (message.bucketCounts != null && message.hasOwnProperty("bucketCounts")) {
                                if (!Array.isArray(message.bucketCounts))
                                    return "bucketCounts: array expected";
                                for (var i = 0; i < message.bucketCounts.length; ++i)
                                    if (!$util.isInteger(message.bucketCounts[i]) && !(message.bucketCounts[i] && $util.isInteger(message.bucketCounts[i].low) && $util.isInteger(message.bucketCounts[i].high)))
                                        return "bucketCounts: integer|Long[] expected";
                            }
                            return null;
                        };
                        /**
                         * Creates a Buckets message from a plain object. Also converts values to their respective internal types.
                         * @function fromObject
                         * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets
                         * @static
                         * @param {Object.<string,*>} object Plain object
                         * @returns {opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets} Buckets
                         */
                        Buckets.fromObject = function fromObject(object) {
                            if (object instanceof $root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets)
                                return object;
                            var message = new $root.opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets();
                            if (object.offset != null)
                                message.offset = object.offset | 0;
                            if (object.bucketCounts) {
                                if (!Array.isArray(object.bucketCounts))
                                    throw TypeError(".opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets.bucketCounts: array expected");
                                message.bucketCounts = [];
                                for (var i = 0; i < object.bucketCounts.length; ++i)
                                    if ($util.Long)
                                        (message.bucketCounts[i] = $util.Long.fromValue(object.bucketCounts[i])).unsigned = true;
                                    else if (typeof object.bucketCounts[i] === "string")
                                        message.bucketCounts[i] = parseInt(object.bucketCounts[i], 10);
                                    else if (typeof object.bucketCounts[i] === "number")
                                        message.bucketCounts[i] = object.bucketCounts[i];
                                    else if (typeof object.bucketCounts[i] === "object")
                                        message.bucketCounts[i] = new $util.LongBits(object.bucketCounts[i].low >>> 0, object.bucketCounts[i].high >>> 0).toNumber(true);
                            }
                            return message;
                        };
                        /**
                         * Creates a plain object from a Buckets message. Also converts values to other types if specified.
                         * @function toObject
                         * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets
                         * @static
                         * @param {opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets} message Buckets
                         * @param {$protobuf.IConversionOptions} [options] Conversion options
                         * @returns {Object.<string,*>} Plain object
                         */
                        Buckets.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.arrays || options.defaults)
                                object.bucketCounts = [];
                            if (options.defaults)
                                object.offset = 0;
                            if (message.offset != null && message.hasOwnProperty("offset"))
                                object.offset = message.offset;
                            if (message.bucketCounts && message.bucketCounts.length) {
                                object.bucketCounts = [];
                                for (var j = 0; j < message.bucketCounts.length; ++j)
                                    if (typeof message.bucketCounts[j] === "number")
                                        object.bucketCounts[j] = options.longs === String ? String(message.bucketCounts[j]) : message.bucketCounts[j];
                                    else
                                        object.bucketCounts[j] = options.longs === String ? $util.Long.prototype.toString.call(message.bucketCounts[j]) : options.longs === Number ? new $util.LongBits(message.bucketCounts[j].low >>> 0, message.bucketCounts[j].high >>> 0).toNumber(true) : message.bucketCounts[j];
                            }
                            return object;
                        };
                        /**
                         * Converts this Buckets to JSON.
                         * @function toJSON
                         * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets
                         * @instance
                         * @returns {Object.<string,*>} JSON object
                         */
                        Buckets.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };
                        /**
                         * Gets the default type url for Buckets
                         * @function getTypeUrl
                         * @memberof opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets
                         * @static
                         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns {string} The default type url
                         */
                        Buckets.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                            if (typeUrlPrefix === undefined) {
                                typeUrlPrefix = "type.googleapis.com";
                            }
                            return typeUrlPrefix + "/opentelemetry.proto.metrics.v1.ExponentialHistogramDataPoint.Buckets";
                        };
                        return Buckets;
                    })();
                    return ExponentialHistogramDataPoint;
                })();
                v1.SummaryDataPoint = (function () {
                    /**
                     * Properties of a SummaryDataPoint.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @interface ISummaryDataPoint
                     * @property {Array.<opentelemetry.proto.common.v1.IKeyValue>|null} [attributes] SummaryDataPoint attributes
                     * @property {number|Long|null} [startTimeUnixNano] SummaryDataPoint startTimeUnixNano
                     * @property {number|Long|null} [timeUnixNano] SummaryDataPoint timeUnixNano
                     * @property {number|Long|null} [count] SummaryDataPoint count
                     * @property {number|null} [sum] SummaryDataPoint sum
                     * @property {Array.<opentelemetry.proto.metrics.v1.SummaryDataPoint.IValueAtQuantile>|null} [quantileValues] SummaryDataPoint quantileValues
                     * @property {number|null} [flags] SummaryDataPoint flags
                     */
                    /**
                     * Constructs a new SummaryDataPoint.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @classdesc Represents a SummaryDataPoint.
                     * @implements ISummaryDataPoint
                     * @constructor
                     * @param {opentelemetry.proto.metrics.v1.ISummaryDataPoint=} [properties] Properties to set
                     */
                    function SummaryDataPoint(properties) {
                        this.attributes = [];
                        this.quantileValues = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * SummaryDataPoint attributes.
                     * @member {Array.<opentelemetry.proto.common.v1.IKeyValue>} attributes
                     * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint
                     * @instance
                     */
                    SummaryDataPoint.prototype.attributes = $util.emptyArray;
                    /**
                     * SummaryDataPoint startTimeUnixNano.
                     * @member {number|Long|null|undefined} startTimeUnixNano
                     * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint
                     * @instance
                     */
                    SummaryDataPoint.prototype.startTimeUnixNano = null;
                    /**
                     * SummaryDataPoint timeUnixNano.
                     * @member {number|Long|null|undefined} timeUnixNano
                     * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint
                     * @instance
                     */
                    SummaryDataPoint.prototype.timeUnixNano = null;
                    /**
                     * SummaryDataPoint count.
                     * @member {number|Long|null|undefined} count
                     * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint
                     * @instance
                     */
                    SummaryDataPoint.prototype.count = null;
                    /**
                     * SummaryDataPoint sum.
                     * @member {number|null|undefined} sum
                     * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint
                     * @instance
                     */
                    SummaryDataPoint.prototype.sum = null;
                    /**
                     * SummaryDataPoint quantileValues.
                     * @member {Array.<opentelemetry.proto.metrics.v1.SummaryDataPoint.IValueAtQuantile>} quantileValues
                     * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint
                     * @instance
                     */
                    SummaryDataPoint.prototype.quantileValues = $util.emptyArray;
                    /**
                     * SummaryDataPoint flags.
                     * @member {number|null|undefined} flags
                     * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint
                     * @instance
                     */
                    SummaryDataPoint.prototype.flags = null;
                    /**
                     * Creates a new SummaryDataPoint instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.ISummaryDataPoint=} [properties] Properties to set
                     * @returns {opentelemetry.proto.metrics.v1.SummaryDataPoint} SummaryDataPoint instance
                     */
                    SummaryDataPoint.create = function create(properties) {
                        return new SummaryDataPoint(properties);
                    };
                    /**
                     * Encodes the specified SummaryDataPoint message. Does not implicitly {@link opentelemetry.proto.metrics.v1.SummaryDataPoint.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.ISummaryDataPoint} message SummaryDataPoint message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    SummaryDataPoint.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.startTimeUnixNano != null && Object.hasOwnProperty.call(message, "startTimeUnixNano"))
                            writer.uint32(/* id 2, wireType 1 =*/ 17).fixed64(message.startTimeUnixNano);
                        if (message.timeUnixNano != null && Object.hasOwnProperty.call(message, "timeUnixNano"))
                            writer.uint32(/* id 3, wireType 1 =*/ 25).fixed64(message.timeUnixNano);
                        if (message.count != null && Object.hasOwnProperty.call(message, "count"))
                            writer.uint32(/* id 4, wireType 1 =*/ 33).fixed64(message.count);
                        if (message.sum != null && Object.hasOwnProperty.call(message, "sum"))
                            writer.uint32(/* id 5, wireType 1 =*/ 41).double(message.sum);
                        if (message.quantileValues != null && message.quantileValues.length)
                            for (var i = 0; i < message.quantileValues.length; ++i)
                                $root.opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile.encode(message.quantileValues[i], writer.uint32(/* id 6, wireType 2 =*/ 50).fork()).ldelim();
                        if (message.attributes != null && message.attributes.length)
                            for (var i = 0; i < message.attributes.length; ++i)
                                $root.opentelemetry.proto.common.v1.KeyValue.encode(message.attributes[i], writer.uint32(/* id 7, wireType 2 =*/ 58).fork()).ldelim();
                        if (message.flags != null && Object.hasOwnProperty.call(message, "flags"))
                            writer.uint32(/* id 8, wireType 0 =*/ 64).uint32(message.flags);
                        return writer;
                    };
                    /**
                     * Encodes the specified SummaryDataPoint message, length delimited. Does not implicitly {@link opentelemetry.proto.metrics.v1.SummaryDataPoint.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.ISummaryDataPoint} message SummaryDataPoint message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    SummaryDataPoint.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a SummaryDataPoint message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.metrics.v1.SummaryDataPoint} SummaryDataPoint
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    SummaryDataPoint.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.metrics.v1.SummaryDataPoint();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 7: {
                                    if (!(message.attributes && message.attributes.length))
                                        message.attributes = [];
                                    message.attributes.push($root.opentelemetry.proto.common.v1.KeyValue.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 2: {
                                    message.startTimeUnixNano = reader.fixed64();
                                    break;
                                }
                                case 3: {
                                    message.timeUnixNano = reader.fixed64();
                                    break;
                                }
                                case 4: {
                                    message.count = reader.fixed64();
                                    break;
                                }
                                case 5: {
                                    message.sum = reader.double();
                                    break;
                                }
                                case 6: {
                                    if (!(message.quantileValues && message.quantileValues.length))
                                        message.quantileValues = [];
                                    message.quantileValues.push($root.opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 8: {
                                    message.flags = reader.uint32();
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a SummaryDataPoint message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.metrics.v1.SummaryDataPoint} SummaryDataPoint
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    SummaryDataPoint.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a SummaryDataPoint message.
                     * @function verify
                     * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    SummaryDataPoint.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.attributes != null && message.hasOwnProperty("attributes")) {
                            if (!Array.isArray(message.attributes))
                                return "attributes: array expected";
                            for (var i = 0; i < message.attributes.length; ++i) {
                                var error = $root.opentelemetry.proto.common.v1.KeyValue.verify(message.attributes[i]);
                                if (error)
                                    return "attributes." + error;
                            }
                        }
                        if (message.startTimeUnixNano != null && message.hasOwnProperty("startTimeUnixNano"))
                            if (!$util.isInteger(message.startTimeUnixNano) && !(message.startTimeUnixNano && $util.isInteger(message.startTimeUnixNano.low) && $util.isInteger(message.startTimeUnixNano.high)))
                                return "startTimeUnixNano: integer|Long expected";
                        if (message.timeUnixNano != null && message.hasOwnProperty("timeUnixNano"))
                            if (!$util.isInteger(message.timeUnixNano) && !(message.timeUnixNano && $util.isInteger(message.timeUnixNano.low) && $util.isInteger(message.timeUnixNano.high)))
                                return "timeUnixNano: integer|Long expected";
                        if (message.count != null && message.hasOwnProperty("count"))
                            if (!$util.isInteger(message.count) && !(message.count && $util.isInteger(message.count.low) && $util.isInteger(message.count.high)))
                                return "count: integer|Long expected";
                        if (message.sum != null && message.hasOwnProperty("sum"))
                            if (typeof message.sum !== "number")
                                return "sum: number expected";
                        if (message.quantileValues != null && message.hasOwnProperty("quantileValues")) {
                            if (!Array.isArray(message.quantileValues))
                                return "quantileValues: array expected";
                            for (var i = 0; i < message.quantileValues.length; ++i) {
                                var error = $root.opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile.verify(message.quantileValues[i]);
                                if (error)
                                    return "quantileValues." + error;
                            }
                        }
                        if (message.flags != null && message.hasOwnProperty("flags"))
                            if (!$util.isInteger(message.flags))
                                return "flags: integer expected";
                        return null;
                    };
                    /**
                     * Creates a SummaryDataPoint message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.metrics.v1.SummaryDataPoint} SummaryDataPoint
                     */
                    SummaryDataPoint.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.metrics.v1.SummaryDataPoint)
                            return object;
                        var message = new $root.opentelemetry.proto.metrics.v1.SummaryDataPoint();
                        if (object.attributes) {
                            if (!Array.isArray(object.attributes))
                                throw TypeError(".opentelemetry.proto.metrics.v1.SummaryDataPoint.attributes: array expected");
                            message.attributes = [];
                            for (var i = 0; i < object.attributes.length; ++i) {
                                if (typeof object.attributes[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.metrics.v1.SummaryDataPoint.attributes: object expected");
                                message.attributes[i] = $root.opentelemetry.proto.common.v1.KeyValue.fromObject(object.attributes[i]);
                            }
                        }
                        if (object.startTimeUnixNano != null)
                            if ($util.Long)
                                (message.startTimeUnixNano = $util.Long.fromValue(object.startTimeUnixNano)).unsigned = false;
                            else if (typeof object.startTimeUnixNano === "string")
                                message.startTimeUnixNano = parseInt(object.startTimeUnixNano, 10);
                            else if (typeof object.startTimeUnixNano === "number")
                                message.startTimeUnixNano = object.startTimeUnixNano;
                            else if (typeof object.startTimeUnixNano === "object")
                                message.startTimeUnixNano = new $util.LongBits(object.startTimeUnixNano.low >>> 0, object.startTimeUnixNano.high >>> 0).toNumber();
                        if (object.timeUnixNano != null)
                            if ($util.Long)
                                (message.timeUnixNano = $util.Long.fromValue(object.timeUnixNano)).unsigned = false;
                            else if (typeof object.timeUnixNano === "string")
                                message.timeUnixNano = parseInt(object.timeUnixNano, 10);
                            else if (typeof object.timeUnixNano === "number")
                                message.timeUnixNano = object.timeUnixNano;
                            else if (typeof object.timeUnixNano === "object")
                                message.timeUnixNano = new $util.LongBits(object.timeUnixNano.low >>> 0, object.timeUnixNano.high >>> 0).toNumber();
                        if (object.count != null)
                            if ($util.Long)
                                (message.count = $util.Long.fromValue(object.count)).unsigned = false;
                            else if (typeof object.count === "string")
                                message.count = parseInt(object.count, 10);
                            else if (typeof object.count === "number")
                                message.count = object.count;
                            else if (typeof object.count === "object")
                                message.count = new $util.LongBits(object.count.low >>> 0, object.count.high >>> 0).toNumber();
                        if (object.sum != null)
                            message.sum = Number(object.sum);
                        if (object.quantileValues) {
                            if (!Array.isArray(object.quantileValues))
                                throw TypeError(".opentelemetry.proto.metrics.v1.SummaryDataPoint.quantileValues: array expected");
                            message.quantileValues = [];
                            for (var i = 0; i < object.quantileValues.length; ++i) {
                                if (typeof object.quantileValues[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.metrics.v1.SummaryDataPoint.quantileValues: object expected");
                                message.quantileValues[i] = $root.opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile.fromObject(object.quantileValues[i]);
                            }
                        }
                        if (object.flags != null)
                            message.flags = object.flags >>> 0;
                        return message;
                    };
                    /**
                     * Creates a plain object from a SummaryDataPoint message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.SummaryDataPoint} message SummaryDataPoint
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    SummaryDataPoint.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults) {
                            object.quantileValues = [];
                            object.attributes = [];
                        }
                        if (options.defaults) {
                            if ($util.Long) {
                                var long = new $util.Long(0, 0, false);
                                object.startTimeUnixNano = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                            }
                            else
                                object.startTimeUnixNano = options.longs === String ? "0" : 0;
                            if ($util.Long) {
                                var long = new $util.Long(0, 0, false);
                                object.timeUnixNano = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                            }
                            else
                                object.timeUnixNano = options.longs === String ? "0" : 0;
                            if ($util.Long) {
                                var long = new $util.Long(0, 0, false);
                                object.count = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                            }
                            else
                                object.count = options.longs === String ? "0" : 0;
                            object.sum = 0;
                            object.flags = 0;
                        }
                        if (message.startTimeUnixNano != null && message.hasOwnProperty("startTimeUnixNano"))
                            if (typeof message.startTimeUnixNano === "number")
                                object.startTimeUnixNano = options.longs === String ? String(message.startTimeUnixNano) : message.startTimeUnixNano;
                            else
                                object.startTimeUnixNano = options.longs === String ? $util.Long.prototype.toString.call(message.startTimeUnixNano) : options.longs === Number ? new $util.LongBits(message.startTimeUnixNano.low >>> 0, message.startTimeUnixNano.high >>> 0).toNumber() : message.startTimeUnixNano;
                        if (message.timeUnixNano != null && message.hasOwnProperty("timeUnixNano"))
                            if (typeof message.timeUnixNano === "number")
                                object.timeUnixNano = options.longs === String ? String(message.timeUnixNano) : message.timeUnixNano;
                            else
                                object.timeUnixNano = options.longs === String ? $util.Long.prototype.toString.call(message.timeUnixNano) : options.longs === Number ? new $util.LongBits(message.timeUnixNano.low >>> 0, message.timeUnixNano.high >>> 0).toNumber() : message.timeUnixNano;
                        if (message.count != null && message.hasOwnProperty("count"))
                            if (typeof message.count === "number")
                                object.count = options.longs === String ? String(message.count) : message.count;
                            else
                                object.count = options.longs === String ? $util.Long.prototype.toString.call(message.count) : options.longs === Number ? new $util.LongBits(message.count.low >>> 0, message.count.high >>> 0).toNumber() : message.count;
                        if (message.sum != null && message.hasOwnProperty("sum"))
                            object.sum = options.json && !isFinite(message.sum) ? String(message.sum) : message.sum;
                        if (message.quantileValues && message.quantileValues.length) {
                            object.quantileValues = [];
                            for (var j = 0; j < message.quantileValues.length; ++j)
                                object.quantileValues[j] = $root.opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile.toObject(message.quantileValues[j], options);
                        }
                        if (message.attributes && message.attributes.length) {
                            object.attributes = [];
                            for (var j = 0; j < message.attributes.length; ++j)
                                object.attributes[j] = $root.opentelemetry.proto.common.v1.KeyValue.toObject(message.attributes[j], options);
                        }
                        if (message.flags != null && message.hasOwnProperty("flags"))
                            object.flags = message.flags;
                        return object;
                    };
                    /**
                     * Converts this SummaryDataPoint to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    SummaryDataPoint.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for SummaryDataPoint
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    SummaryDataPoint.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.metrics.v1.SummaryDataPoint";
                    };
                    SummaryDataPoint.ValueAtQuantile = (function () {
                        /**
                         * Properties of a ValueAtQuantile.
                         * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint
                         * @interface IValueAtQuantile
                         * @property {number|null} [quantile] ValueAtQuantile quantile
                         * @property {number|null} [value] ValueAtQuantile value
                         */
                        /**
                         * Constructs a new ValueAtQuantile.
                         * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint
                         * @classdesc Represents a ValueAtQuantile.
                         * @implements IValueAtQuantile
                         * @constructor
                         * @param {opentelemetry.proto.metrics.v1.SummaryDataPoint.IValueAtQuantile=} [properties] Properties to set
                         */
                        function ValueAtQuantile(properties) {
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    if (properties[keys[i]] != null)
                                        this[keys[i]] = properties[keys[i]];
                        }
                        /**
                         * ValueAtQuantile quantile.
                         * @member {number|null|undefined} quantile
                         * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile
                         * @instance
                         */
                        ValueAtQuantile.prototype.quantile = null;
                        /**
                         * ValueAtQuantile value.
                         * @member {number|null|undefined} value
                         * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile
                         * @instance
                         */
                        ValueAtQuantile.prototype.value = null;
                        /**
                         * Creates a new ValueAtQuantile instance using the specified properties.
                         * @function create
                         * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile
                         * @static
                         * @param {opentelemetry.proto.metrics.v1.SummaryDataPoint.IValueAtQuantile=} [properties] Properties to set
                         * @returns {opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile} ValueAtQuantile instance
                         */
                        ValueAtQuantile.create = function create(properties) {
                            return new ValueAtQuantile(properties);
                        };
                        /**
                         * Encodes the specified ValueAtQuantile message. Does not implicitly {@link opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile.verify|verify} messages.
                         * @function encode
                         * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile
                         * @static
                         * @param {opentelemetry.proto.metrics.v1.SummaryDataPoint.IValueAtQuantile} message ValueAtQuantile message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        ValueAtQuantile.encode = function encode(message, writer) {
                            if (!writer)
                                writer = $Writer.create();
                            if (message.quantile != null && Object.hasOwnProperty.call(message, "quantile"))
                                writer.uint32(/* id 1, wireType 1 =*/ 9).double(message.quantile);
                            if (message.value != null && Object.hasOwnProperty.call(message, "value"))
                                writer.uint32(/* id 2, wireType 1 =*/ 17).double(message.value);
                            return writer;
                        };
                        /**
                         * Encodes the specified ValueAtQuantile message, length delimited. Does not implicitly {@link opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile.verify|verify} messages.
                         * @function encodeDelimited
                         * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile
                         * @static
                         * @param {opentelemetry.proto.metrics.v1.SummaryDataPoint.IValueAtQuantile} message ValueAtQuantile message or plain object to encode
                         * @param {$protobuf.Writer} [writer] Writer to encode to
                         * @returns {$protobuf.Writer} Writer
                         */
                        ValueAtQuantile.encodeDelimited = function encodeDelimited(message, writer) {
                            return this.encode(message, writer).ldelim();
                        };
                        /**
                         * Decodes a ValueAtQuantile message from the specified reader or buffer.
                         * @function decode
                         * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @param {number} [length] Message length if known beforehand
                         * @returns {opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile} ValueAtQuantile
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        ValueAtQuantile.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                    case 1: {
                                        message.quantile = reader.double();
                                        break;
                                    }
                                    case 2: {
                                        message.value = reader.double();
                                        break;
                                    }
                                    default:
                                        reader.skipType(tag & 7);
                                        break;
                                }
                            }
                            return message;
                        };
                        /**
                         * Decodes a ValueAtQuantile message from the specified reader or buffer, length delimited.
                         * @function decodeDelimited
                         * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile
                         * @static
                         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                         * @returns {opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile} ValueAtQuantile
                         * @throws {Error} If the payload is not a reader or valid buffer
                         * @throws {$protobuf.util.ProtocolError} If required fields are missing
                         */
                        ValueAtQuantile.decodeDelimited = function decodeDelimited(reader) {
                            if (!(reader instanceof $Reader))
                                reader = new $Reader(reader);
                            return this.decode(reader, reader.uint32());
                        };
                        /**
                         * Verifies a ValueAtQuantile message.
                         * @function verify
                         * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile
                         * @static
                         * @param {Object.<string,*>} message Plain object to verify
                         * @returns {string|null} `null` if valid, otherwise the reason why it is not
                         */
                        ValueAtQuantile.verify = function verify(message) {
                            if (typeof message !== "object" || message === null)
                                return "object expected";
                            if (message.quantile != null && message.hasOwnProperty("quantile"))
                                if (typeof message.quantile !== "number")
                                    return "quantile: number expected";
                            if (message.value != null && message.hasOwnProperty("value"))
                                if (typeof message.value !== "number")
                                    return "value: number expected";
                            return null;
                        };
                        /**
                         * Creates a ValueAtQuantile message from a plain object. Also converts values to their respective internal types.
                         * @function fromObject
                         * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile
                         * @static
                         * @param {Object.<string,*>} object Plain object
                         * @returns {opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile} ValueAtQuantile
                         */
                        ValueAtQuantile.fromObject = function fromObject(object) {
                            if (object instanceof $root.opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile)
                                return object;
                            var message = new $root.opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile();
                            if (object.quantile != null)
                                message.quantile = Number(object.quantile);
                            if (object.value != null)
                                message.value = Number(object.value);
                            return message;
                        };
                        /**
                         * Creates a plain object from a ValueAtQuantile message. Also converts values to other types if specified.
                         * @function toObject
                         * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile
                         * @static
                         * @param {opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile} message ValueAtQuantile
                         * @param {$protobuf.IConversionOptions} [options] Conversion options
                         * @returns {Object.<string,*>} Plain object
                         */
                        ValueAtQuantile.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.defaults) {
                                object.quantile = 0;
                                object.value = 0;
                            }
                            if (message.quantile != null && message.hasOwnProperty("quantile"))
                                object.quantile = options.json && !isFinite(message.quantile) ? String(message.quantile) : message.quantile;
                            if (message.value != null && message.hasOwnProperty("value"))
                                object.value = options.json && !isFinite(message.value) ? String(message.value) : message.value;
                            return object;
                        };
                        /**
                         * Converts this ValueAtQuantile to JSON.
                         * @function toJSON
                         * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile
                         * @instance
                         * @returns {Object.<string,*>} JSON object
                         */
                        ValueAtQuantile.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };
                        /**
                         * Gets the default type url for ValueAtQuantile
                         * @function getTypeUrl
                         * @memberof opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile
                         * @static
                         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                         * @returns {string} The default type url
                         */
                        ValueAtQuantile.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                            if (typeUrlPrefix === undefined) {
                                typeUrlPrefix = "type.googleapis.com";
                            }
                            return typeUrlPrefix + "/opentelemetry.proto.metrics.v1.SummaryDataPoint.ValueAtQuantile";
                        };
                        return ValueAtQuantile;
                    })();
                    return SummaryDataPoint;
                })();
                v1.Exemplar = (function () {
                    /**
                     * Properties of an Exemplar.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @interface IExemplar
                     * @property {Array.<opentelemetry.proto.common.v1.IKeyValue>|null} [filteredAttributes] Exemplar filteredAttributes
                     * @property {number|Long|null} [timeUnixNano] Exemplar timeUnixNano
                     * @property {number|null} [asDouble] Exemplar asDouble
                     * @property {number|Long|null} [asInt] Exemplar asInt
                     * @property {Uint8Array|null} [spanId] Exemplar spanId
                     * @property {Uint8Array|null} [traceId] Exemplar traceId
                     */
                    /**
                     * Constructs a new Exemplar.
                     * @memberof opentelemetry.proto.metrics.v1
                     * @classdesc Represents an Exemplar.
                     * @implements IExemplar
                     * @constructor
                     * @param {opentelemetry.proto.metrics.v1.IExemplar=} [properties] Properties to set
                     */
                    function Exemplar(properties) {
                        this.filteredAttributes = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * Exemplar filteredAttributes.
                     * @member {Array.<opentelemetry.proto.common.v1.IKeyValue>} filteredAttributes
                     * @memberof opentelemetry.proto.metrics.v1.Exemplar
                     * @instance
                     */
                    Exemplar.prototype.filteredAttributes = $util.emptyArray;
                    /**
                     * Exemplar timeUnixNano.
                     * @member {number|Long|null|undefined} timeUnixNano
                     * @memberof opentelemetry.proto.metrics.v1.Exemplar
                     * @instance
                     */
                    Exemplar.prototype.timeUnixNano = null;
                    /**
                     * Exemplar asDouble.
                     * @member {number|null|undefined} asDouble
                     * @memberof opentelemetry.proto.metrics.v1.Exemplar
                     * @instance
                     */
                    Exemplar.prototype.asDouble = null;
                    /**
                     * Exemplar asInt.
                     * @member {number|Long|null|undefined} asInt
                     * @memberof opentelemetry.proto.metrics.v1.Exemplar
                     * @instance
                     */
                    Exemplar.prototype.asInt = null;
                    /**
                     * Exemplar spanId.
                     * @member {Uint8Array|null|undefined} spanId
                     * @memberof opentelemetry.proto.metrics.v1.Exemplar
                     * @instance
                     */
                    Exemplar.prototype.spanId = null;
                    /**
                     * Exemplar traceId.
                     * @member {Uint8Array|null|undefined} traceId
                     * @memberof opentelemetry.proto.metrics.v1.Exemplar
                     * @instance
                     */
                    Exemplar.prototype.traceId = null;
                    // OneOf field names bound to virtual getters and setters
                    var $oneOfFields;
                    /**
                     * Exemplar value.
                     * @member {"asDouble"|"asInt"|undefined} value
                     * @memberof opentelemetry.proto.metrics.v1.Exemplar
                     * @instance
                     */
                    Object.defineProperty(Exemplar.prototype, "value", {
                        get: $util.oneOfGetter($oneOfFields = ["asDouble", "asInt"]),
                        set: $util.oneOfSetter($oneOfFields)
                    });
                    /**
                     * Creates a new Exemplar instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.metrics.v1.Exemplar
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IExemplar=} [properties] Properties to set
                     * @returns {opentelemetry.proto.metrics.v1.Exemplar} Exemplar instance
                     */
                    Exemplar.create = function create(properties) {
                        return new Exemplar(properties);
                    };
                    /**
                     * Encodes the specified Exemplar message. Does not implicitly {@link opentelemetry.proto.metrics.v1.Exemplar.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.metrics.v1.Exemplar
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IExemplar} message Exemplar message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Exemplar.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.timeUnixNano != null && Object.hasOwnProperty.call(message, "timeUnixNano"))
                            writer.uint32(/* id 2, wireType 1 =*/ 17).fixed64(message.timeUnixNano);
                        if (message.asDouble != null && Object.hasOwnProperty.call(message, "asDouble"))
                            writer.uint32(/* id 3, wireType 1 =*/ 25).double(message.asDouble);
                        if (message.spanId != null && Object.hasOwnProperty.call(message, "spanId"))
                            writer.uint32(/* id 4, wireType 2 =*/ 34).bytes(message.spanId);
                        if (message.traceId != null && Object.hasOwnProperty.call(message, "traceId"))
                            writer.uint32(/* id 5, wireType 2 =*/ 42).bytes(message.traceId);
                        if (message.asInt != null && Object.hasOwnProperty.call(message, "asInt"))
                            writer.uint32(/* id 6, wireType 1 =*/ 49).sfixed64(message.asInt);
                        if (message.filteredAttributes != null && message.filteredAttributes.length)
                            for (var i = 0; i < message.filteredAttributes.length; ++i)
                                $root.opentelemetry.proto.common.v1.KeyValue.encode(message.filteredAttributes[i], writer.uint32(/* id 7, wireType 2 =*/ 58).fork()).ldelim();
                        return writer;
                    };
                    /**
                     * Encodes the specified Exemplar message, length delimited. Does not implicitly {@link opentelemetry.proto.metrics.v1.Exemplar.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.Exemplar
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.IExemplar} message Exemplar message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    Exemplar.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes an Exemplar message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.metrics.v1.Exemplar
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.metrics.v1.Exemplar} Exemplar
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Exemplar.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.metrics.v1.Exemplar();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 7: {
                                    if (!(message.filteredAttributes && message.filteredAttributes.length))
                                        message.filteredAttributes = [];
                                    message.filteredAttributes.push($root.opentelemetry.proto.common.v1.KeyValue.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 2: {
                                    message.timeUnixNano = reader.fixed64();
                                    break;
                                }
                                case 3: {
                                    message.asDouble = reader.double();
                                    break;
                                }
                                case 6: {
                                    message.asInt = reader.sfixed64();
                                    break;
                                }
                                case 4: {
                                    message.spanId = reader.bytes();
                                    break;
                                }
                                case 5: {
                                    message.traceId = reader.bytes();
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes an Exemplar message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.metrics.v1.Exemplar
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.metrics.v1.Exemplar} Exemplar
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    Exemplar.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies an Exemplar message.
                     * @function verify
                     * @memberof opentelemetry.proto.metrics.v1.Exemplar
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    Exemplar.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        var properties = {};
                        if (message.filteredAttributes != null && message.hasOwnProperty("filteredAttributes")) {
                            if (!Array.isArray(message.filteredAttributes))
                                return "filteredAttributes: array expected";
                            for (var i = 0; i < message.filteredAttributes.length; ++i) {
                                var error = $root.opentelemetry.proto.common.v1.KeyValue.verify(message.filteredAttributes[i]);
                                if (error)
                                    return "filteredAttributes." + error;
                            }
                        }
                        if (message.timeUnixNano != null && message.hasOwnProperty("timeUnixNano"))
                            if (!$util.isInteger(message.timeUnixNano) && !(message.timeUnixNano && $util.isInteger(message.timeUnixNano.low) && $util.isInteger(message.timeUnixNano.high)))
                                return "timeUnixNano: integer|Long expected";
                        if (message.asDouble != null && message.hasOwnProperty("asDouble")) {
                            properties.value = 1;
                            if (typeof message.asDouble !== "number")
                                return "asDouble: number expected";
                        }
                        if (message.asInt != null && message.hasOwnProperty("asInt")) {
                            if (properties.value === 1)
                                return "value: multiple values";
                            properties.value = 1;
                            if (!$util.isInteger(message.asInt) && !(message.asInt && $util.isInteger(message.asInt.low) && $util.isInteger(message.asInt.high)))
                                return "asInt: integer|Long expected";
                        }
                        if (message.spanId != null && message.hasOwnProperty("spanId"))
                            if (!(message.spanId && typeof message.spanId.length === "number" || $util.isString(message.spanId)))
                                return "spanId: buffer expected";
                        if (message.traceId != null && message.hasOwnProperty("traceId"))
                            if (!(message.traceId && typeof message.traceId.length === "number" || $util.isString(message.traceId)))
                                return "traceId: buffer expected";
                        return null;
                    };
                    /**
                     * Creates an Exemplar message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.metrics.v1.Exemplar
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.metrics.v1.Exemplar} Exemplar
                     */
                    Exemplar.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.metrics.v1.Exemplar)
                            return object;
                        var message = new $root.opentelemetry.proto.metrics.v1.Exemplar();
                        if (object.filteredAttributes) {
                            if (!Array.isArray(object.filteredAttributes))
                                throw TypeError(".opentelemetry.proto.metrics.v1.Exemplar.filteredAttributes: array expected");
                            message.filteredAttributes = [];
                            for (var i = 0; i < object.filteredAttributes.length; ++i) {
                                if (typeof object.filteredAttributes[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.metrics.v1.Exemplar.filteredAttributes: object expected");
                                message.filteredAttributes[i] = $root.opentelemetry.proto.common.v1.KeyValue.fromObject(object.filteredAttributes[i]);
                            }
                        }
                        if (object.timeUnixNano != null)
                            if ($util.Long)
                                (message.timeUnixNano = $util.Long.fromValue(object.timeUnixNano)).unsigned = false;
                            else if (typeof object.timeUnixNano === "string")
                                message.timeUnixNano = parseInt(object.timeUnixNano, 10);
                            else if (typeof object.timeUnixNano === "number")
                                message.timeUnixNano = object.timeUnixNano;
                            else if (typeof object.timeUnixNano === "object")
                                message.timeUnixNano = new $util.LongBits(object.timeUnixNano.low >>> 0, object.timeUnixNano.high >>> 0).toNumber();
                        if (object.asDouble != null)
                            message.asDouble = Number(object.asDouble);
                        if (object.asInt != null)
                            if ($util.Long)
                                (message.asInt = $util.Long.fromValue(object.asInt)).unsigned = false;
                            else if (typeof object.asInt === "string")
                                message.asInt = parseInt(object.asInt, 10);
                            else if (typeof object.asInt === "number")
                                message.asInt = object.asInt;
                            else if (typeof object.asInt === "object")
                                message.asInt = new $util.LongBits(object.asInt.low >>> 0, object.asInt.high >>> 0).toNumber();
                        if (object.spanId != null)
                            if (typeof object.spanId === "string")
                                $util.base64.decode(object.spanId, message.spanId = $util.newBuffer($util.base64.length(object.spanId)), 0);
                            else if (object.spanId.length >= 0)
                                message.spanId = object.spanId;
                        if (object.traceId != null)
                            if (typeof object.traceId === "string")
                                $util.base64.decode(object.traceId, message.traceId = $util.newBuffer($util.base64.length(object.traceId)), 0);
                            else if (object.traceId.length >= 0)
                                message.traceId = object.traceId;
                        return message;
                    };
                    /**
                     * Creates a plain object from an Exemplar message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.metrics.v1.Exemplar
                     * @static
                     * @param {opentelemetry.proto.metrics.v1.Exemplar} message Exemplar
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    Exemplar.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.filteredAttributes = [];
                        if (options.defaults) {
                            if ($util.Long) {
                                var long = new $util.Long(0, 0, false);
                                object.timeUnixNano = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                            }
                            else
                                object.timeUnixNano = options.longs === String ? "0" : 0;
                            if (options.bytes === String)
                                object.spanId = "";
                            else {
                                object.spanId = [];
                                if (options.bytes !== Array)
                                    object.spanId = $util.newBuffer(object.spanId);
                            }
                            if (options.bytes === String)
                                object.traceId = "";
                            else {
                                object.traceId = [];
                                if (options.bytes !== Array)
                                    object.traceId = $util.newBuffer(object.traceId);
                            }
                        }
                        if (message.timeUnixNano != null && message.hasOwnProperty("timeUnixNano"))
                            if (typeof message.timeUnixNano === "number")
                                object.timeUnixNano = options.longs === String ? String(message.timeUnixNano) : message.timeUnixNano;
                            else
                                object.timeUnixNano = options.longs === String ? $util.Long.prototype.toString.call(message.timeUnixNano) : options.longs === Number ? new $util.LongBits(message.timeUnixNano.low >>> 0, message.timeUnixNano.high >>> 0).toNumber() : message.timeUnixNano;
                        if (message.asDouble != null && message.hasOwnProperty("asDouble")) {
                            object.asDouble = options.json && !isFinite(message.asDouble) ? String(message.asDouble) : message.asDouble;
                            if (options.oneofs)
                                object.value = "asDouble";
                        }
                        if (message.spanId != null && message.hasOwnProperty("spanId"))
                            object.spanId = options.bytes === String ? $util.base64.encode(message.spanId, 0, message.spanId.length) : options.bytes === Array ? Array.prototype.slice.call(message.spanId) : message.spanId;
                        if (message.traceId != null && message.hasOwnProperty("traceId"))
                            object.traceId = options.bytes === String ? $util.base64.encode(message.traceId, 0, message.traceId.length) : options.bytes === Array ? Array.prototype.slice.call(message.traceId) : message.traceId;
                        if (message.asInt != null && message.hasOwnProperty("asInt")) {
                            if (typeof message.asInt === "number")
                                object.asInt = options.longs === String ? String(message.asInt) : message.asInt;
                            else
                                object.asInt = options.longs === String ? $util.Long.prototype.toString.call(message.asInt) : options.longs === Number ? new $util.LongBits(message.asInt.low >>> 0, message.asInt.high >>> 0).toNumber() : message.asInt;
                            if (options.oneofs)
                                object.value = "asInt";
                        }
                        if (message.filteredAttributes && message.filteredAttributes.length) {
                            object.filteredAttributes = [];
                            for (var j = 0; j < message.filteredAttributes.length; ++j)
                                object.filteredAttributes[j] = $root.opentelemetry.proto.common.v1.KeyValue.toObject(message.filteredAttributes[j], options);
                        }
                        return object;
                    };
                    /**
                     * Converts this Exemplar to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.metrics.v1.Exemplar
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    Exemplar.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for Exemplar
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.metrics.v1.Exemplar
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    Exemplar.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.metrics.v1.Exemplar";
                    };
                    return Exemplar;
                })();
                return v1;
            })();
            return metrics;
        })();
        proto.logs = (function () {
            /**
             * Namespace logs.
             * @memberof opentelemetry.proto
             * @namespace
             */
            var logs = {};
            logs.v1 = (function () {
                /**
                 * Namespace v1.
                 * @memberof opentelemetry.proto.logs
                 * @namespace
                 */
                var v1 = {};
                v1.LogsData = (function () {
                    /**
                     * Properties of a LogsData.
                     * @memberof opentelemetry.proto.logs.v1
                     * @interface ILogsData
                     * @property {Array.<opentelemetry.proto.logs.v1.IResourceLogs>|null} [resourceLogs] LogsData resourceLogs
                     */
                    /**
                     * Constructs a new LogsData.
                     * @memberof opentelemetry.proto.logs.v1
                     * @classdesc Represents a LogsData.
                     * @implements ILogsData
                     * @constructor
                     * @param {opentelemetry.proto.logs.v1.ILogsData=} [properties] Properties to set
                     */
                    function LogsData(properties) {
                        this.resourceLogs = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * LogsData resourceLogs.
                     * @member {Array.<opentelemetry.proto.logs.v1.IResourceLogs>} resourceLogs
                     * @memberof opentelemetry.proto.logs.v1.LogsData
                     * @instance
                     */
                    LogsData.prototype.resourceLogs = $util.emptyArray;
                    /**
                     * Creates a new LogsData instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.logs.v1.LogsData
                     * @static
                     * @param {opentelemetry.proto.logs.v1.ILogsData=} [properties] Properties to set
                     * @returns {opentelemetry.proto.logs.v1.LogsData} LogsData instance
                     */
                    LogsData.create = function create(properties) {
                        return new LogsData(properties);
                    };
                    /**
                     * Encodes the specified LogsData message. Does not implicitly {@link opentelemetry.proto.logs.v1.LogsData.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.logs.v1.LogsData
                     * @static
                     * @param {opentelemetry.proto.logs.v1.ILogsData} message LogsData message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    LogsData.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.resourceLogs != null && message.resourceLogs.length)
                            for (var i = 0; i < message.resourceLogs.length; ++i)
                                $root.opentelemetry.proto.logs.v1.ResourceLogs.encode(message.resourceLogs[i], writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                        return writer;
                    };
                    /**
                     * Encodes the specified LogsData message, length delimited. Does not implicitly {@link opentelemetry.proto.logs.v1.LogsData.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.logs.v1.LogsData
                     * @static
                     * @param {opentelemetry.proto.logs.v1.ILogsData} message LogsData message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    LogsData.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a LogsData message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.logs.v1.LogsData
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.logs.v1.LogsData} LogsData
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    LogsData.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.logs.v1.LogsData();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    if (!(message.resourceLogs && message.resourceLogs.length))
                                        message.resourceLogs = [];
                                    message.resourceLogs.push($root.opentelemetry.proto.logs.v1.ResourceLogs.decode(reader, reader.uint32()));
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a LogsData message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.logs.v1.LogsData
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.logs.v1.LogsData} LogsData
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    LogsData.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a LogsData message.
                     * @function verify
                     * @memberof opentelemetry.proto.logs.v1.LogsData
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    LogsData.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.resourceLogs != null && message.hasOwnProperty("resourceLogs")) {
                            if (!Array.isArray(message.resourceLogs))
                                return "resourceLogs: array expected";
                            for (var i = 0; i < message.resourceLogs.length; ++i) {
                                var error = $root.opentelemetry.proto.logs.v1.ResourceLogs.verify(message.resourceLogs[i]);
                                if (error)
                                    return "resourceLogs." + error;
                            }
                        }
                        return null;
                    };
                    /**
                     * Creates a LogsData message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.logs.v1.LogsData
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.logs.v1.LogsData} LogsData
                     */
                    LogsData.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.logs.v1.LogsData)
                            return object;
                        var message = new $root.opentelemetry.proto.logs.v1.LogsData();
                        if (object.resourceLogs) {
                            if (!Array.isArray(object.resourceLogs))
                                throw TypeError(".opentelemetry.proto.logs.v1.LogsData.resourceLogs: array expected");
                            message.resourceLogs = [];
                            for (var i = 0; i < object.resourceLogs.length; ++i) {
                                if (typeof object.resourceLogs[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.logs.v1.LogsData.resourceLogs: object expected");
                                message.resourceLogs[i] = $root.opentelemetry.proto.logs.v1.ResourceLogs.fromObject(object.resourceLogs[i]);
                            }
                        }
                        return message;
                    };
                    /**
                     * Creates a plain object from a LogsData message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.logs.v1.LogsData
                     * @static
                     * @param {opentelemetry.proto.logs.v1.LogsData} message LogsData
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    LogsData.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.resourceLogs = [];
                        if (message.resourceLogs && message.resourceLogs.length) {
                            object.resourceLogs = [];
                            for (var j = 0; j < message.resourceLogs.length; ++j)
                                object.resourceLogs[j] = $root.opentelemetry.proto.logs.v1.ResourceLogs.toObject(message.resourceLogs[j], options);
                        }
                        return object;
                    };
                    /**
                     * Converts this LogsData to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.logs.v1.LogsData
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    LogsData.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for LogsData
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.logs.v1.LogsData
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    LogsData.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.logs.v1.LogsData";
                    };
                    return LogsData;
                })();
                v1.ResourceLogs = (function () {
                    /**
                     * Properties of a ResourceLogs.
                     * @memberof opentelemetry.proto.logs.v1
                     * @interface IResourceLogs
                     * @property {opentelemetry.proto.resource.v1.IResource|null} [resource] ResourceLogs resource
                     * @property {Array.<opentelemetry.proto.logs.v1.IScopeLogs>|null} [scopeLogs] ResourceLogs scopeLogs
                     * @property {string|null} [schemaUrl] ResourceLogs schemaUrl
                     */
                    /**
                     * Constructs a new ResourceLogs.
                     * @memberof opentelemetry.proto.logs.v1
                     * @classdesc Represents a ResourceLogs.
                     * @implements IResourceLogs
                     * @constructor
                     * @param {opentelemetry.proto.logs.v1.IResourceLogs=} [properties] Properties to set
                     */
                    function ResourceLogs(properties) {
                        this.scopeLogs = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * ResourceLogs resource.
                     * @member {opentelemetry.proto.resource.v1.IResource|null|undefined} resource
                     * @memberof opentelemetry.proto.logs.v1.ResourceLogs
                     * @instance
                     */
                    ResourceLogs.prototype.resource = null;
                    /**
                     * ResourceLogs scopeLogs.
                     * @member {Array.<opentelemetry.proto.logs.v1.IScopeLogs>} scopeLogs
                     * @memberof opentelemetry.proto.logs.v1.ResourceLogs
                     * @instance
                     */
                    ResourceLogs.prototype.scopeLogs = $util.emptyArray;
                    /**
                     * ResourceLogs schemaUrl.
                     * @member {string|null|undefined} schemaUrl
                     * @memberof opentelemetry.proto.logs.v1.ResourceLogs
                     * @instance
                     */
                    ResourceLogs.prototype.schemaUrl = null;
                    /**
                     * Creates a new ResourceLogs instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.logs.v1.ResourceLogs
                     * @static
                     * @param {opentelemetry.proto.logs.v1.IResourceLogs=} [properties] Properties to set
                     * @returns {opentelemetry.proto.logs.v1.ResourceLogs} ResourceLogs instance
                     */
                    ResourceLogs.create = function create(properties) {
                        return new ResourceLogs(properties);
                    };
                    /**
                     * Encodes the specified ResourceLogs message. Does not implicitly {@link opentelemetry.proto.logs.v1.ResourceLogs.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.logs.v1.ResourceLogs
                     * @static
                     * @param {opentelemetry.proto.logs.v1.IResourceLogs} message ResourceLogs message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    ResourceLogs.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.resource != null && Object.hasOwnProperty.call(message, "resource"))
                            $root.opentelemetry.proto.resource.v1.Resource.encode(message.resource, writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                        if (message.scopeLogs != null && message.scopeLogs.length)
                            for (var i = 0; i < message.scopeLogs.length; ++i)
                                $root.opentelemetry.proto.logs.v1.ScopeLogs.encode(message.scopeLogs[i], writer.uint32(/* id 2, wireType 2 =*/ 18).fork()).ldelim();
                        if (message.schemaUrl != null && Object.hasOwnProperty.call(message, "schemaUrl"))
                            writer.uint32(/* id 3, wireType 2 =*/ 26).string(message.schemaUrl);
                        return writer;
                    };
                    /**
                     * Encodes the specified ResourceLogs message, length delimited. Does not implicitly {@link opentelemetry.proto.logs.v1.ResourceLogs.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.logs.v1.ResourceLogs
                     * @static
                     * @param {opentelemetry.proto.logs.v1.IResourceLogs} message ResourceLogs message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    ResourceLogs.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a ResourceLogs message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.logs.v1.ResourceLogs
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.logs.v1.ResourceLogs} ResourceLogs
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    ResourceLogs.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.logs.v1.ResourceLogs();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    message.resource = $root.opentelemetry.proto.resource.v1.Resource.decode(reader, reader.uint32());
                                    break;
                                }
                                case 2: {
                                    if (!(message.scopeLogs && message.scopeLogs.length))
                                        message.scopeLogs = [];
                                    message.scopeLogs.push($root.opentelemetry.proto.logs.v1.ScopeLogs.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 3: {
                                    message.schemaUrl = reader.string();
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a ResourceLogs message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.logs.v1.ResourceLogs
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.logs.v1.ResourceLogs} ResourceLogs
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    ResourceLogs.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a ResourceLogs message.
                     * @function verify
                     * @memberof opentelemetry.proto.logs.v1.ResourceLogs
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    ResourceLogs.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.resource != null && message.hasOwnProperty("resource")) {
                            var error = $root.opentelemetry.proto.resource.v1.Resource.verify(message.resource);
                            if (error)
                                return "resource." + error;
                        }
                        if (message.scopeLogs != null && message.hasOwnProperty("scopeLogs")) {
                            if (!Array.isArray(message.scopeLogs))
                                return "scopeLogs: array expected";
                            for (var i = 0; i < message.scopeLogs.length; ++i) {
                                var error = $root.opentelemetry.proto.logs.v1.ScopeLogs.verify(message.scopeLogs[i]);
                                if (error)
                                    return "scopeLogs." + error;
                            }
                        }
                        if (message.schemaUrl != null && message.hasOwnProperty("schemaUrl"))
                            if (!$util.isString(message.schemaUrl))
                                return "schemaUrl: string expected";
                        return null;
                    };
                    /**
                     * Creates a ResourceLogs message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.logs.v1.ResourceLogs
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.logs.v1.ResourceLogs} ResourceLogs
                     */
                    ResourceLogs.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.logs.v1.ResourceLogs)
                            return object;
                        var message = new $root.opentelemetry.proto.logs.v1.ResourceLogs();
                        if (object.resource != null) {
                            if (typeof object.resource !== "object")
                                throw TypeError(".opentelemetry.proto.logs.v1.ResourceLogs.resource: object expected");
                            message.resource = $root.opentelemetry.proto.resource.v1.Resource.fromObject(object.resource);
                        }
                        if (object.scopeLogs) {
                            if (!Array.isArray(object.scopeLogs))
                                throw TypeError(".opentelemetry.proto.logs.v1.ResourceLogs.scopeLogs: array expected");
                            message.scopeLogs = [];
                            for (var i = 0; i < object.scopeLogs.length; ++i) {
                                if (typeof object.scopeLogs[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.logs.v1.ResourceLogs.scopeLogs: object expected");
                                message.scopeLogs[i] = $root.opentelemetry.proto.logs.v1.ScopeLogs.fromObject(object.scopeLogs[i]);
                            }
                        }
                        if (object.schemaUrl != null)
                            message.schemaUrl = String(object.schemaUrl);
                        return message;
                    };
                    /**
                     * Creates a plain object from a ResourceLogs message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.logs.v1.ResourceLogs
                     * @static
                     * @param {opentelemetry.proto.logs.v1.ResourceLogs} message ResourceLogs
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    ResourceLogs.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.scopeLogs = [];
                        if (options.defaults) {
                            object.resource = null;
                            object.schemaUrl = "";
                        }
                        if (message.resource != null && message.hasOwnProperty("resource"))
                            object.resource = $root.opentelemetry.proto.resource.v1.Resource.toObject(message.resource, options);
                        if (message.scopeLogs && message.scopeLogs.length) {
                            object.scopeLogs = [];
                            for (var j = 0; j < message.scopeLogs.length; ++j)
                                object.scopeLogs[j] = $root.opentelemetry.proto.logs.v1.ScopeLogs.toObject(message.scopeLogs[j], options);
                        }
                        if (message.schemaUrl != null && message.hasOwnProperty("schemaUrl"))
                            object.schemaUrl = message.schemaUrl;
                        return object;
                    };
                    /**
                     * Converts this ResourceLogs to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.logs.v1.ResourceLogs
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    ResourceLogs.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for ResourceLogs
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.logs.v1.ResourceLogs
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    ResourceLogs.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.logs.v1.ResourceLogs";
                    };
                    return ResourceLogs;
                })();
                v1.ScopeLogs = (function () {
                    /**
                     * Properties of a ScopeLogs.
                     * @memberof opentelemetry.proto.logs.v1
                     * @interface IScopeLogs
                     * @property {opentelemetry.proto.common.v1.IInstrumentationScope|null} [scope] ScopeLogs scope
                     * @property {Array.<opentelemetry.proto.logs.v1.ILogRecord>|null} [logRecords] ScopeLogs logRecords
                     * @property {string|null} [schemaUrl] ScopeLogs schemaUrl
                     */
                    /**
                     * Constructs a new ScopeLogs.
                     * @memberof opentelemetry.proto.logs.v1
                     * @classdesc Represents a ScopeLogs.
                     * @implements IScopeLogs
                     * @constructor
                     * @param {opentelemetry.proto.logs.v1.IScopeLogs=} [properties] Properties to set
                     */
                    function ScopeLogs(properties) {
                        this.logRecords = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * ScopeLogs scope.
                     * @member {opentelemetry.proto.common.v1.IInstrumentationScope|null|undefined} scope
                     * @memberof opentelemetry.proto.logs.v1.ScopeLogs
                     * @instance
                     */
                    ScopeLogs.prototype.scope = null;
                    /**
                     * ScopeLogs logRecords.
                     * @member {Array.<opentelemetry.proto.logs.v1.ILogRecord>} logRecords
                     * @memberof opentelemetry.proto.logs.v1.ScopeLogs
                     * @instance
                     */
                    ScopeLogs.prototype.logRecords = $util.emptyArray;
                    /**
                     * ScopeLogs schemaUrl.
                     * @member {string|null|undefined} schemaUrl
                     * @memberof opentelemetry.proto.logs.v1.ScopeLogs
                     * @instance
                     */
                    ScopeLogs.prototype.schemaUrl = null;
                    /**
                     * Creates a new ScopeLogs instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.logs.v1.ScopeLogs
                     * @static
                     * @param {opentelemetry.proto.logs.v1.IScopeLogs=} [properties] Properties to set
                     * @returns {opentelemetry.proto.logs.v1.ScopeLogs} ScopeLogs instance
                     */
                    ScopeLogs.create = function create(properties) {
                        return new ScopeLogs(properties);
                    };
                    /**
                     * Encodes the specified ScopeLogs message. Does not implicitly {@link opentelemetry.proto.logs.v1.ScopeLogs.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.logs.v1.ScopeLogs
                     * @static
                     * @param {opentelemetry.proto.logs.v1.IScopeLogs} message ScopeLogs message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    ScopeLogs.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.scope != null && Object.hasOwnProperty.call(message, "scope"))
                            $root.opentelemetry.proto.common.v1.InstrumentationScope.encode(message.scope, writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim();
                        if (message.logRecords != null && message.logRecords.length)
                            for (var i = 0; i < message.logRecords.length; ++i)
                                $root.opentelemetry.proto.logs.v1.LogRecord.encode(message.logRecords[i], writer.uint32(/* id 2, wireType 2 =*/ 18).fork()).ldelim();
                        if (message.schemaUrl != null && Object.hasOwnProperty.call(message, "schemaUrl"))
                            writer.uint32(/* id 3, wireType 2 =*/ 26).string(message.schemaUrl);
                        return writer;
                    };
                    /**
                     * Encodes the specified ScopeLogs message, length delimited. Does not implicitly {@link opentelemetry.proto.logs.v1.ScopeLogs.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.logs.v1.ScopeLogs
                     * @static
                     * @param {opentelemetry.proto.logs.v1.IScopeLogs} message ScopeLogs message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    ScopeLogs.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a ScopeLogs message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.logs.v1.ScopeLogs
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.logs.v1.ScopeLogs} ScopeLogs
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    ScopeLogs.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.logs.v1.ScopeLogs();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    message.scope = $root.opentelemetry.proto.common.v1.InstrumentationScope.decode(reader, reader.uint32());
                                    break;
                                }
                                case 2: {
                                    if (!(message.logRecords && message.logRecords.length))
                                        message.logRecords = [];
                                    message.logRecords.push($root.opentelemetry.proto.logs.v1.LogRecord.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 3: {
                                    message.schemaUrl = reader.string();
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a ScopeLogs message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.logs.v1.ScopeLogs
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.logs.v1.ScopeLogs} ScopeLogs
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    ScopeLogs.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a ScopeLogs message.
                     * @function verify
                     * @memberof opentelemetry.proto.logs.v1.ScopeLogs
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    ScopeLogs.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.scope != null && message.hasOwnProperty("scope")) {
                            var error = $root.opentelemetry.proto.common.v1.InstrumentationScope.verify(message.scope);
                            if (error)
                                return "scope." + error;
                        }
                        if (message.logRecords != null && message.hasOwnProperty("logRecords")) {
                            if (!Array.isArray(message.logRecords))
                                return "logRecords: array expected";
                            for (var i = 0; i < message.logRecords.length; ++i) {
                                var error = $root.opentelemetry.proto.logs.v1.LogRecord.verify(message.logRecords[i]);
                                if (error)
                                    return "logRecords." + error;
                            }
                        }
                        if (message.schemaUrl != null && message.hasOwnProperty("schemaUrl"))
                            if (!$util.isString(message.schemaUrl))
                                return "schemaUrl: string expected";
                        return null;
                    };
                    /**
                     * Creates a ScopeLogs message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.logs.v1.ScopeLogs
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.logs.v1.ScopeLogs} ScopeLogs
                     */
                    ScopeLogs.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.logs.v1.ScopeLogs)
                            return object;
                        var message = new $root.opentelemetry.proto.logs.v1.ScopeLogs();
                        if (object.scope != null) {
                            if (typeof object.scope !== "object")
                                throw TypeError(".opentelemetry.proto.logs.v1.ScopeLogs.scope: object expected");
                            message.scope = $root.opentelemetry.proto.common.v1.InstrumentationScope.fromObject(object.scope);
                        }
                        if (object.logRecords) {
                            if (!Array.isArray(object.logRecords))
                                throw TypeError(".opentelemetry.proto.logs.v1.ScopeLogs.logRecords: array expected");
                            message.logRecords = [];
                            for (var i = 0; i < object.logRecords.length; ++i) {
                                if (typeof object.logRecords[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.logs.v1.ScopeLogs.logRecords: object expected");
                                message.logRecords[i] = $root.opentelemetry.proto.logs.v1.LogRecord.fromObject(object.logRecords[i]);
                            }
                        }
                        if (object.schemaUrl != null)
                            message.schemaUrl = String(object.schemaUrl);
                        return message;
                    };
                    /**
                     * Creates a plain object from a ScopeLogs message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.logs.v1.ScopeLogs
                     * @static
                     * @param {opentelemetry.proto.logs.v1.ScopeLogs} message ScopeLogs
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    ScopeLogs.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.logRecords = [];
                        if (options.defaults) {
                            object.scope = null;
                            object.schemaUrl = "";
                        }
                        if (message.scope != null && message.hasOwnProperty("scope"))
                            object.scope = $root.opentelemetry.proto.common.v1.InstrumentationScope.toObject(message.scope, options);
                        if (message.logRecords && message.logRecords.length) {
                            object.logRecords = [];
                            for (var j = 0; j < message.logRecords.length; ++j)
                                object.logRecords[j] = $root.opentelemetry.proto.logs.v1.LogRecord.toObject(message.logRecords[j], options);
                        }
                        if (message.schemaUrl != null && message.hasOwnProperty("schemaUrl"))
                            object.schemaUrl = message.schemaUrl;
                        return object;
                    };
                    /**
                     * Converts this ScopeLogs to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.logs.v1.ScopeLogs
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    ScopeLogs.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for ScopeLogs
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.logs.v1.ScopeLogs
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    ScopeLogs.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.logs.v1.ScopeLogs";
                    };
                    return ScopeLogs;
                })();
                /**
                 * SeverityNumber enum.
                 * @name opentelemetry.proto.logs.v1.SeverityNumber
                 * @enum {number}
                 * @property {number} SEVERITY_NUMBER_UNSPECIFIED=0 SEVERITY_NUMBER_UNSPECIFIED value
                 * @property {number} SEVERITY_NUMBER_TRACE=1 SEVERITY_NUMBER_TRACE value
                 * @property {number} SEVERITY_NUMBER_TRACE2=2 SEVERITY_NUMBER_TRACE2 value
                 * @property {number} SEVERITY_NUMBER_TRACE3=3 SEVERITY_NUMBER_TRACE3 value
                 * @property {number} SEVERITY_NUMBER_TRACE4=4 SEVERITY_NUMBER_TRACE4 value
                 * @property {number} SEVERITY_NUMBER_DEBUG=5 SEVERITY_NUMBER_DEBUG value
                 * @property {number} SEVERITY_NUMBER_DEBUG2=6 SEVERITY_NUMBER_DEBUG2 value
                 * @property {number} SEVERITY_NUMBER_DEBUG3=7 SEVERITY_NUMBER_DEBUG3 value
                 * @property {number} SEVERITY_NUMBER_DEBUG4=8 SEVERITY_NUMBER_DEBUG4 value
                 * @property {number} SEVERITY_NUMBER_INFO=9 SEVERITY_NUMBER_INFO value
                 * @property {number} SEVERITY_NUMBER_INFO2=10 SEVERITY_NUMBER_INFO2 value
                 * @property {number} SEVERITY_NUMBER_INFO3=11 SEVERITY_NUMBER_INFO3 value
                 * @property {number} SEVERITY_NUMBER_INFO4=12 SEVERITY_NUMBER_INFO4 value
                 * @property {number} SEVERITY_NUMBER_WARN=13 SEVERITY_NUMBER_WARN value
                 * @property {number} SEVERITY_NUMBER_WARN2=14 SEVERITY_NUMBER_WARN2 value
                 * @property {number} SEVERITY_NUMBER_WARN3=15 SEVERITY_NUMBER_WARN3 value
                 * @property {number} SEVERITY_NUMBER_WARN4=16 SEVERITY_NUMBER_WARN4 value
                 * @property {number} SEVERITY_NUMBER_ERROR=17 SEVERITY_NUMBER_ERROR value
                 * @property {number} SEVERITY_NUMBER_ERROR2=18 SEVERITY_NUMBER_ERROR2 value
                 * @property {number} SEVERITY_NUMBER_ERROR3=19 SEVERITY_NUMBER_ERROR3 value
                 * @property {number} SEVERITY_NUMBER_ERROR4=20 SEVERITY_NUMBER_ERROR4 value
                 * @property {number} SEVERITY_NUMBER_FATAL=21 SEVERITY_NUMBER_FATAL value
                 * @property {number} SEVERITY_NUMBER_FATAL2=22 SEVERITY_NUMBER_FATAL2 value
                 * @property {number} SEVERITY_NUMBER_FATAL3=23 SEVERITY_NUMBER_FATAL3 value
                 * @property {number} SEVERITY_NUMBER_FATAL4=24 SEVERITY_NUMBER_FATAL4 value
                 */
                v1.SeverityNumber = (function () {
                    var valuesById = {}, values = Object.create(valuesById);
                    values[valuesById[0] = "SEVERITY_NUMBER_UNSPECIFIED"] = 0;
                    values[valuesById[1] = "SEVERITY_NUMBER_TRACE"] = 1;
                    values[valuesById[2] = "SEVERITY_NUMBER_TRACE2"] = 2;
                    values[valuesById[3] = "SEVERITY_NUMBER_TRACE3"] = 3;
                    values[valuesById[4] = "SEVERITY_NUMBER_TRACE4"] = 4;
                    values[valuesById[5] = "SEVERITY_NUMBER_DEBUG"] = 5;
                    values[valuesById[6] = "SEVERITY_NUMBER_DEBUG2"] = 6;
                    values[valuesById[7] = "SEVERITY_NUMBER_DEBUG3"] = 7;
                    values[valuesById[8] = "SEVERITY_NUMBER_DEBUG4"] = 8;
                    values[valuesById[9] = "SEVERITY_NUMBER_INFO"] = 9;
                    values[valuesById[10] = "SEVERITY_NUMBER_INFO2"] = 10;
                    values[valuesById[11] = "SEVERITY_NUMBER_INFO3"] = 11;
                    values[valuesById[12] = "SEVERITY_NUMBER_INFO4"] = 12;
                    values[valuesById[13] = "SEVERITY_NUMBER_WARN"] = 13;
                    values[valuesById[14] = "SEVERITY_NUMBER_WARN2"] = 14;
                    values[valuesById[15] = "SEVERITY_NUMBER_WARN3"] = 15;
                    values[valuesById[16] = "SEVERITY_NUMBER_WARN4"] = 16;
                    values[valuesById[17] = "SEVERITY_NUMBER_ERROR"] = 17;
                    values[valuesById[18] = "SEVERITY_NUMBER_ERROR2"] = 18;
                    values[valuesById[19] = "SEVERITY_NUMBER_ERROR3"] = 19;
                    values[valuesById[20] = "SEVERITY_NUMBER_ERROR4"] = 20;
                    values[valuesById[21] = "SEVERITY_NUMBER_FATAL"] = 21;
                    values[valuesById[22] = "SEVERITY_NUMBER_FATAL2"] = 22;
                    values[valuesById[23] = "SEVERITY_NUMBER_FATAL3"] = 23;
                    values[valuesById[24] = "SEVERITY_NUMBER_FATAL4"] = 24;
                    return values;
                })();
                /**
                 * LogRecordFlags enum.
                 * @name opentelemetry.proto.logs.v1.LogRecordFlags
                 * @enum {number}
                 * @property {number} LOG_RECORD_FLAGS_DO_NOT_USE=0 LOG_RECORD_FLAGS_DO_NOT_USE value
                 * @property {number} LOG_RECORD_FLAGS_TRACE_FLAGS_MASK=255 LOG_RECORD_FLAGS_TRACE_FLAGS_MASK value
                 */
                v1.LogRecordFlags = (function () {
                    var valuesById = {}, values = Object.create(valuesById);
                    values[valuesById[0] = "LOG_RECORD_FLAGS_DO_NOT_USE"] = 0;
                    values[valuesById[255] = "LOG_RECORD_FLAGS_TRACE_FLAGS_MASK"] = 255;
                    return values;
                })();
                v1.LogRecord = (function () {
                    /**
                     * Properties of a LogRecord.
                     * @memberof opentelemetry.proto.logs.v1
                     * @interface ILogRecord
                     * @property {number|Long|null} [timeUnixNano] LogRecord timeUnixNano
                     * @property {number|Long|null} [observedTimeUnixNano] LogRecord observedTimeUnixNano
                     * @property {opentelemetry.proto.logs.v1.SeverityNumber|null} [severityNumber] LogRecord severityNumber
                     * @property {string|null} [severityText] LogRecord severityText
                     * @property {opentelemetry.proto.common.v1.IAnyValue|null} [body] LogRecord body
                     * @property {Array.<opentelemetry.proto.common.v1.IKeyValue>|null} [attributes] LogRecord attributes
                     * @property {number|null} [droppedAttributesCount] LogRecord droppedAttributesCount
                     * @property {number|null} [flags] LogRecord flags
                     * @property {Uint8Array|null} [traceId] LogRecord traceId
                     * @property {Uint8Array|null} [spanId] LogRecord spanId
                     */
                    /**
                     * Constructs a new LogRecord.
                     * @memberof opentelemetry.proto.logs.v1
                     * @classdesc Represents a LogRecord.
                     * @implements ILogRecord
                     * @constructor
                     * @param {opentelemetry.proto.logs.v1.ILogRecord=} [properties] Properties to set
                     */
                    function LogRecord(properties) {
                        this.attributes = [];
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                if (properties[keys[i]] != null)
                                    this[keys[i]] = properties[keys[i]];
                    }
                    /**
                     * LogRecord timeUnixNano.
                     * @member {number|Long|null|undefined} timeUnixNano
                     * @memberof opentelemetry.proto.logs.v1.LogRecord
                     * @instance
                     */
                    LogRecord.prototype.timeUnixNano = null;
                    /**
                     * LogRecord observedTimeUnixNano.
                     * @member {number|Long|null|undefined} observedTimeUnixNano
                     * @memberof opentelemetry.proto.logs.v1.LogRecord
                     * @instance
                     */
                    LogRecord.prototype.observedTimeUnixNano = null;
                    /**
                     * LogRecord severityNumber.
                     * @member {opentelemetry.proto.logs.v1.SeverityNumber|null|undefined} severityNumber
                     * @memberof opentelemetry.proto.logs.v1.LogRecord
                     * @instance
                     */
                    LogRecord.prototype.severityNumber = null;
                    /**
                     * LogRecord severityText.
                     * @member {string|null|undefined} severityText
                     * @memberof opentelemetry.proto.logs.v1.LogRecord
                     * @instance
                     */
                    LogRecord.prototype.severityText = null;
                    /**
                     * LogRecord body.
                     * @member {opentelemetry.proto.common.v1.IAnyValue|null|undefined} body
                     * @memberof opentelemetry.proto.logs.v1.LogRecord
                     * @instance
                     */
                    LogRecord.prototype.body = null;
                    /**
                     * LogRecord attributes.
                     * @member {Array.<opentelemetry.proto.common.v1.IKeyValue>} attributes
                     * @memberof opentelemetry.proto.logs.v1.LogRecord
                     * @instance
                     */
                    LogRecord.prototype.attributes = $util.emptyArray;
                    /**
                     * LogRecord droppedAttributesCount.
                     * @member {number|null|undefined} droppedAttributesCount
                     * @memberof opentelemetry.proto.logs.v1.LogRecord
                     * @instance
                     */
                    LogRecord.prototype.droppedAttributesCount = null;
                    /**
                     * LogRecord flags.
                     * @member {number|null|undefined} flags
                     * @memberof opentelemetry.proto.logs.v1.LogRecord
                     * @instance
                     */
                    LogRecord.prototype.flags = null;
                    /**
                     * LogRecord traceId.
                     * @member {Uint8Array|null|undefined} traceId
                     * @memberof opentelemetry.proto.logs.v1.LogRecord
                     * @instance
                     */
                    LogRecord.prototype.traceId = null;
                    /**
                     * LogRecord spanId.
                     * @member {Uint8Array|null|undefined} spanId
                     * @memberof opentelemetry.proto.logs.v1.LogRecord
                     * @instance
                     */
                    LogRecord.prototype.spanId = null;
                    /**
                     * Creates a new LogRecord instance using the specified properties.
                     * @function create
                     * @memberof opentelemetry.proto.logs.v1.LogRecord
                     * @static
                     * @param {opentelemetry.proto.logs.v1.ILogRecord=} [properties] Properties to set
                     * @returns {opentelemetry.proto.logs.v1.LogRecord} LogRecord instance
                     */
                    LogRecord.create = function create(properties) {
                        return new LogRecord(properties);
                    };
                    /**
                     * Encodes the specified LogRecord message. Does not implicitly {@link opentelemetry.proto.logs.v1.LogRecord.verify|verify} messages.
                     * @function encode
                     * @memberof opentelemetry.proto.logs.v1.LogRecord
                     * @static
                     * @param {opentelemetry.proto.logs.v1.ILogRecord} message LogRecord message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    LogRecord.encode = function encode(message, writer) {
                        if (!writer)
                            writer = $Writer.create();
                        if (message.timeUnixNano != null && Object.hasOwnProperty.call(message, "timeUnixNano"))
                            writer.uint32(/* id 1, wireType 1 =*/ 9).fixed64(message.timeUnixNano);
                        if (message.severityNumber != null && Object.hasOwnProperty.call(message, "severityNumber"))
                            writer.uint32(/* id 2, wireType 0 =*/ 16).int32(message.severityNumber);
                        if (message.severityText != null && Object.hasOwnProperty.call(message, "severityText"))
                            writer.uint32(/* id 3, wireType 2 =*/ 26).string(message.severityText);
                        if (message.body != null && Object.hasOwnProperty.call(message, "body"))
                            $root.opentelemetry.proto.common.v1.AnyValue.encode(message.body, writer.uint32(/* id 5, wireType 2 =*/ 42).fork()).ldelim();
                        if (message.attributes != null && message.attributes.length)
                            for (var i = 0; i < message.attributes.length; ++i)
                                $root.opentelemetry.proto.common.v1.KeyValue.encode(message.attributes[i], writer.uint32(/* id 6, wireType 2 =*/ 50).fork()).ldelim();
                        if (message.droppedAttributesCount != null && Object.hasOwnProperty.call(message, "droppedAttributesCount"))
                            writer.uint32(/* id 7, wireType 0 =*/ 56).uint32(message.droppedAttributesCount);
                        if (message.flags != null && Object.hasOwnProperty.call(message, "flags"))
                            writer.uint32(/* id 8, wireType 5 =*/ 69).fixed32(message.flags);
                        if (message.traceId != null && Object.hasOwnProperty.call(message, "traceId"))
                            writer.uint32(/* id 9, wireType 2 =*/ 74).bytes(message.traceId);
                        if (message.spanId != null && Object.hasOwnProperty.call(message, "spanId"))
                            writer.uint32(/* id 10, wireType 2 =*/ 82).bytes(message.spanId);
                        if (message.observedTimeUnixNano != null && Object.hasOwnProperty.call(message, "observedTimeUnixNano"))
                            writer.uint32(/* id 11, wireType 1 =*/ 89).fixed64(message.observedTimeUnixNano);
                        return writer;
                    };
                    /**
                     * Encodes the specified LogRecord message, length delimited. Does not implicitly {@link opentelemetry.proto.logs.v1.LogRecord.verify|verify} messages.
                     * @function encodeDelimited
                     * @memberof opentelemetry.proto.logs.v1.LogRecord
                     * @static
                     * @param {opentelemetry.proto.logs.v1.ILogRecord} message LogRecord message or plain object to encode
                     * @param {$protobuf.Writer} [writer] Writer to encode to
                     * @returns {$protobuf.Writer} Writer
                     */
                    LogRecord.encodeDelimited = function encodeDelimited(message, writer) {
                        return this.encode(message, writer).ldelim();
                    };
                    /**
                     * Decodes a LogRecord message from the specified reader or buffer.
                     * @function decode
                     * @memberof opentelemetry.proto.logs.v1.LogRecord
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @param {number} [length] Message length if known beforehand
                     * @returns {opentelemetry.proto.logs.v1.LogRecord} LogRecord
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    LogRecord.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.opentelemetry.proto.logs.v1.LogRecord();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1: {
                                    message.timeUnixNano = reader.fixed64();
                                    break;
                                }
                                case 11: {
                                    message.observedTimeUnixNano = reader.fixed64();
                                    break;
                                }
                                case 2: {
                                    message.severityNumber = reader.int32();
                                    break;
                                }
                                case 3: {
                                    message.severityText = reader.string();
                                    break;
                                }
                                case 5: {
                                    message.body = $root.opentelemetry.proto.common.v1.AnyValue.decode(reader, reader.uint32());
                                    break;
                                }
                                case 6: {
                                    if (!(message.attributes && message.attributes.length))
                                        message.attributes = [];
                                    message.attributes.push($root.opentelemetry.proto.common.v1.KeyValue.decode(reader, reader.uint32()));
                                    break;
                                }
                                case 7: {
                                    message.droppedAttributesCount = reader.uint32();
                                    break;
                                }
                                case 8: {
                                    message.flags = reader.fixed32();
                                    break;
                                }
                                case 9: {
                                    message.traceId = reader.bytes();
                                    break;
                                }
                                case 10: {
                                    message.spanId = reader.bytes();
                                    break;
                                }
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };
                    /**
                     * Decodes a LogRecord message from the specified reader or buffer, length delimited.
                     * @function decodeDelimited
                     * @memberof opentelemetry.proto.logs.v1.LogRecord
                     * @static
                     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                     * @returns {opentelemetry.proto.logs.v1.LogRecord} LogRecord
                     * @throws {Error} If the payload is not a reader or valid buffer
                     * @throws {$protobuf.util.ProtocolError} If required fields are missing
                     */
                    LogRecord.decodeDelimited = function decodeDelimited(reader) {
                        if (!(reader instanceof $Reader))
                            reader = new $Reader(reader);
                        return this.decode(reader, reader.uint32());
                    };
                    /**
                     * Verifies a LogRecord message.
                     * @function verify
                     * @memberof opentelemetry.proto.logs.v1.LogRecord
                     * @static
                     * @param {Object.<string,*>} message Plain object to verify
                     * @returns {string|null} `null` if valid, otherwise the reason why it is not
                     */
                    LogRecord.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (message.timeUnixNano != null && message.hasOwnProperty("timeUnixNano"))
                            if (!$util.isInteger(message.timeUnixNano) && !(message.timeUnixNano && $util.isInteger(message.timeUnixNano.low) && $util.isInteger(message.timeUnixNano.high)))
                                return "timeUnixNano: integer|Long expected";
                        if (message.observedTimeUnixNano != null && message.hasOwnProperty("observedTimeUnixNano"))
                            if (!$util.isInteger(message.observedTimeUnixNano) && !(message.observedTimeUnixNano && $util.isInteger(message.observedTimeUnixNano.low) && $util.isInteger(message.observedTimeUnixNano.high)))
                                return "observedTimeUnixNano: integer|Long expected";
                        if (message.severityNumber != null && message.hasOwnProperty("severityNumber"))
                            switch (message.severityNumber) {
                                default:
                                    return "severityNumber: enum value expected";
                                case 0:
                                case 1:
                                case 2:
                                case 3:
                                case 4:
                                case 5:
                                case 6:
                                case 7:
                                case 8:
                                case 9:
                                case 10:
                                case 11:
                                case 12:
                                case 13:
                                case 14:
                                case 15:
                                case 16:
                                case 17:
                                case 18:
                                case 19:
                                case 20:
                                case 21:
                                case 22:
                                case 23:
                                case 24:
                                    break;
                            }
                        if (message.severityText != null && message.hasOwnProperty("severityText"))
                            if (!$util.isString(message.severityText))
                                return "severityText: string expected";
                        if (message.body != null && message.hasOwnProperty("body")) {
                            var error = $root.opentelemetry.proto.common.v1.AnyValue.verify(message.body);
                            if (error)
                                return "body." + error;
                        }
                        if (message.attributes != null && message.hasOwnProperty("attributes")) {
                            if (!Array.isArray(message.attributes))
                                return "attributes: array expected";
                            for (var i = 0; i < message.attributes.length; ++i) {
                                var error = $root.opentelemetry.proto.common.v1.KeyValue.verify(message.attributes[i]);
                                if (error)
                                    return "attributes." + error;
                            }
                        }
                        if (message.droppedAttributesCount != null && message.hasOwnProperty("droppedAttributesCount"))
                            if (!$util.isInteger(message.droppedAttributesCount))
                                return "droppedAttributesCount: integer expected";
                        if (message.flags != null && message.hasOwnProperty("flags"))
                            if (!$util.isInteger(message.flags))
                                return "flags: integer expected";
                        if (message.traceId != null && message.hasOwnProperty("traceId"))
                            if (!(message.traceId && typeof message.traceId.length === "number" || $util.isString(message.traceId)))
                                return "traceId: buffer expected";
                        if (message.spanId != null && message.hasOwnProperty("spanId"))
                            if (!(message.spanId && typeof message.spanId.length === "number" || $util.isString(message.spanId)))
                                return "spanId: buffer expected";
                        return null;
                    };
                    /**
                     * Creates a LogRecord message from a plain object. Also converts values to their respective internal types.
                     * @function fromObject
                     * @memberof opentelemetry.proto.logs.v1.LogRecord
                     * @static
                     * @param {Object.<string,*>} object Plain object
                     * @returns {opentelemetry.proto.logs.v1.LogRecord} LogRecord
                     */
                    LogRecord.fromObject = function fromObject(object) {
                        if (object instanceof $root.opentelemetry.proto.logs.v1.LogRecord)
                            return object;
                        var message = new $root.opentelemetry.proto.logs.v1.LogRecord();
                        if (object.timeUnixNano != null)
                            if ($util.Long)
                                (message.timeUnixNano = $util.Long.fromValue(object.timeUnixNano)).unsigned = false;
                            else if (typeof object.timeUnixNano === "string")
                                message.timeUnixNano = parseInt(object.timeUnixNano, 10);
                            else if (typeof object.timeUnixNano === "number")
                                message.timeUnixNano = object.timeUnixNano;
                            else if (typeof object.timeUnixNano === "object")
                                message.timeUnixNano = new $util.LongBits(object.timeUnixNano.low >>> 0, object.timeUnixNano.high >>> 0).toNumber();
                        if (object.observedTimeUnixNano != null)
                            if ($util.Long)
                                (message.observedTimeUnixNano = $util.Long.fromValue(object.observedTimeUnixNano)).unsigned = false;
                            else if (typeof object.observedTimeUnixNano === "string")
                                message.observedTimeUnixNano = parseInt(object.observedTimeUnixNano, 10);
                            else if (typeof object.observedTimeUnixNano === "number")
                                message.observedTimeUnixNano = object.observedTimeUnixNano;
                            else if (typeof object.observedTimeUnixNano === "object")
                                message.observedTimeUnixNano = new $util.LongBits(object.observedTimeUnixNano.low >>> 0, object.observedTimeUnixNano.high >>> 0).toNumber();
                        switch (object.severityNumber) {
                            default:
                                if (typeof object.severityNumber === "number") {
                                    message.severityNumber = object.severityNumber;
                                    break;
                                }
                                break;
                            case "SEVERITY_NUMBER_UNSPECIFIED":
                            case 0:
                                message.severityNumber = 0;
                                break;
                            case "SEVERITY_NUMBER_TRACE":
                            case 1:
                                message.severityNumber = 1;
                                break;
                            case "SEVERITY_NUMBER_TRACE2":
                            case 2:
                                message.severityNumber = 2;
                                break;
                            case "SEVERITY_NUMBER_TRACE3":
                            case 3:
                                message.severityNumber = 3;
                                break;
                            case "SEVERITY_NUMBER_TRACE4":
                            case 4:
                                message.severityNumber = 4;
                                break;
                            case "SEVERITY_NUMBER_DEBUG":
                            case 5:
                                message.severityNumber = 5;
                                break;
                            case "SEVERITY_NUMBER_DEBUG2":
                            case 6:
                                message.severityNumber = 6;
                                break;
                            case "SEVERITY_NUMBER_DEBUG3":
                            case 7:
                                message.severityNumber = 7;
                                break;
                            case "SEVERITY_NUMBER_DEBUG4":
                            case 8:
                                message.severityNumber = 8;
                                break;
                            case "SEVERITY_NUMBER_INFO":
                            case 9:
                                message.severityNumber = 9;
                                break;
                            case "SEVERITY_NUMBER_INFO2":
                            case 10:
                                message.severityNumber = 10;
                                break;
                            case "SEVERITY_NUMBER_INFO3":
                            case 11:
                                message.severityNumber = 11;
                                break;
                            case "SEVERITY_NUMBER_INFO4":
                            case 12:
                                message.severityNumber = 12;
                                break;
                            case "SEVERITY_NUMBER_WARN":
                            case 13:
                                message.severityNumber = 13;
                                break;
                            case "SEVERITY_NUMBER_WARN2":
                            case 14:
                                message.severityNumber = 14;
                                break;
                            case "SEVERITY_NUMBER_WARN3":
                            case 15:
                                message.severityNumber = 15;
                                break;
                            case "SEVERITY_NUMBER_WARN4":
                            case 16:
                                message.severityNumber = 16;
                                break;
                            case "SEVERITY_NUMBER_ERROR":
                            case 17:
                                message.severityNumber = 17;
                                break;
                            case "SEVERITY_NUMBER_ERROR2":
                            case 18:
                                message.severityNumber = 18;
                                break;
                            case "SEVERITY_NUMBER_ERROR3":
                            case 19:
                                message.severityNumber = 19;
                                break;
                            case "SEVERITY_NUMBER_ERROR4":
                            case 20:
                                message.severityNumber = 20;
                                break;
                            case "SEVERITY_NUMBER_FATAL":
                            case 21:
                                message.severityNumber = 21;
                                break;
                            case "SEVERITY_NUMBER_FATAL2":
                            case 22:
                                message.severityNumber = 22;
                                break;
                            case "SEVERITY_NUMBER_FATAL3":
                            case 23:
                                message.severityNumber = 23;
                                break;
                            case "SEVERITY_NUMBER_FATAL4":
                            case 24:
                                message.severityNumber = 24;
                                break;
                        }
                        if (object.severityText != null)
                            message.severityText = String(object.severityText);
                        if (object.body != null) {
                            if (typeof object.body !== "object")
                                throw TypeError(".opentelemetry.proto.logs.v1.LogRecord.body: object expected");
                            message.body = $root.opentelemetry.proto.common.v1.AnyValue.fromObject(object.body);
                        }
                        if (object.attributes) {
                            if (!Array.isArray(object.attributes))
                                throw TypeError(".opentelemetry.proto.logs.v1.LogRecord.attributes: array expected");
                            message.attributes = [];
                            for (var i = 0; i < object.attributes.length; ++i) {
                                if (typeof object.attributes[i] !== "object")
                                    throw TypeError(".opentelemetry.proto.logs.v1.LogRecord.attributes: object expected");
                                message.attributes[i] = $root.opentelemetry.proto.common.v1.KeyValue.fromObject(object.attributes[i]);
                            }
                        }
                        if (object.droppedAttributesCount != null)
                            message.droppedAttributesCount = object.droppedAttributesCount >>> 0;
                        if (object.flags != null)
                            message.flags = object.flags >>> 0;
                        if (object.traceId != null)
                            if (typeof object.traceId === "string")
                                $util.base64.decode(object.traceId, message.traceId = $util.newBuffer($util.base64.length(object.traceId)), 0);
                            else if (object.traceId.length >= 0)
                                message.traceId = object.traceId;
                        if (object.spanId != null)
                            if (typeof object.spanId === "string")
                                $util.base64.decode(object.spanId, message.spanId = $util.newBuffer($util.base64.length(object.spanId)), 0);
                            else if (object.spanId.length >= 0)
                                message.spanId = object.spanId;
                        return message;
                    };
                    /**
                     * Creates a plain object from a LogRecord message. Also converts values to other types if specified.
                     * @function toObject
                     * @memberof opentelemetry.proto.logs.v1.LogRecord
                     * @static
                     * @param {opentelemetry.proto.logs.v1.LogRecord} message LogRecord
                     * @param {$protobuf.IConversionOptions} [options] Conversion options
                     * @returns {Object.<string,*>} Plain object
                     */
                    LogRecord.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.attributes = [];
                        if (options.defaults) {
                            if ($util.Long) {
                                var long = new $util.Long(0, 0, false);
                                object.timeUnixNano = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                            }
                            else
                                object.timeUnixNano = options.longs === String ? "0" : 0;
                            object.severityNumber = options.enums === String ? "SEVERITY_NUMBER_UNSPECIFIED" : 0;
                            object.severityText = "";
                            object.body = null;
                            object.droppedAttributesCount = 0;
                            object.flags = 0;
                            if (options.bytes === String)
                                object.traceId = "";
                            else {
                                object.traceId = [];
                                if (options.bytes !== Array)
                                    object.traceId = $util.newBuffer(object.traceId);
                            }
                            if (options.bytes === String)
                                object.spanId = "";
                            else {
                                object.spanId = [];
                                if (options.bytes !== Array)
                                    object.spanId = $util.newBuffer(object.spanId);
                            }
                            if ($util.Long) {
                                var long = new $util.Long(0, 0, false);
                                object.observedTimeUnixNano = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                            }
                            else
                                object.observedTimeUnixNano = options.longs === String ? "0" : 0;
                        }
                        if (message.timeUnixNano != null && message.hasOwnProperty("timeUnixNano"))
                            if (typeof message.timeUnixNano === "number")
                                object.timeUnixNano = options.longs === String ? String(message.timeUnixNano) : message.timeUnixNano;
                            else
                                object.timeUnixNano = options.longs === String ? $util.Long.prototype.toString.call(message.timeUnixNano) : options.longs === Number ? new $util.LongBits(message.timeUnixNano.low >>> 0, message.timeUnixNano.high >>> 0).toNumber() : message.timeUnixNano;
                        if (message.severityNumber != null && message.hasOwnProperty("severityNumber"))
                            object.severityNumber = options.enums === String ? $root.opentelemetry.proto.logs.v1.SeverityNumber[message.severityNumber] === undefined ? message.severityNumber : $root.opentelemetry.proto.logs.v1.SeverityNumber[message.severityNumber] : message.severityNumber;
                        if (message.severityText != null && message.hasOwnProperty("severityText"))
                            object.severityText = message.severityText;
                        if (message.body != null && message.hasOwnProperty("body"))
                            object.body = $root.opentelemetry.proto.common.v1.AnyValue.toObject(message.body, options);
                        if (message.attributes && message.attributes.length) {
                            object.attributes = [];
                            for (var j = 0; j < message.attributes.length; ++j)
                                object.attributes[j] = $root.opentelemetry.proto.common.v1.KeyValue.toObject(message.attributes[j], options);
                        }
                        if (message.droppedAttributesCount != null && message.hasOwnProperty("droppedAttributesCount"))
                            object.droppedAttributesCount = message.droppedAttributesCount;
                        if (message.flags != null && message.hasOwnProperty("flags"))
                            object.flags = message.flags;
                        if (message.traceId != null && message.hasOwnProperty("traceId"))
                            object.traceId = options.bytes === String ? $util.base64.encode(message.traceId, 0, message.traceId.length) : options.bytes === Array ? Array.prototype.slice.call(message.traceId) : message.traceId;
                        if (message.spanId != null && message.hasOwnProperty("spanId"))
                            object.spanId = options.bytes === String ? $util.base64.encode(message.spanId, 0, message.spanId.length) : options.bytes === Array ? Array.prototype.slice.call(message.spanId) : message.spanId;
                        if (message.observedTimeUnixNano != null && message.hasOwnProperty("observedTimeUnixNano"))
                            if (typeof message.observedTimeUnixNano === "number")
                                object.observedTimeUnixNano = options.longs === String ? String(message.observedTimeUnixNano) : message.observedTimeUnixNano;
                            else
                                object.observedTimeUnixNano = options.longs === String ? $util.Long.prototype.toString.call(message.observedTimeUnixNano) : options.longs === Number ? new $util.LongBits(message.observedTimeUnixNano.low >>> 0, message.observedTimeUnixNano.high >>> 0).toNumber() : message.observedTimeUnixNano;
                        return object;
                    };
                    /**
                     * Converts this LogRecord to JSON.
                     * @function toJSON
                     * @memberof opentelemetry.proto.logs.v1.LogRecord
                     * @instance
                     * @returns {Object.<string,*>} JSON object
                     */
                    LogRecord.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };
                    /**
                     * Gets the default type url for LogRecord
                     * @function getTypeUrl
                     * @memberof opentelemetry.proto.logs.v1.LogRecord
                     * @static
                     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                     * @returns {string} The default type url
                     */
                    LogRecord.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                        if (typeUrlPrefix === undefined) {
                            typeUrlPrefix = "type.googleapis.com";
                        }
                        return typeUrlPrefix + "/opentelemetry.proto.logs.v1.LogRecord";
                    };
                    return LogRecord;
                })();
                return v1;
            })();
            return logs;
        })();
        return proto;
    })();
    return opentelemetry;
})();
module.exports = $root;
//# sourceMappingURL=root.js.map