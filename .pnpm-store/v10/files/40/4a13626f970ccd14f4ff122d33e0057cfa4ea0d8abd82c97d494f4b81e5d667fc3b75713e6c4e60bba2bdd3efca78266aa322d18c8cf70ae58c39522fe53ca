"use strict";
var $protobuf = require("../..");
module.exports = exports = $protobuf.descriptor = $protobuf.Root.fromJSON(require("../../google/protobuf/descriptor.json")).lookup(".google.protobuf");

var Namespace = $protobuf.Namespace,
    Root      = $protobuf.Root,
    Enum      = $protobuf.Enum,
    Type      = $protobuf.Type,
    Field     = $protobuf.Field,
    MapField  = $protobuf.MapField,
    OneOf     = $protobuf.OneOf,
    Service   = $protobuf.Service,
    Method    = $protobuf.Method;

// --- Root ---

/**
 * Properties of a FileDescriptorSet message.
 * @interface IFileDescriptorSet
 * @property {IFileDescriptorProto[]} file Files
 */

/**
 * Properties of a FileDescriptorProto message.
 * @interface IFileDescriptorProto
 * @property {string} [name] File name
 * @property {string} [package] Package
 * @property {*} [dependency] Not supported
 * @property {*} [publicDependency] Not supported
 * @property {*} [weakDependency] Not supported
 * @property {IDescriptorProto[]} [messageType] Nested message types
 * @property {IEnumDescriptorProto[]} [enumType] Nested enums
 * @property {IServiceDescriptorProto[]} [service] Nested services
 * @property {IFieldDescriptorProto[]} [extension] Nested extension fields
 * @property {IFileOptions} [options] Options
 * @property {*} [sourceCodeInfo] Not supported
 * @property {string} [syntax="proto2"] Syntax
 * @property {IEdition} [edition] Edition
 */

/**
 * Values of the Edition enum.
 * @typedef IEdition
 * @type {number}
 * @property {number} EDITION_UNKNOWN=0
 * @property {number} EDITION_LEGACY=900
 * @property {number} EDITION_PROTO2=998
 * @property {number} EDITION_PROTO3=999
 * @property {number} EDITION_2023=1000
 * @property {number} EDITION_2024=1001
 * @property {number} EDITION_1_TEST_ONLY=1
 * @property {number} EDITION_2_TEST_ONLY=2
 * @property {number} EDITION_99997_TEST_ONLY=99997
 * @property {number} EDITION_99998_TEST_ONLY=99998
 * @property {number} EDITION_99998_TEST_ONLY=99999
 * @property {number} EDITION_MAX=2147483647
 */

/**
 * Properties of a FileOptions message.
 * @interface IFileOptions
 * @property {string} [javaPackage]
 * @property {string} [javaOuterClassname]
 * @property {boolean} [javaMultipleFiles]
 * @property {boolean} [javaGenerateEqualsAndHash]
 * @property {boolean} [javaStringCheckUtf8]
 * @property {IFileOptionsOptimizeMode} [optimizeFor=1]
 * @property {string} [goPackage]
 * @property {boolean} [ccGenericServices]
 * @property {boolean} [javaGenericServices]
 * @property {boolean} [pyGenericServices]
 * @property {boolean} [deprecated]
 * @property {boolean} [ccEnableArenas]
 * @property {string} [objcClassPrefix]
 * @property {string} [csharpNamespace]
 */

/**
 * Values of he FileOptions.OptimizeMode enum.
 * @typedef IFileOptionsOptimizeMode
 * @type {number}
 * @property {number} SPEED=1
 * @property {number} CODE_SIZE=2
 * @property {number} LITE_RUNTIME=3
 */

/**
 * Creates a root from a descriptor set.
 * @param {IFileDescriptorSet|Reader|Uint8Array} descriptor Descriptor
 * @returns {Root} Root instance
 */
Root.fromDescriptor = function fromDescriptor(descriptor) {

    // Decode the descriptor message if specified as a buffer:
    if (typeof descriptor.length === "number")
        descriptor = exports.FileDescriptorSet.decode(descriptor);

    var root = new Root();

    if (descriptor.file) {
        var fileDescriptor,
            filePackage;
        for (var j = 0, i; j < descriptor.file.length; ++j) {
            filePackage = root;
            if ((fileDescriptor = descriptor.file[j])["package"] && fileDescriptor["package"].length)
                filePackage = root.define(fileDescriptor["package"]);
            var edition = editionFromDescriptor(fileDescriptor);
            if (fileDescriptor.name && fileDescriptor.name.length)
                root.files.push(filePackage.filename = fileDescriptor.name);
            if (fileDescriptor.messageType)
                for (i = 0; i < fileDescriptor.messageType.length; ++i)
                    filePackage.add(Type.fromDescriptor(fileDescriptor.messageType[i], edition));
            if (fileDescriptor.enumType)
                for (i = 0; i < fileDescriptor.enumType.length; ++i)
                    filePackage.add(Enum.fromDescriptor(fileDescriptor.enumType[i], edition));
            if (fileDescriptor.extension)
                for (i = 0; i < fileDescriptor.extension.length; ++i)
                    filePackage.add(Field.fromDescriptor(fileDescriptor.extension[i], edition));
            if (fileDescriptor.service)
                for (i = 0; i < fileDescriptor.service.length; ++i)
                    filePackage.add(Service.fromDescriptor(fileDescriptor.service[i], edition));
            var opts = fromDescriptorOptions(fileDescriptor.options, exports.FileOptions);
            if (opts) {
                var ks = Object.keys(opts);
                for (i = 0; i < ks.length; ++i)
                    filePackage.setOption(ks[i], opts[ks[i]]);
            }
        }
    }

    return root.resolveAll();
};

/**
 * Converts a root to a descriptor set.
 * @returns {Message<IFileDescriptorSet>} Descriptor
 * @param {string} [edition="proto2"] The syntax or edition to use
 */
Root.prototype.toDescriptor = function toDescriptor(edition) {
    var set = exports.FileDescriptorSet.create();
    Root_toDescriptorRecursive(this, set.file, edition);
    return set;
};

// Traverses a namespace and assembles the descriptor set
function Root_toDescriptorRecursive(ns, files, edition) {

    // Create a new file
    var file = exports.FileDescriptorProto.create({ name: ns.filename || (ns.fullName.substring(1).replace(/\./g, "_") || "root") + ".proto" });
    editionToDescriptor(edition, file);
    if (!(ns instanceof Root))
        file["package"] = ns.fullName.substring(1);

    // Add nested types
    for (var i = 0, nested; i < ns.nestedArray.length; ++i)
        if ((nested = ns._nestedArray[i]) instanceof Type)
            file.messageType.push(nested.toDescriptor(edition));
        else if (nested instanceof Enum)
            file.enumType.push(nested.toDescriptor());
        else if (nested instanceof Field)
            file.extension.push(nested.toDescriptor(edition));
        else if (nested instanceof Service)
            file.service.push(nested.toDescriptor());
        else if (nested instanceof /* plain */ Namespace)
            Root_toDescriptorRecursive(nested, files, edition); // requires new file

    // Keep package-level options
    file.options = toDescriptorOptions(ns.options, exports.FileOptions);

    // And keep the file only if there is at least one nested object
    if (file.messageType.length + file.enumType.length + file.extension.length + file.service.length)
        files.push(file);
}

// --- Type ---

/**
 * Properties of a DescriptorProto message.
 * @interface IDescriptorProto
 * @property {string} [name] Message type name
 * @property {IFieldDescriptorProto[]} [field] Fields
 * @property {IFieldDescriptorProto[]} [extension] Extension fields
 * @property {IDescriptorProto[]} [nestedType] Nested message types
 * @property {IEnumDescriptorProto[]} [enumType] Nested enums
 * @property {IDescriptorProtoExtensionRange[]} [extensionRange] Extension ranges
 * @property {IOneofDescriptorProto[]} [oneofDecl] Oneofs
 * @property {IMessageOptions} [options] Not supported
 * @property {IDescriptorProtoReservedRange[]} [reservedRange] Reserved ranges
 * @property {string[]} [reservedName] Reserved names
 */

/**
 * Properties of a MessageOptions message.
 * @interface IMessageOptions
 * @property {boolean} [mapEntry=false] Whether this message is a map entry
 */

/**
 * Properties of an ExtensionRange message.
 * @interface IDescriptorProtoExtensionRange
 * @property {number} [start] Start field id
 * @property {number} [end] End field id
 */

/**
 * Properties of a ReservedRange message.
 * @interface IDescriptorProtoReservedRange
 * @property {number} [start] Start field id
 * @property {number} [end] End field id
 */

var unnamedMessageIndex = 0;

/**
 * Creates a type from a descriptor.
 *
 * Warning: this is not safe to use with editions protos, since it discards relevant file context.
 *
 * @param {IDescriptorProto|Reader|Uint8Array} descriptor Descriptor
 * @param {string} [edition="proto2"] The syntax or edition to use
 * @param {boolean} [nested=false] Whether or not this is a nested object
 * @returns {Type} Type instance
 */
Type.fromDescriptor = function fromDescriptor(descriptor, edition, nested) {
    // Decode the descriptor message if specified as a buffer:
    if (typeof descriptor.length === "number")
        descriptor = exports.DescriptorProto.decode(descriptor);

    // Create the message type
    var type = new Type(descriptor.name.length ? descriptor.name : "Type" + unnamedMessageIndex++, fromDescriptorOptions(descriptor.options, exports.MessageOptions)),
        i;

    if (!nested)
        type._edition = edition;

    /* Oneofs */ if (descriptor.oneofDecl)
        for (i = 0; i < descriptor.oneofDecl.length; ++i)
            type.add(OneOf.fromDescriptor(descriptor.oneofDecl[i]));
    /* Fields */ if (descriptor.field)
        for (i = 0; i < descriptor.field.length; ++i) {
            var field = Field.fromDescriptor(descriptor.field[i], edition, true);
            type.add(field);
            if (descriptor.field[i].hasOwnProperty("oneofIndex")) // eslint-disable-line no-prototype-builtins
                type.oneofsArray[descriptor.field[i].oneofIndex].add(field);
        }
    /* Extension fields */ if (descriptor.extension)
        for (i = 0; i < descriptor.extension.length; ++i)
            type.add(Field.fromDescriptor(descriptor.extension[i], edition, true));
    /* Nested types */ if (descriptor.nestedType)
        for (i = 0; i < descriptor.nestedType.length; ++i) {
            type.add(Type.fromDescriptor(descriptor.nestedType[i], edition, true));
            if (descriptor.nestedType[i].options && descriptor.nestedType[i].options.mapEntry)
                type.setOption("map_entry", true);
        }
    /* Nested enums */ if (descriptor.enumType)
        for (i = 0; i < descriptor.enumType.length; ++i)
            type.add(Enum.fromDescriptor(descriptor.enumType[i], edition, true));
    /* Extension ranges */ if (descriptor.extensionRange && descriptor.extensionRange.length) {
        type.extensions = [];
        for (i = 0; i < descriptor.extensionRange.length; ++i)
            type.extensions.push([ descriptor.extensionRange[i].start, descriptor.extensionRange[i].end ]);
    }
    /* Reserved... */ if (descriptor.reservedRange && descriptor.reservedRange.length || descriptor.reservedName && descriptor.reservedName.length) {
        type.reserved = [];
        /* Ranges */ if (descriptor.reservedRange)
            for (i = 0; i < descriptor.reservedRange.length; ++i)
                type.reserved.push([ descriptor.reservedRange[i].start, descriptor.reservedRange[i].end ]);
        /* Names */ if (descriptor.reservedName)
            for (i = 0; i < descriptor.reservedName.length; ++i)
                type.reserved.push(descriptor.reservedName[i]);
    }

    return type;
};

/**
 * Converts a type to a descriptor.
 * @returns {Message<IDescriptorProto>} Descriptor
 * @param {string} [edition="proto2"] The syntax or edition to use
 */
Type.prototype.toDescriptor = function toDescriptor(edition) {
    var descriptor = exports.DescriptorProto.create({ name: this.name }),
        i;

    /* Fields */ for (i = 0; i < this.fieldsArray.length; ++i) {
        var fieldDescriptor;
        descriptor.field.push(fieldDescriptor = this._fieldsArray[i].toDescriptor(edition));
        if (this._fieldsArray[i] instanceof MapField) { // map fields are repeated FieldNameEntry
            var keyType = toDescriptorType(this._fieldsArray[i].keyType, this._fieldsArray[i].resolvedKeyType, false),
                valueType = toDescriptorType(this._fieldsArray[i].type, this._fieldsArray[i].resolvedType, false),
                valueTypeName = valueType === /* type */ 11 || valueType === /* enum */ 14
                    ? this._fieldsArray[i].resolvedType && shortname(this.parent, this._fieldsArray[i].resolvedType) || this._fieldsArray[i].type
                    : undefined;
            descriptor.nestedType.push(exports.DescriptorProto.create({
                name: fieldDescriptor.typeName,
                field: [
                    exports.FieldDescriptorProto.create({ name: "key", number: 1, label: 1, type: keyType }), // can't reference a type or enum
                    exports.FieldDescriptorProto.create({ name: "value", number: 2, label: 1, type: valueType, typeName: valueTypeName })
                ],
                options: exports.MessageOptions.create({ mapEntry: true })
            }));
        }
    }
    /* Oneofs */ for (i = 0; i < this.oneofsArray.length; ++i)
        descriptor.oneofDecl.push(this._oneofsArray[i].toDescriptor());
    /* Nested... */ for (i = 0; i < this.nestedArray.length; ++i) {
        /* Extension fields */ if (this._nestedArray[i] instanceof Field)
            descriptor.field.push(this._nestedArray[i].toDescriptor(edition));
        /* Types */ else if (this._nestedArray[i] instanceof Type)
            descriptor.nestedType.push(this._nestedArray[i].toDescriptor(edition));
        /* Enums */ else if (this._nestedArray[i] instanceof Enum)
            descriptor.enumType.push(this._nestedArray[i].toDescriptor());
        // plain nested namespaces become packages instead in Root#toDescriptor
    }
    /* Extension ranges */ if (this.extensions)
        for (i = 0; i < this.extensions.length; ++i)
            descriptor.extensionRange.push(exports.DescriptorProto.ExtensionRange.create({ start: this.extensions[i][0], end: this.extensions[i][1] }));
    /* Reserved... */ if (this.reserved)
        for (i = 0; i < this.reserved.length; ++i)
            /* Names */ if (typeof this.reserved[i] === "string")
                descriptor.reservedName.push(this.reserved[i]);
            /* Ranges */ else
                descriptor.reservedRange.push(exports.DescriptorProto.ReservedRange.create({ start: this.reserved[i][0], end: this.reserved[i][1] }));

    descriptor.options = toDescriptorOptions(this.options, exports.MessageOptions);

    return descriptor;
};

// --- Field ---

/**
 * Properties of a FieldDescriptorProto message.
 * @interface IFieldDescriptorProto
 * @property {string} [name] Field name
 * @property {number} [number] Field id
 * @property {IFieldDescriptorProtoLabel} [label] Field rule
 * @property {IFieldDescriptorProtoType} [type] Field basic type
 * @property {string} [typeName] Field type name
 * @property {string} [extendee] Extended type name
 * @property {string} [defaultValue] Literal default value
 * @property {number} [oneofIndex] Oneof index if part of a oneof
 * @property {*} [jsonName] Not supported
 * @property {IFieldOptions} [options] Field options
 */

/**
 * Values of the FieldDescriptorProto.Label enum.
 * @typedef IFieldDescriptorProtoLabel
 * @type {number}
 * @property {number} LABEL_OPTIONAL=1
 * @property {number} LABEL_REQUIRED=2
 * @property {number} LABEL_REPEATED=3
 */

/**
 * Values of the FieldDescriptorProto.Type enum.
 * @typedef IFieldDescriptorProtoType
 * @type {number}
 * @property {number} TYPE_DOUBLE=1
 * @property {number} TYPE_FLOAT=2
 * @property {number} TYPE_INT64=3
 * @property {number} TYPE_UINT64=4
 * @property {number} TYPE_INT32=5
 * @property {number} TYPE_FIXED64=6
 * @property {number} TYPE_FIXED32=7
 * @property {number} TYPE_BOOL=8
 * @property {number} TYPE_STRING=9
 * @property {number} TYPE_GROUP=10
 * @property {number} TYPE_MESSAGE=11
 * @property {number} TYPE_BYTES=12
 * @property {number} TYPE_UINT32=13
 * @property {number} TYPE_ENUM=14
 * @property {number} TYPE_SFIXED32=15
 * @property {number} TYPE_SFIXED64=16
 * @property {number} TYPE_SINT32=17
 * @property {number} TYPE_SINT64=18
 */

/**
 * Properties of a FieldOptions message.
 * @interface IFieldOptions
 * @property {boolean} [packed] Whether packed or not (defaults to `false` for proto2 and `true` for proto3)
 * @property {IFieldOptionsJSType} [jstype] JavaScript value type (not used by protobuf.js)
 */

/**
 * Values of the FieldOptions.JSType enum.
 * @typedef IFieldOptionsJSType
 * @type {number}
 * @property {number} JS_NORMAL=0
 * @property {number} JS_STRING=1
 * @property {number} JS_NUMBER=2
 */

// copied here from parse.js
var numberRe = /^(?![eE])[0-9]*(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?$/;

/**
 * Creates a field from a descriptor.
 *
 * Warning: this is not safe to use with editions protos, since it discards relevant file context.
 *
 * @param {IFieldDescriptorProto|Reader|Uint8Array} descriptor Descriptor
 * @param {string} [edition="proto2"] The syntax or edition to use
 * @param {boolean} [nested=false] Whether or not this is a top-level object
 * @returns {Field} Field instance
 */
Field.fromDescriptor = function fromDescriptor(descriptor, edition, nested) {

    // Decode the descriptor message if specified as a buffer:
    if (typeof descriptor.length === "number")
        descriptor = exports.DescriptorProto.decode(descriptor);

    if (typeof descriptor.number !== "number")
        throw Error("missing field id");

    // Rewire field type
    var fieldType;
    if (descriptor.typeName && descriptor.typeName.length)
        fieldType = descriptor.typeName;
    else
        fieldType = fromDescriptorType(descriptor.type);

    // Rewire field rule
    var fieldRule;
    switch (descriptor.label) {
        // 0 is reserved for errors
        case 1: fieldRule = undefined; break;
        case 2: fieldRule = "required"; break;
        case 3: fieldRule = "repeated"; break;
        default: throw Error("illegal label: " + descriptor.label);
    }

	var extendee = descriptor.extendee;
	if (descriptor.extendee !== undefined) {
		extendee = extendee.length ? extendee : undefined;
	}
    var field = new Field(
        descriptor.name.length ? descriptor.name : "field" + descriptor.number,
        descriptor.number,
        fieldType,
        fieldRule,
        extendee
    );

    if (!nested)
        field._edition = edition;

    field.options = fromDescriptorOptions(descriptor.options, exports.FieldOptions);
    if (descriptor.proto3_optional)
        field.options.proto3_optional = true;

    if (descriptor.defaultValue && descriptor.defaultValue.length) {
        var defaultValue = descriptor.defaultValue;
        switch (defaultValue) {
            case "true": case "TRUE":
                defaultValue = true;
                break;
            case "false": case "FALSE":
                defaultValue = false;
                break;
            default:
                var match = numberRe.exec(defaultValue);
                if (match)
                    defaultValue = parseInt(defaultValue); // eslint-disable-line radix
                break;
        }
        field.setOption("default", defaultValue);
    }

    if (packableDescriptorType(descriptor.type)) {
        if (edition === "proto3") { // defaults to packed=true (internal preset is packed=true)
            if (descriptor.options && !descriptor.options.packed)
                field.setOption("packed", false);
        } else if ((!edition || edition === "proto2") && descriptor.options && descriptor.options.packed) // defaults to packed=false
            field.setOption("packed", true);
    }

    return field;
};

/**
 * Converts a field to a descriptor.
 * @returns {Message<IFieldDescriptorProto>} Descriptor
 * @param {string} [edition="proto2"] The syntax or edition to use
 */
Field.prototype.toDescriptor = function toDescriptor(edition) {
    var descriptor = exports.FieldDescriptorProto.create({ name: this.name, number: this.id });

    if (this.map) {

        descriptor.type = 11; // message
        descriptor.typeName = $protobuf.util.ucFirst(this.name); // fieldName -> FieldNameEntry (built in Type#toDescriptor)
        descriptor.label = 3; // repeated

    } else {

        // Rewire field type
        switch (descriptor.type = toDescriptorType(this.type, this.resolve().resolvedType, this.delimited)) {
            case 10: // group
            case 11: // type
            case 14: // enum
                descriptor.typeName = this.resolvedType ? shortname(this.parent, this.resolvedType) : this.type;
                break;
        }

        // Rewire field rule
        if (this.rule === "repeated") {
            descriptor.label = 3;
        } else if (this.required && edition === "proto2") {
            descriptor.label = 2;
        } else {
            descriptor.label = 1;
        }
    }

    // Handle extension field
    descriptor.extendee = this.extensionField ? this.extensionField.parent.fullName : this.extend;

    // Handle part of oneof
    if (this.partOf)
        if ((descriptor.oneofIndex = this.parent.oneofsArray.indexOf(this.partOf)) < 0)
            throw Error("missing oneof");

    if (this.options) {
        descriptor.options = toDescriptorOptions(this.options, exports.FieldOptions);
        if (this.options["default"] != null)
            descriptor.defaultValue = String(this.options["default"]);
        if (this.options.proto3_optional)
            descriptor.proto3_optional = true;
    }

    if (edition === "proto3") { // defaults to packed=true
        if (!this.packed)
            (descriptor.options || (descriptor.options = exports.FieldOptions.create())).packed = false;
    } else if ((!edition || edition === "proto2") && this.packed) // defaults to packed=false
        (descriptor.options || (descriptor.options = exports.FieldOptions.create())).packed = true;

    return descriptor;
};

// --- Enum ---

/**
 * Properties of an EnumDescriptorProto message.
 * @interface IEnumDescriptorProto
 * @property {string} [name] Enum name
 * @property {IEnumValueDescriptorProto[]} [value] Enum values
 * @property {IEnumOptions} [options] Enum options
 */

/**
 * Properties of an EnumValueDescriptorProto message.
 * @interface IEnumValueDescriptorProto
 * @property {string} [name] Name
 * @property {number} [number] Value
 * @property {*} [options] Not supported
 */

/**
 * Properties of an EnumOptions message.
 * @interface IEnumOptions
 * @property {boolean} [allowAlias] Whether aliases are allowed
 * @property {boolean} [deprecated]
 */

var unnamedEnumIndex = 0;

/**
 * Creates an enum from a descriptor.
 *
 * Warning: this is not safe to use with editions protos, since it discards relevant file context.
 *
 * @param {IEnumDescriptorProto|Reader|Uint8Array} descriptor Descriptor
 * @param {string} [edition="proto2"] The syntax or edition to use
 * @param {boolean} [nested=false] Whether or not this is a top-level object
 * @returns {Enum} Enum instance
 */
Enum.fromDescriptor = function fromDescriptor(descriptor, edition, nested) {

    // Decode the descriptor message if specified as a buffer:
    if (typeof descriptor.length === "number")
        descriptor = exports.EnumDescriptorProto.decode(descriptor);

    // Construct values object
    var values = {};
    if (descriptor.value)
        for (var i = 0; i < descriptor.value.length; ++i) {
            var name  = descriptor.value[i].name,
                value = descriptor.value[i].number || 0;
            values[name && name.length ? name : "NAME" + value] = value;
        }

    var enm = new Enum(
        descriptor.name && descriptor.name.length ? descriptor.name : "Enum" + unnamedEnumIndex++,
        values,
        fromDescriptorOptions(descriptor.options, exports.EnumOptions)
    );

    if (!nested)
        enm._edition = edition;

    return enm;
};

/**
 * Converts an enum to a descriptor.
 * @returns {Message<IEnumDescriptorProto>} Descriptor
 */
Enum.prototype.toDescriptor = function toDescriptor() {

    // Values
    var values = [];
    for (var i = 0, ks = Object.keys(this.values); i < ks.length; ++i)
        values.push(exports.EnumValueDescriptorProto.create({ name: ks[i], number: this.values[ks[i]] }));

    return exports.EnumDescriptorProto.create({
        name: this.name,
        value: values,
        options: toDescriptorOptions(this.options, exports.EnumOptions)
    });
};

// --- OneOf ---

/**
 * Properties of a OneofDescriptorProto message.
 * @interface IOneofDescriptorProto
 * @property {string} [name] Oneof name
 * @property {*} [options] Not supported
 */

var unnamedOneofIndex = 0;

/**
 * Creates a oneof from a descriptor.
 *
 * Warning: this is not safe to use with editions protos, since it discards relevant file context.
 *
 * @param {IOneofDescriptorProto|Reader|Uint8Array} descriptor Descriptor
 * @returns {OneOf} OneOf instance
 */
OneOf.fromDescriptor = function fromDescriptor(descriptor) {

    // Decode the descriptor message if specified as a buffer:
    if (typeof descriptor.length === "number")
        descriptor = exports.OneofDescriptorProto.decode(descriptor);

    return new OneOf(
        // unnamedOneOfIndex is global, not per type, because we have no ref to a type here
        descriptor.name && descriptor.name.length ? descriptor.name : "oneof" + unnamedOneofIndex++
        // fromDescriptorOptions(descriptor.options, exports.OneofOptions) - only uninterpreted_option
    );
};

/**
 * Converts a oneof to a descriptor.
 * @returns {Message<IOneofDescriptorProto>} Descriptor
 */
OneOf.prototype.toDescriptor = function toDescriptor() {
    return exports.OneofDescriptorProto.create({
        name: this.name
        // options: toDescriptorOptions(this.options, exports.OneofOptions) - only uninterpreted_option
    });
};

// --- Service ---

/**
 * Properties of a ServiceDescriptorProto message.
 * @interface IServiceDescriptorProto
 * @property {string} [name] Service name
 * @property {IMethodDescriptorProto[]} [method] Methods
 * @property {IServiceOptions} [options] Options
 */

/**
 * Properties of a ServiceOptions message.
 * @interface IServiceOptions
 * @property {boolean} [deprecated]
 */

var unnamedServiceIndex = 0;

/**
 * Creates a service from a descriptor.
 *
 * Warning: this is not safe to use with editions protos, since it discards relevant file context.
 *
 * @param {IServiceDescriptorProto|Reader|Uint8Array} descriptor Descriptor
 * @param {string} [edition="proto2"] The syntax or edition to use
 * @param {boolean} [nested=false] Whether or not this is a top-level object
 * @returns {Service} Service instance
 */
Service.fromDescriptor = function fromDescriptor(descriptor, edition, nested) {

    // Decode the descriptor message if specified as a buffer:
    if (typeof descriptor.length === "number")
        descriptor = exports.ServiceDescriptorProto.decode(descriptor);

    var service = new Service(descriptor.name && descriptor.name.length ? descriptor.name : "Service" + unnamedServiceIndex++, fromDescriptorOptions(descriptor.options, exports.ServiceOptions));
    if (!nested)
        service._edition = edition;
    if (descriptor.method)
        for (var i = 0; i < descriptor.method.length; ++i)
            service.add(Method.fromDescriptor(descriptor.method[i]));

    return service;
};

/**
 * Converts a service to a descriptor.
 * @returns {Message<IServiceDescriptorProto>} Descriptor
 */
Service.prototype.toDescriptor = function toDescriptor() {

    // Methods
    var methods = [];
    for (var i = 0; i < this.methodsArray.length; ++i)
        methods.push(this._methodsArray[i].toDescriptor());

    return exports.ServiceDescriptorProto.create({
        name: this.name,
        method: methods,
        options: toDescriptorOptions(this.options, exports.ServiceOptions)
    });
};

// --- Method ---

/**
 * Properties of a MethodDescriptorProto message.
 * @interface IMethodDescriptorProto
 * @property {string} [name] Method name
 * @property {string} [inputType] Request type name
 * @property {string} [outputType] Response type name
 * @property {IMethodOptions} [options] Not supported
 * @property {boolean} [clientStreaming=false] Whether requests are streamed
 * @property {boolean} [serverStreaming=false] Whether responses are streamed
 */

/**
 * Properties of a MethodOptions message.
 *
 * Warning: this is not safe to use with editions protos, since it discards relevant file context.
 *
 * @interface IMethodOptions
 * @property {boolean} [deprecated]
 */

var unnamedMethodIndex = 0;

/**
 * Creates a method from a descriptor.
 * @param {IMethodDescriptorProto|Reader|Uint8Array} descriptor Descriptor
 * @returns {Method} Reflected method instance
 */
Method.fromDescriptor = function fromDescriptor(descriptor) {

    // Decode the descriptor message if specified as a buffer:
    if (typeof descriptor.length === "number")
        descriptor = exports.MethodDescriptorProto.decode(descriptor);

    return new Method(
        // unnamedMethodIndex is global, not per service, because we have no ref to a service here
        descriptor.name && descriptor.name.length ? descriptor.name : "Method" + unnamedMethodIndex++,
        "rpc",
        descriptor.inputType,
        descriptor.outputType,
        Boolean(descriptor.clientStreaming),
        Boolean(descriptor.serverStreaming),
        fromDescriptorOptions(descriptor.options, exports.MethodOptions)
    );
};

/**
 * Converts a method to a descriptor.
 * @returns {Message<IMethodDescriptorProto>} Descriptor
 */
Method.prototype.toDescriptor = function toDescriptor() {
    return exports.MethodDescriptorProto.create({
        name: this.name,
        inputType: this.resolvedRequestType ? this.resolvedRequestType.fullName : this.requestType,
        outputType: this.resolvedResponseType ? this.resolvedResponseType.fullName : this.responseType,
        clientStreaming: this.requestStream,
        serverStreaming: this.responseStream,
        options: toDescriptorOptions(this.options, exports.MethodOptions)
    });
};

// --- utility ---

// Converts a descriptor type to a protobuf.js basic type
function fromDescriptorType(type) {
    switch (type) {
        // 0 is reserved for errors
        case 1: return "double";
        case 2: return "float";
        case 3: return "int64";
        case 4: return "uint64";
        case 5: return "int32";
        case 6: return "fixed64";
        case 7: return "fixed32";
        case 8: return "bool";
        case 9: return "string";
        case 12: return "bytes";
        case 13: return "uint32";
        case 15: return "sfixed32";
        case 16: return "sfixed64";
        case 17: return "sint32";
        case 18: return "sint64";
    }
    throw Error("illegal type: " + type);
}

// Tests if a descriptor type is packable
function packableDescriptorType(type) {
    switch (type) {
        case 1: // double
        case 2: // float
        case 3: // int64
        case 4: // uint64
        case 5: // int32
        case 6: // fixed64
        case 7: // fixed32
        case 8: // bool
        case 13: // uint32
        case 14: // enum (!)
        case 15: // sfixed32
        case 16: // sfixed64
        case 17: // sint32
        case 18: // sint64
            return true;
    }
    return false;
}

// Converts a protobuf.js basic type to a descriptor type
function toDescriptorType(type, resolvedType, delimited) {
    switch (type) {
        // 0 is reserved for errors
        case "double": return 1;
        case "float": return 2;
        case "int64": return 3;
        case "uint64": return 4;
        case "int32": return 5;
        case "fixed64": return 6;
        case "fixed32": return 7;
        case "bool": return 8;
        case "string": return 9;
        case "bytes": return 12;
        case "uint32": return 13;
        case "sfixed32": return 15;
        case "sfixed64": return 16;
        case "sint32": return 17;
        case "sint64": return 18;
    }
    if (resolvedType instanceof Enum)
        return 14;
    if (resolvedType instanceof Type)
        return delimited ? 10 : 11;
    throw Error("illegal type: " + type);
}

function fromDescriptorOptionsRecursive(obj, type) {
    var val = {};
    for (var i = 0, field, key; i < type.fieldsArray.length; ++i) {
        if ((key = (field = type._fieldsArray[i]).name) === "uninterpretedOption") continue;
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

        var newKey = underScore(key);
        if (field.resolvedType instanceof Type) {
            val[newKey] = fromDescriptorOptionsRecursive(obj[key], field.resolvedType);
        } else if(field.resolvedType instanceof Enum) {
            val[newKey] = field.resolvedType.valuesById[obj[key]];
        } else {
            val[newKey] = obj[key];
        }
    }
    return val;
}

// Converts descriptor options to an options object
function fromDescriptorOptions(options, type) {
    if (!options)
        return undefined;
    return fromDescriptorOptionsRecursive(type.toObject(options), type);
}

function toDescriptorOptionsRecursive(obj, type) {
    var val = {};
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var newKey = $protobuf.util.camelCase(key);
        if (!Object.prototype.hasOwnProperty.call(type.fields, newKey)) continue;
        var field = type.fields[newKey];
        if (field.resolvedType instanceof Type) {
            val[newKey] = toDescriptorOptionsRecursive(obj[key], field.resolvedType);
        } else {
            val[newKey] = obj[key];
        }
        if (field.repeated && !Array.isArray(val[newKey])) {
            val[newKey] = [val[newKey]];
        }
    }
    return val;
}

// Converts an options object to descriptor options
function toDescriptorOptions(options, type) {
    if (!options)
        return undefined;
    return type.fromObject(toDescriptorOptionsRecursive(options, type));
}

// Calculates the shortest relative path from `from` to `to`.
function shortname(from, to) {
    var fromPath = from.fullName.split("."),
        toPath = to.fullName.split("."),
        i = 0,
        j = 0,
        k = toPath.length - 1;
    if (!(from instanceof Root) && to instanceof Namespace)
        while (i < fromPath.length && j < k && fromPath[i] === toPath[j]) {
            var other = to.lookup(fromPath[i++], true);
            if (other !== null && other !== to)
                break;
            ++j;
        }
    else
        for (; i < fromPath.length && j < k && fromPath[i] === toPath[j]; ++i, ++j);
    return toPath.slice(j).join(".");
}

// copied here from cli/targets/proto.js
function underScore(str) {
    return str.substring(0,1)
         + str.substring(1)
               .replace(/([A-Z])(?=[a-z]|$)/g, function($0, $1) { return "_" + $1.toLowerCase(); });
}

function editionFromDescriptor(fileDescriptor) {
    if (fileDescriptor.syntax === "editions") {
        switch(fileDescriptor.edition) {
            case exports.Edition.EDITION_2023:
                return "2023";
            default:
                throw new Error("Unsupported edition " + fileDescriptor.edition);
        }
    }
    if (fileDescriptor.syntax === "proto3") {
        return "proto3";
    }
    return "proto2";
}

function editionToDescriptor(edition, fileDescriptor) {
    if (!edition) return;
    if (edition === "proto2" || edition === "proto3") {
        fileDescriptor.syntax = edition;
    } else {
        fileDescriptor.syntax = "editions";
        switch(edition) {
            case "2023":
                fileDescriptor.edition = exports.Edition.EDITION_2023;
                break;
            default:
                throw new Error("Unsupported edition " + edition);
        }
    }
}

// --- exports ---

/**
 * Reflected file descriptor set.
 * @name FileDescriptorSet
 * @type {Type}
 * @const
 * @tstype $protobuf.Type
 */

/**
 * Reflected file descriptor proto.
 * @name FileDescriptorProto
 * @type {Type}
 * @const
 * @tstype $protobuf.Type
 */

/**
 * Reflected descriptor proto.
 * @name DescriptorProto
 * @type {Type}
 * @property {Type} ExtensionRange
 * @property {Type} ReservedRange
 * @const
 * @tstype $protobuf.Type & {
 *     ExtensionRange: $protobuf.Type,
 *     ReservedRange: $protobuf.Type
 * }
 */

/**
 * Reflected field descriptor proto.
 * @name FieldDescriptorProto
 * @type {Type}
 * @property {Enum} Label
 * @property {Enum} Type
 * @const
 * @tstype $protobuf.Type & {
 *     Label: $protobuf.Enum,
 *     Type: $protobuf.Enum
 * }
 */

/**
 * Reflected oneof descriptor proto.
 * @name OneofDescriptorProto
 * @type {Type}
 * @const
 * @tstype $protobuf.Type
 */

/**
 * Reflected enum descriptor proto.
 * @name EnumDescriptorProto
 * @type {Type}
 * @const
 * @tstype $protobuf.Type
 */

/**
 * Reflected service descriptor proto.
 * @name ServiceDescriptorProto
 * @type {Type}
 * @const
 * @tstype $protobuf.Type
 */

/**
 * Reflected enum value descriptor proto.
 * @name EnumValueDescriptorProto
 * @type {Type}
 * @const
 * @tstype $protobuf.Type
 */

/**
 * Reflected method descriptor proto.
 * @name MethodDescriptorProto
 * @type {Type}
 * @const
 * @tstype $protobuf.Type
 */

/**
 * Reflected file options.
 * @name FileOptions
 * @type {Type}
 * @property {Enum} OptimizeMode
 * @const
 * @tstype $protobuf.Type & {
 *     OptimizeMode: $protobuf.Enum
 * }
 */

/**
 * Reflected message options.
 * @name MessageOptions
 * @type {Type}
 * @const
 * @tstype $protobuf.Type
 */

/**
 * Reflected field options.
 * @name FieldOptions
 * @type {Type}
 * @property {Enum} CType
 * @property {Enum} JSType
 * @const
 * @tstype $protobuf.Type & {
 *     CType: $protobuf.Enum,
 *     JSType: $protobuf.Enum
 * }
 */

/**
 * Reflected oneof options.
 * @name OneofOptions
 * @type {Type}
 * @const
 * @tstype $protobuf.Type
 */

/**
 * Reflected enum options.
 * @name EnumOptions
 * @type {Type}
 * @const
 * @tstype $protobuf.Type
 */

/**
 * Reflected enum value options.
 * @name EnumValueOptions
 * @type {Type}
 * @const
 * @tstype $protobuf.Type
 */

/**
 * Reflected service options.
 * @name ServiceOptions
 * @type {Type}
 * @const
 * @tstype $protobuf.Type
 */

/**
 * Reflected method options.
 * @name MethodOptions
 * @type {Type}
 * @const
 * @tstype $protobuf.Type
 */

/**
 * Reflected uninterpretet option.
 * @name UninterpretedOption
 * @type {Type}
 * @property {Type} NamePart
 * @const
 * @tstype $protobuf.Type & {
 *     NamePart: $protobuf.Type
 * }
 */

/**
 * Reflected source code info.
 * @name SourceCodeInfo
 * @type {Type}
 * @property {Type} Location
 * @const
 * @tstype $protobuf.Type & {
 *     Location: $protobuf.Type
 * }
 */

/**
 * Reflected generated code info.
 * @name GeneratedCodeInfo
 * @type {Type}
 * @property {Type} Annotation
 * @const
 * @tstype $protobuf.Type & {
 *     Annotation: $protobuf.Type
 * }
 */
