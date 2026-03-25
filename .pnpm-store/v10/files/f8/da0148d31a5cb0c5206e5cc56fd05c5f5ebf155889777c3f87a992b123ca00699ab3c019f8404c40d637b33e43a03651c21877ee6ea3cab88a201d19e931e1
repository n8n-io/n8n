// Protocol Buffers - Google's data interchange format
// Copyright 2008 Google Inc.  All rights reserved.
// https://developers.google.com/protocol-buffers/
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//     * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

// Author: kenton@google.com (Kenton Varda)
//  Based on original Protocol Buffers design by
//  Sanjay Ghemawat, Jeff Dean, and others.
//
// The messages in this file describe the definitions found in .proto files.
// A valid .proto file can be translated directly to a FileDescriptorProto
// without any other information (e.g. without reading its imports).

syntax = "proto2";

package google.protobuf;

option go_package = "google.golang.org/protobuf/types/descriptorpb";
option java_package = "com.google.protobuf";
option java_outer_classname = "DescriptorProtos";
option csharp_namespace = "Google.Protobuf.Reflection";
option objc_class_prefix = "GPB";
option cc_enable_arenas = true;

// descriptor.proto must be optimized for speed because reflection-based
// algorithms don't work during bootstrapping.
option optimize_for = SPEED;

// The protocol compiler can output a FileDescriptorSet containing the .proto
// files it parses.
message FileDescriptorSet {
  repeated FileDescriptorProto file = 1;
}

// The full set of known editions.
enum Edition {
  // A placeholder for an unknown edition value.
  EDITION_UNKNOWN = 0;

  // Legacy syntax "editions".  These pre-date editions, but behave much like
  // distinct editions.  These can't be used to specify the edition of proto
  // files, but feature definitions must supply proto2/proto3 defaults for
  // backwards compatibility.
  EDITION_PROTO2 = 998;
  EDITION_PROTO3 = 999;

  // Editions that have been released.  The specific values are arbitrary and
  // should not be depended on, but they will always be time-ordered for easy
  // comparison.
  EDITION_2023 = 1000;
  EDITION_2024 = 1001;

  // Placeholder editions for testing feature resolution.  These should not be
  // used or relyed on outside of tests.
  EDITION_1_TEST_ONLY = 1;
  EDITION_2_TEST_ONLY = 2;
  EDITION_99997_TEST_ONLY = 99997;
  EDITION_99998_TEST_ONLY = 99998;
  EDITION_99999_TEST_ONLY = 99999;

  // Placeholder for specifying unbounded edition support.  This should only
  // ever be used by plugins that can expect to never require any changes to
  // support a new edition.
  EDITION_MAX = 0x7FFFFFFF;
}

// Describes a complete .proto file.
message FileDescriptorProto {
  optional string name = 1;     // file name, relative to root of source tree
  optional string package = 2;  // e.g. "foo", "foo.bar", etc.

  // Names of files imported by this file.
  repeated string dependency = 3;
  // Indexes of the public imported files in the dependency list above.
  repeated int32 public_dependency = 10;
  // Indexes of the weak imported files in the dependency list.
  // For Google-internal migration only. Do not use.
  repeated int32 weak_dependency = 11;

  // All top-level definitions in this file.
  repeated DescriptorProto message_type = 4;
  repeated EnumDescriptorProto enum_type = 5;
  repeated ServiceDescriptorProto service = 6;
  repeated FieldDescriptorProto extension = 7;

  optional FileOptions options = 8;

  // This field contains optional information about the original source code.
  // You may safely remove this entire field without harming runtime
  // functionality of the descriptors -- the information is needed only by
  // development tools.
  optional SourceCodeInfo source_code_info = 9;

  // The syntax of the proto file.
  // The supported values are "proto2", "proto3", and "editions".
  //
  // If `edition` is present, this value must be "editions".
  optional string syntax = 12;

  // The edition of the proto file.
  optional Edition edition = 14;
}

// Describes a message type.
message DescriptorProto {
  optional string name = 1;

  repeated FieldDescriptorProto field = 2;
  repeated FieldDescriptorProto extension = 6;

  repeated DescriptorProto nested_type = 3;
  repeated EnumDescriptorProto enum_type = 4;

  message ExtensionRange {
    optional int32 start = 1;  // Inclusive.
    optional int32 end = 2;    // Exclusive.

    optional ExtensionRangeOptions options = 3;
  }
  repeated ExtensionRange extension_range = 5;

  repeated OneofDescriptorProto oneof_decl = 8;

  optional MessageOptions options = 7;

  // Range of reserved tag numbers. Reserved tag numbers may not be used by
  // fields or extension ranges in the same message. Reserved ranges may
  // not overlap.
  message ReservedRange {
    optional int32 start = 1;  // Inclusive.
    optional int32 end = 2;    // Exclusive.
  }
  repeated ReservedRange reserved_range = 9;
  // Reserved field names, which may not be used by fields in the same message.
  // A given name may only be reserved once.
  repeated string reserved_name = 10;
}

message ExtensionRangeOptions {
  // The parser stores options it doesn't recognize here. See above.
  repeated UninterpretedOption uninterpreted_option = 999;

  message Declaration {
    // The extension number declared within the extension range.
    optional int32 number = 1;

    // The fully-qualified name of the extension field. There must be a leading
    // dot in front of the full name.
    optional string full_name = 2;

    // The fully-qualified type name of the extension field. Unlike
    // Metadata.type, Declaration.type must have a leading dot for messages
    // and enums.
    optional string type = 3;

    // If true, indicates that the number is reserved in the extension range,
    // and any extension field with the number will fail to compile. Set this
    // when a declared extension field is deleted.
    optional bool reserved = 5;

    // If true, indicates that the extension must be defined as repeated.
    // Otherwise the extension must be defined as optional.
    optional bool repeated = 6;

    reserved 4;  // removed is_repeated
  }

  // For external users: DO NOT USE. We are in the process of open sourcing
  // extension declaration and executing internal cleanups before it can be
  // used externally.
  repeated Declaration declaration = 2 [retention = RETENTION_SOURCE];

  // Any features defined in the specific edition.
  optional FeatureSet features = 50;

  // The verification state of the extension range.
  enum VerificationState {
    // All the extensions of the range must be declared.
    DECLARATION = 0;
    UNVERIFIED = 1;
  }

  // The verification state of the range.
  // TODO: flip the default to DECLARATION once all empty ranges
  // are marked as UNVERIFIED.
  optional VerificationState verification = 3
      [default = UNVERIFIED, retention = RETENTION_SOURCE];

  // Clients can define custom options in extensions of this message. See above.
  extensions 1000 to max;
}

// Describes a field within a message.
message FieldDescriptorProto {
  enum Type {
    // 0 is reserved for errors.
    // Order is weird for historical reasons.
    TYPE_DOUBLE = 1;
    TYPE_FLOAT = 2;
    // Not ZigZag encoded.  Negative numbers take 10 bytes.  Use TYPE_SINT64 if
    // negative values are likely.
    TYPE_INT64 = 3;
    TYPE_UINT64 = 4;
    // Not ZigZag encoded.  Negative numbers take 10 bytes.  Use TYPE_SINT32 if
    // negative values are likely.
    TYPE_INT32 = 5;
    TYPE_FIXED64 = 6;
    TYPE_FIXED32 = 7;
    TYPE_BOOL = 8;
    TYPE_STRING = 9;
    // Tag-delimited aggregate.
    // Group type is deprecated and not supported after google.protobuf. However, Proto3
    // implementations should still be able to parse the group wire format and
    // treat group fields as unknown fields.  In Editions, the group wire format
    // can be enabled via the `message_encoding` feature.
    TYPE_GROUP = 10;
    TYPE_MESSAGE = 11;  // Length-delimited aggregate.

    // New in version 2.
    TYPE_BYTES = 12;
    TYPE_UINT32 = 13;
    TYPE_ENUM = 14;
    TYPE_SFIXED32 = 15;
    TYPE_SFIXED64 = 16;
    TYPE_SINT32 = 17;  // Uses ZigZag encoding.
    TYPE_SINT64 = 18;  // Uses ZigZag encoding.
  }

  enum Label {
    // 0 is reserved for errors
    LABEL_OPTIONAL = 1;
    LABEL_REPEATED = 3;
    // The required label is only allowed in google.protobuf.  In proto3 and Editions
    // it's explicitly prohibited.  In Editions, the `field_presence` feature
    // can be used to get this behavior.
    LABEL_REQUIRED = 2;
  }

  optional string name = 1;
  optional int32 number = 3;
  optional Label label = 4;

  // If type_name is set, this need not be set.  If both this and type_name
  // are set, this must be one of TYPE_ENUM, TYPE_MESSAGE or TYPE_GROUP.
  optional Type type = 5;

  // For message and enum types, this is the name of the type.  If the name
  // starts with a '.', it is fully-qualified.  Otherwise, C++-like scoping
  // rules are used to find the type (i.e. first the nested types within this
  // message are searched, then within the parent, on up to the root
  // namespace).
  optional string type_name = 6;

  // For extensions, this is the name of the type being extended.  It is
  // resolved in the same manner as type_name.
  optional string extendee = 2;

  // For numeric types, contains the original text representation of the value.
  // For booleans, "true" or "false".
  // For strings, contains the default text contents (not escaped in any way).
  // For bytes, contains the C escaped value.  All bytes >= 128 are escaped.
  optional string default_value = 7;

  // If set, gives the index of a oneof in the containing type's oneof_decl
  // list.  This field is a member of that oneof.
  optional int32 oneof_index = 9;

  // JSON name of this field. The value is set by protocol compiler. If the
  // user has set a "json_name" option on this field, that option's value
  // will be used. Otherwise, it's deduced from the field's name by converting
  // it to camelCase.
  optional string json_name = 10;

  optional FieldOptions options = 8;

  // If true, this is a proto3 "optional". When a proto3 field is optional, it
  // tracks presence regardless of field type.
  //
  // When proto3_optional is true, this field must belong to a oneof to signal
  // to old proto3 clients that presence is tracked for this field. This oneof
  // is known as a "synthetic" oneof, and this field must be its sole member
  // (each proto3 optional field gets its own synthetic oneof). Synthetic oneofs
  // exist in the descriptor only, and do not generate any API. Synthetic oneofs
  // must be ordered after all "real" oneofs.
  //
  // For message fields, proto3_optional doesn't create any semantic change,
  // since non-repeated message fields always track presence. However it still
  // indicates the semantic detail of whether the user wrote "optional" or not.
  // This can be useful for round-tripping the .proto file. For consistency we
  // give message fields a synthetic oneof also, even though it is not required
  // to track presence. This is especially important because the parser can't
  // tell if a field is a message or an enum, so it must always create a
  // synthetic oneof.
  //
  // Proto2 optional fields do not set this flag, because they already indicate
  // optional with `LABEL_OPTIONAL`.
  optional bool proto3_optional = 17;
}

// Describes a oneof.
message OneofDescriptorProto {
  optional string name = 1;
  optional OneofOptions options = 2;
}

// Describes an enum type.
message EnumDescriptorProto {
  optional string name = 1;

  repeated EnumValueDescriptorProto value = 2;

  optional EnumOptions options = 3;

  // Range of reserved numeric values. Reserved values may not be used by
  // entries in the same enum. Reserved ranges may not overlap.
  //
  // Note that this is distinct from DescriptorProto.ReservedRange in that it
  // is inclusive such that it can appropriately represent the entire int32
  // domain.
  message EnumReservedRange {
    optional int32 start = 1;  // Inclusive.
    optional int32 end = 2;    // Inclusive.
  }

  // Range of reserved numeric values. Reserved numeric values may not be used
  // by enum values in the same enum declaration. Reserved ranges may not
  // overlap.
  repeated EnumReservedRange reserved_range = 4;

  // Reserved enum value names, which may not be reused. A given name may only
  // be reserved once.
  repeated string reserved_name = 5;
}

// Describes a value within an enum.
message EnumValueDescriptorProto {
  optional string name = 1;
  optional int32 number = 2;

  optional EnumValueOptions options = 3;
}

// Describes a service.
message ServiceDescriptorProto {
  optional string name = 1;
  repeated MethodDescriptorProto method = 2;

  optional ServiceOptions options = 3;
}

// Describes a method of a service.
message MethodDescriptorProto {
  optional string name = 1;

  // Input and output type names.  These are resolved in the same way as
  // FieldDescriptorProto.type_name, but must refer to a message type.
  optional string input_type = 2;
  optional string output_type = 3;

  optional MethodOptions options = 4;

  // Identifies if client streams multiple client messages
  optional bool client_streaming = 5 [default = false];
  // Identifies if server streams multiple server messages
  optional bool server_streaming = 6 [default = false];
}

// ===================================================================
// Options

// Each of the definitions above may have "options" attached.  These are
// just annotations which may cause code to be generated slightly differently
// or may contain hints for code that manipulates protocol messages.
//
// Clients may define custom options as extensions of the *Options messages.
// These extensions may not yet be known at parsing time, so the parser cannot
// store the values in them.  Instead it stores them in a field in the *Options
// message called uninterpreted_option. This field must have the same name
// across all *Options messages. We then use this field to populate the
// extensions when we build a descriptor, at which point all protos have been
// parsed and so all extensions are known.
//
// Extension numbers for custom options may be chosen as follows:
// * For options which will only be used within a single application or
//   organization, or for experimental options, use field numbers 50000
//   through 99999.  It is up to you to ensure that you do not use the
//   same number for multiple options.
// * For options which will be published and used publicly by multiple
//   independent entities, e-mail protobuf-global-extension-registry@google.com
//   to reserve extension numbers. Simply provide your project name (e.g.
//   Objective-C plugin) and your project website (if available) -- there's no
//   need to explain how you intend to use them. Usually you only need one
//   extension number. You can declare multiple options with only one extension
//   number by putting them in a sub-message. See the Custom Options section of
//   the docs for examples:
//   https://developers.google.com/protocol-buffers/docs/proto#options
//   If this turns out to be popular, a web service will be set up
//   to automatically assign option numbers.

message FileOptions {

  // Sets the Java package where classes generated from this .proto will be
  // placed.  By default, the proto package is used, but this is often
  // inappropriate because proto packages do not normally start with backwards
  // domain names.
  optional string java_package = 1;

  // Controls the name of the wrapper Java class generated for the .proto file.
  // That class will always contain the .proto file's getDescriptor() method as
  // well as any top-level extensions defined in the .proto file.
  // If java_multiple_files is disabled, then all the other classes from the
  // .proto file will be nested inside the single wrapper outer class.
  optional string java_outer_classname = 8;

  // If enabled, then the Java code generator will generate a separate .java
  // file for each top-level message, enum, and service defined in the .proto
  // file.  Thus, these types will *not* be nested inside the wrapper class
  // named by java_outer_classname.  However, the wrapper class will still be
  // generated to contain the file's getDescriptor() method as well as any
  // top-level extensions defined in the file.
  optional bool java_multiple_files = 10 [default = false];

  // This option does nothing.
  optional bool java_generate_equals_and_hash = 20 [deprecated=true];

  // A proto2 file can set this to true to opt in to UTF-8 checking for Java,
  // which will throw an exception if invalid UTF-8 is parsed from the wire or
  // assigned to a string field.
  //
  // TODO: clarify exactly what kinds of field types this option
  // applies to, and update these docs accordingly.
  //
  // Proto3 files already perform these checks. Setting the option explicitly to
  // false has no effect: it cannot be used to opt proto3 files out of UTF-8
  // checks.
  optional bool java_string_check_utf8 = 27 [default = false];

  // Generated classes can be optimized for speed or code size.
  enum OptimizeMode {
    SPEED = 1;         // Generate complete code for parsing, serialization,
                       // etc.
    CODE_SIZE = 2;     // Use ReflectionOps to implement these methods.
    LITE_RUNTIME = 3;  // Generate code using MessageLite and the lite runtime.
  }
  optional OptimizeMode optimize_for = 9 [default = SPEED];

  // Sets the Go package where structs generated from this .proto will be
  // placed. If omitted, the Go package will be derived from the following:
  //   - The basename of the package import path, if provided.
  //   - Otherwise, the package statement in the .proto file, if present.
  //   - Otherwise, the basename of the .proto file, without extension.
  optional string go_package = 11;

  // Should generic services be generated in each language?  "Generic" services
  // are not specific to any particular RPC system.  They are generated by the
  // main code generators in each language (without additional plugins).
  // Generic services were the only kind of service generation supported by
  // early versions of google.protobuf.
  //
  // Generic services are now considered deprecated in favor of using plugins
  // that generate code specific to your particular RPC system.  Therefore,
  // these default to false.  Old code which depends on generic services should
  // explicitly set them to true.
  optional bool cc_generic_services = 16 [default = false];
  optional bool java_generic_services = 17 [default = false];
  optional bool py_generic_services = 18 [default = false];
  reserved 42;  // removed php_generic_services

  // Is this file deprecated?
  // Depending on the target platform, this can emit Deprecated annotations
  // for everything in the file, or it will be completely ignored; in the very
  // least, this is a formalization for deprecating files.
  optional bool deprecated = 23 [default = false];

  // Enables the use of arenas for the proto messages in this file. This applies
  // only to generated classes for C++.
  optional bool cc_enable_arenas = 31 [default = true];

  // Sets the objective c class prefix which is prepended to all objective c
  // generated classes from this .proto. There is no default.
  optional string objc_class_prefix = 36;

  // Namespace for generated classes; defaults to the package.
  optional string csharp_namespace = 37;

  // By default Swift generators will take the proto package and CamelCase it
  // replacing '.' with underscore and use that to prefix the types/symbols
  // defined. When this options is provided, they will use this value instead
  // to prefix the types/symbols defined.
  optional string swift_prefix = 39;

  // Sets the php class prefix which is prepended to all php generated classes
  // from this .proto. Default is empty.
  optional string php_class_prefix = 40;

  // Use this option to change the namespace of php generated classes. Default
  // is empty. When this option is empty, the package name will be used for
  // determining the namespace.
  optional string php_namespace = 41;

  // Use this option to change the namespace of php generated metadata classes.
  // Default is empty. When this option is empty, the proto file name will be
  // used for determining the namespace.
  optional string php_metadata_namespace = 44;

  // Use this option to change the package of ruby generated classes. Default
  // is empty. When this option is not set, the package name will be used for
  // determining the ruby package.
  optional string ruby_package = 45;

  // Any features defined in the specific edition.
  optional FeatureSet features = 50;

  // The parser stores options it doesn't recognize here.
  // See the documentation for the "Options" section above.
  repeated UninterpretedOption uninterpreted_option = 999;

  // Clients can define custom options in extensions of this message.
  // See the documentation for the "Options" section above.
  extensions 1000 to max;

  reserved 38;
}

message MessageOptions {
  // Set true to use the old proto1 MessageSet wire format for extensions.
  // This is provided for backwards-compatibility with the MessageSet wire
  // format.  You should not use this for any other reason:  It's less
  // efficient, has fewer features, and is more complicated.
  //
  // The message must be defined exactly as follows:
  //   message Foo {
  //     option message_set_wire_format = true;
  //     extensions 4 to max;
  //   }
  // Note that the message cannot have any defined fields; MessageSets only
  // have extensions.
  //
  // All extensions of your type must be singular messages; e.g. they cannot
  // be int32s, enums, or repeated messages.
  //
  // Because this is an option, the above two restrictions are not enforced by
  // the protocol compiler.
  optional bool message_set_wire_format = 1 [default = false];

  // Disables the generation of the standard "descriptor()" accessor, which can
  // conflict with a field of the same name.  This is meant to make migration
  // from proto1 easier; new code should avoid fields named "descriptor".
  optional bool no_standard_descriptor_accessor = 2 [default = false];

  // Is this message deprecated?
  // Depending on the target platform, this can emit Deprecated annotations
  // for the message, or it will be completely ignored; in the very least,
  // this is a formalization for deprecating messages.
  optional bool deprecated = 3 [default = false];

  reserved 4, 5, 6;

  // Whether the message is an automatically generated map entry type for the
  // maps field.
  //
  // For maps fields:
  //     map<KeyType, ValueType> map_field = 1;
  // The parsed descriptor looks like:
  //     message MapFieldEntry {
  //         option map_entry = true;
  //         optional KeyType key = 1;
  //         optional ValueType value = 2;
  //     }
  //     repeated MapFieldEntry map_field = 1;
  //
  // Implementations may choose not to generate the map_entry=true message, but
  // use a native map in the target language to hold the keys and values.
  // The reflection APIs in such implementations still need to work as
  // if the field is a repeated message field.
  //
  // NOTE: Do not set the option in .proto files. Always use the maps syntax
  // instead. The option should only be implicitly set by the proto compiler
  // parser.
  optional bool map_entry = 7;

  reserved 8;  // javalite_serializable
  reserved 9;  // javanano_as_lite

  // Enable the legacy handling of JSON field name conflicts.  This lowercases
  // and strips underscored from the fields before comparison in proto3 only.
  // The new behavior takes `json_name` into account and applies to proto2 as
  // well.
  //
  // This should only be used as a temporary measure against broken builds due
  // to the change in behavior for JSON field name conflicts.
  //
  // TODO This is legacy behavior we plan to remove once downstream
  // teams have had time to migrate.
  optional bool deprecated_legacy_json_field_conflicts = 11 [deprecated = true];

  // Any features defined in the specific edition.
  optional FeatureSet features = 12;

  // The parser stores options it doesn't recognize here. See above.
  repeated UninterpretedOption uninterpreted_option = 999;

  // Clients can define custom options in extensions of this message. See above.
  extensions 1000 to max;
}

message FieldOptions {
  // The ctype option instructs the C++ code generator to use a different
  // representation of the field than it normally would.  See the specific
  // options below.  This option is only implemented to support use of
  // [ctype=CORD] and [ctype=STRING] (the default) on non-repeated fields of
  // type "bytes" in the open source release -- sorry, we'll try to include
  // other types in a future version!
  optional CType ctype = 1 [default = STRING];
  enum CType {
    // Default mode.
    STRING = 0;

    // The option [ctype=CORD] may be applied to a non-repeated field of type
    // "bytes". It indicates that in C++, the data should be stored in a Cord
    // instead of a string.  For very large strings, this may reduce memory
    // fragmentation. It may also allow better performance when parsing from a
    // Cord, or when parsing with aliasing enabled, as the parsed Cord may then
    // alias the original buffer.
    CORD = 1;

    STRING_PIECE = 2;
  }
  // The packed option can be enabled for repeated primitive fields to enable
  // a more efficient representation on the wire. Rather than repeatedly
  // writing the tag and type for each element, the entire array is encoded as
  // a single length-delimited blob. In proto3, only explicit setting it to
  // false will avoid using packed encoding.  This option is prohibited in
  // Editions, but the `repeated_field_encoding` feature can be used to control
  // the behavior.
  optional bool packed = 2;

  // The jstype option determines the JavaScript type used for values of the
  // field.  The option is permitted only for 64 bit integral and fixed types
  // (int64, uint64, sint64, fixed64, sfixed64).  A field with jstype JS_STRING
  // is represented as JavaScript string, which avoids loss of precision that
  // can happen when a large value is converted to a floating point JavaScript.
  // Specifying JS_NUMBER for the jstype causes the generated JavaScript code to
  // use the JavaScript "number" type.  The behavior of the default option
  // JS_NORMAL is implementation dependent.
  //
  // This option is an enum to permit additional types to be added, e.g.
  // goog.math.Integer.
  optional JSType jstype = 6 [default = JS_NORMAL];
  enum JSType {
    // Use the default type.
    JS_NORMAL = 0;

    // Use JavaScript strings.
    JS_STRING = 1;

    // Use JavaScript numbers.
    JS_NUMBER = 2;
  }

  // Should this field be parsed lazily?  Lazy applies only to message-type
  // fields.  It means that when the outer message is initially parsed, the
  // inner message's contents will not be parsed but instead stored in encoded
  // form.  The inner message will actually be parsed when it is first accessed.
  //
  // This is only a hint.  Implementations are free to choose whether to use
  // eager or lazy parsing regardless of the value of this option.  However,
  // setting this option true suggests that the protocol author believes that
  // using lazy parsing on this field is worth the additional bookkeeping
  // overhead typically needed to implement it.
  //
  // This option does not affect the public interface of any generated code;
  // all method signatures remain the same.  Furthermore, thread-safety of the
  // interface is not affected by this option; const methods remain safe to
  // call from multiple threads concurrently, while non-const methods continue
  // to require exclusive access.
  //
  // Note that lazy message fields are still eagerly verified to check
  // ill-formed wireformat or missing required fields. Calling IsInitialized()
  // on the outer message would fail if the inner message has missing required
  // fields. Failed verification would result in parsing failure (except when
  // uninitialized messages are acceptable).
  optional bool lazy = 5 [default = false];

  // unverified_lazy does no correctness checks on the byte stream. This should
  // only be used where lazy with verification is prohibitive for performance
  // reasons.
  optional bool unverified_lazy = 15 [default = false];

  // Is this field deprecated?
  // Depending on the target platform, this can emit Deprecated annotations
  // for accessors, or it will be completely ignored; in the very least, this
  // is a formalization for deprecating fields.
  optional bool deprecated = 3 [default = false];

  // For Google-internal migration only. Do not use.
  optional bool weak = 10 [default = false];

  // Indicate that the field value should not be printed out when using debug
  // formats, e.g. when the field contains sensitive credentials.
  optional bool debug_redact = 16 [default = false];

  // If set to RETENTION_SOURCE, the option will be omitted from the binary.
  // Note: as of January 2023, support for this is in progress and does not yet
  // have an effect (b/264593489).
  enum OptionRetention {
    RETENTION_UNKNOWN = 0;
    RETENTION_RUNTIME = 1;
    RETENTION_SOURCE = 2;
  }

  optional OptionRetention retention = 17;

  // This indicates the types of entities that the field may apply to when used
  // as an option. If it is unset, then the field may be freely used as an
  // option on any kind of entity. Note: as of January 2023, support for this is
  // in progress and does not yet have an effect (b/264593489).
  enum OptionTargetType {
    TARGET_TYPE_UNKNOWN = 0;
    TARGET_TYPE_FILE = 1;
    TARGET_TYPE_EXTENSION_RANGE = 2;
    TARGET_TYPE_MESSAGE = 3;
    TARGET_TYPE_FIELD = 4;
    TARGET_TYPE_ONEOF = 5;
    TARGET_TYPE_ENUM = 6;
    TARGET_TYPE_ENUM_ENTRY = 7;
    TARGET_TYPE_SERVICE = 8;
    TARGET_TYPE_METHOD = 9;
  }

  repeated OptionTargetType targets = 19;

  message EditionDefault {
    optional Edition edition = 3;
    optional string value = 2;  // Textproto value.
  }
  repeated EditionDefault edition_defaults = 20;

  // Any features defined in the specific edition.
  optional FeatureSet features = 21;

  // The parser stores options it doesn't recognize here. See above.
  repeated UninterpretedOption uninterpreted_option = 999;

  // Clients can define custom options in extensions of this message. See above.
  extensions 1000 to max;

  reserved 4;   // removed jtype
  reserved 18;  // reserve target, target_obsolete_do_not_use
}

message OneofOptions {
  // Any features defined in the specific edition.
  optional FeatureSet features = 1;

  // The parser stores options it doesn't recognize here. See above.
  repeated UninterpretedOption uninterpreted_option = 999;

  // Clients can define custom options in extensions of this message. See above.
  extensions 1000 to max;
}

message EnumOptions {

  // Set this option to true to allow mapping different tag names to the same
  // value.
  optional bool allow_alias = 2;

  // Is this enum deprecated?
  // Depending on the target platform, this can emit Deprecated annotations
  // for the enum, or it will be completely ignored; in the very least, this
  // is a formalization for deprecating enums.
  optional bool deprecated = 3 [default = false];

  reserved 5;  // javanano_as_lite

  // Enable the legacy handling of JSON field name conflicts.  This lowercases
  // and strips underscored from the fields before comparison in proto3 only.
  // The new behavior takes `json_name` into account and applies to proto2 as
  // well.
  // TODO Remove this legacy behavior once downstream teams have
  // had time to migrate.
  optional bool deprecated_legacy_json_field_conflicts = 6 [deprecated = true];

  // Any features defined in the specific edition.
  optional FeatureSet features = 7;

  // The parser stores options it doesn't recognize here. See above.
  repeated UninterpretedOption uninterpreted_option = 999;

  // Clients can define custom options in extensions of this message. See above.
  extensions 1000 to max;
}

message EnumValueOptions {
  // Is this enum value deprecated?
  // Depending on the target platform, this can emit Deprecated annotations
  // for the enum value, or it will be completely ignored; in the very least,
  // this is a formalization for deprecating enum values.
  optional bool deprecated = 1 [default = false];

  // Any features defined in the specific edition.
  optional FeatureSet features = 2;

  // Indicate that fields annotated with this enum value should not be printed
  // out when using debug formats, e.g. when the field contains sensitive
  // credentials.
  optional bool debug_redact = 3 [default = false];

  // The parser stores options it doesn't recognize here. See above.
  repeated UninterpretedOption uninterpreted_option = 999;

  // Clients can define custom options in extensions of this message. See above.
  extensions 1000 to max;
}

message ServiceOptions {

  // Any features defined in the specific edition.
  optional FeatureSet features = 34;

  // Note:  Field numbers 1 through 32 are reserved for Google's internal RPC
  //   framework.  We apologize for hoarding these numbers to ourselves, but
  //   we were already using them long before we decided to release Protocol
  //   Buffers.

  // Is this service deprecated?
  // Depending on the target platform, this can emit Deprecated annotations
  // for the service, or it will be completely ignored; in the very least,
  // this is a formalization for deprecating services.
  optional bool deprecated = 33 [default = false];

  // The parser stores options it doesn't recognize here. See above.
  repeated UninterpretedOption uninterpreted_option = 999;

  // Clients can define custom options in extensions of this message. See above.
  extensions 1000 to max;
}

message MethodOptions {

  // Note:  Field numbers 1 through 32 are reserved for Google's internal RPC
  //   framework.  We apologize for hoarding these numbers to ourselves, but
  //   we were already using them long before we decided to release Protocol
  //   Buffers.

  // Is this method deprecated?
  // Depending on the target platform, this can emit Deprecated annotations
  // for the method, or it will be completely ignored; in the very least,
  // this is a formalization for deprecating methods.
  optional bool deprecated = 33 [default = false];

  // Is this method side-effect-free (or safe in HTTP parlance), or idempotent,
  // or neither? HTTP based RPC implementation may choose GET verb for safe
  // methods, and PUT verb for idempotent methods instead of the default POST.
  enum IdempotencyLevel {
    IDEMPOTENCY_UNKNOWN = 0;
    NO_SIDE_EFFECTS = 1;  // implies idempotent
    IDEMPOTENT = 2;       // idempotent, but may have side effects
  }
  optional IdempotencyLevel idempotency_level = 34
      [default = IDEMPOTENCY_UNKNOWN];

  // Any features defined in the specific edition.
  optional FeatureSet features = 35;

  // The parser stores options it doesn't recognize here. See above.
  repeated UninterpretedOption uninterpreted_option = 999;

  // Clients can define custom options in extensions of this message. See above.
  extensions 1000 to max;
}

// A message representing a option the parser does not recognize. This only
// appears in options protos created by the compiler::Parser class.
// DescriptorPool resolves these when building Descriptor objects. Therefore,
// options protos in descriptor objects (e.g. returned by Descriptor::options(),
// or produced by Descriptor::CopyTo()) will never have UninterpretedOptions
// in them.
message UninterpretedOption {
  // The name of the uninterpreted option.  Each string represents a segment in
  // a dot-separated name.  is_extension is true iff a segment represents an
  // extension (denoted with parentheses in options specs in .proto files).
  // E.g.,{ ["foo", false], ["bar.baz", true], ["moo", false] } represents
  // "foo.(bar.baz).moo".
  message NamePart {
    required string name_part = 1;
    required bool is_extension = 2;
  }
  repeated NamePart name = 2;

  // The value of the uninterpreted option, in whatever type the tokenizer
  // identified it as during parsing. Exactly one of these should be set.
  optional string identifier_value = 3;
  optional uint64 positive_int_value = 4;
  optional int64 negative_int_value = 5;
  optional double double_value = 6;
  optional bytes string_value = 7;
  optional string aggregate_value = 8;
}

// ===================================================================
// Features

// TODO Enums in C++ gencode (and potentially other languages) are
// not well scoped.  This means that each of the feature enums below can clash
// with each other.  The short names we've chosen maximize call-site
// readability, but leave us very open to this scenario.  A future feature will
// be designed and implemented to handle this, hopefully before we ever hit a
// conflict here.
message FeatureSet {
  enum FieldPresence {
    FIELD_PRESENCE_UNKNOWN = 0;
    EXPLICIT = 1;
    IMPLICIT = 2;
    LEGACY_REQUIRED = 3;
  }
  optional FieldPresence field_presence = 1 [
    retention = RETENTION_RUNTIME,
    targets = TARGET_TYPE_FIELD,
    targets = TARGET_TYPE_FILE,
    edition_defaults = { edition: EDITION_PROTO2, value: "EXPLICIT" },
    edition_defaults = { edition: EDITION_PROTO3, value: "IMPLICIT" },
    edition_defaults = { edition: EDITION_2023, value: "EXPLICIT" }
  ];

  enum EnumType {
    ENUM_TYPE_UNKNOWN = 0;
    OPEN = 1;
    CLOSED = 2;
  }
  optional EnumType enum_type = 2 [
    retention = RETENTION_RUNTIME,
    targets = TARGET_TYPE_ENUM,
    targets = TARGET_TYPE_FILE,
    edition_defaults = { edition: EDITION_PROTO2, value: "CLOSED" },
    edition_defaults = { edition: EDITION_PROTO3, value: "OPEN" }
  ];

  enum RepeatedFieldEncoding {
    REPEATED_FIELD_ENCODING_UNKNOWN = 0;
    PACKED = 1;
    EXPANDED = 2;
  }
  optional RepeatedFieldEncoding repeated_field_encoding = 3 [
    retention = RETENTION_RUNTIME,
    targets = TARGET_TYPE_FIELD,
    targets = TARGET_TYPE_FILE,
    edition_defaults = { edition: EDITION_PROTO2, value: "EXPANDED" },
    edition_defaults = { edition: EDITION_PROTO3, value: "PACKED" }
  ];

  enum Utf8Validation {
    UTF8_VALIDATION_UNKNOWN = 0;
    VERIFY = 2;
    NONE = 3;
  }
  optional Utf8Validation utf8_validation = 4 [
    retention = RETENTION_RUNTIME,
    targets = TARGET_TYPE_FIELD,
    targets = TARGET_TYPE_FILE,
    edition_defaults = { edition: EDITION_PROTO2, value: "NONE" },
    edition_defaults = { edition: EDITION_PROTO3, value: "VERIFY" }
  ];

  enum MessageEncoding {
    MESSAGE_ENCODING_UNKNOWN = 0;
    LENGTH_PREFIXED = 1;
    DELIMITED = 2;
  }
  optional MessageEncoding message_encoding = 5 [
    retention = RETENTION_RUNTIME,
    targets = TARGET_TYPE_FIELD,
    targets = TARGET_TYPE_FILE,
    edition_defaults = { edition: EDITION_PROTO2, value: "LENGTH_PREFIXED" }
  ];

  enum JsonFormat {
    JSON_FORMAT_UNKNOWN = 0;
    ALLOW = 1;
    LEGACY_BEST_EFFORT = 2;
  }
  optional JsonFormat json_format = 6 [
    retention = RETENTION_RUNTIME,
    targets = TARGET_TYPE_MESSAGE,
    targets = TARGET_TYPE_ENUM,
    targets = TARGET_TYPE_FILE,
    edition_defaults = { edition: EDITION_PROTO2, value: "LEGACY_BEST_EFFORT" },
    edition_defaults = { edition: EDITION_PROTO3, value: "ALLOW" }
  ];

  reserved 999;

  extensions 1000;  // for Protobuf C++
  extensions 1001;  // for Protobuf Java
  extensions 1002;  // for Protobuf Go

  extensions 9990;  // for deprecated Java Proto1

  extensions 9995 to 9999;  // For internal testing
  extensions 10000;         // for https://github.com/bufbuild/protobuf-es
}

// A compiled specification for the defaults of a set of features.  These
// messages are generated from FeatureSet extensions and can be used to seed
// feature resolution. The resolution with this object becomes a simple search
// for the closest matching edition, followed by proto merges.
message FeatureSetDefaults {
  // A map from every known edition with a unique set of defaults to its
  // defaults. Not all editions may be contained here.  For a given edition,
  // the defaults at the closest matching edition ordered at or before it should
  // be used.  This field must be in strict ascending order by edition.
  message FeatureSetEditionDefault {
    optional Edition edition = 3;
    optional FeatureSet features = 2;
  }
  repeated FeatureSetEditionDefault defaults = 1;

  // The minimum supported edition (inclusive) when this was constructed.
  // Editions before this will not have defaults.
  optional Edition minimum_edition = 4;

  // The maximum known edition (inclusive) when this was constructed. Editions
  // after this will not have reliable defaults.
  optional Edition maximum_edition = 5;
}

// ===================================================================
// Optional source code info

// Encapsulates information about the original source file from which a
// FileDescriptorProto was generated.
message SourceCodeInfo {
  // A Location identifies a piece of source code in a .proto file which
  // corresponds to a particular definition.  This information is intended
  // to be useful to IDEs, code indexers, documentation generators, and similar
  // tools.
  //
  // For example, say we have a file like:
  //   message Foo {
  //     optional string foo = 1;
  //   }
  // Let's look at just the field definition:
  //   optional string foo = 1;
  //   ^       ^^     ^^  ^  ^^^
  //   a       bc     de  f  ghi
  // We have the following locations:
  //   span   path               represents
  //   [a,i)  [ 4, 0, 2, 0 ]     The whole field definition.
  //   [a,b)  [ 4, 0, 2, 0, 4 ]  The label (optional).
  //   [c,d)  [ 4, 0, 2, 0, 5 ]  The type (string).
  //   [e,f)  [ 4, 0, 2, 0, 1 ]  The name (foo).
  //   [g,h)  [ 4, 0, 2, 0, 3 ]  The number (1).
  //
  // Notes:
  // - A location may refer to a repeated field itself (i.e. not to any
  //   particular index within it).  This is used whenever a set of elements are
  //   logically enclosed in a single code segment.  For example, an entire
  //   extend block (possibly containing multiple extension definitions) will
  //   have an outer location whose path refers to the "extensions" repeated
  //   field without an index.
  // - Multiple locations may have the same path.  This happens when a single
  //   logical declaration is spread out across multiple places.  The most
  //   obvious example is the "extend" block again -- there may be multiple
  //   extend blocks in the same scope, each of which will have the same path.
  // - A location's span is not always a subset of its parent's span.  For
  //   example, the "extendee" of an extension declaration appears at the
  //   beginning of the "extend" block and is shared by all extensions within
  //   the block.
  // - Just because a location's span is a subset of some other location's span
  //   does not mean that it is a descendant.  For example, a "group" defines
  //   both a type and a field in a single declaration.  Thus, the locations
  //   corresponding to the type and field and their components will overlap.
  // - Code which tries to interpret locations should probably be designed to
  //   ignore those that it doesn't understand, as more types of locations could
  //   be recorded in the future.
  repeated Location location = 1;
  message Location {
    // Identifies which part of the FileDescriptorProto was defined at this
    // location.
    //
    // Each element is a field number or an index.  They form a path from
    // the root FileDescriptorProto to the place where the definition appears.
    // For example, this path:
    //   [ 4, 3, 2, 7, 1 ]
    // refers to:
    //   file.message_type(3)  // 4, 3
    //       .field(7)         // 2, 7
    //       .name()           // 1
    // This is because FileDescriptorProto.message_type has field number 4:
    //   repeated DescriptorProto message_type = 4;
    // and DescriptorProto.field has field number 2:
    //   repeated FieldDescriptorProto field = 2;
    // and FieldDescriptorProto.name has field number 1:
    //   optional string name = 1;
    //
    // Thus, the above path gives the location of a field name.  If we removed
    // the last element:
    //   [ 4, 3, 2, 7 ]
    // this path refers to the whole field declaration (from the beginning
    // of the label to the terminating semicolon).
    repeated int32 path = 1 [packed = true];

    // Always has exactly three or four elements: start line, start column,
    // end line (optional, otherwise assumed same as start line), end column.
    // These are packed into a single field for efficiency.  Note that line
    // and column numbers are zero-based -- typically you will want to add
    // 1 to each before displaying to a user.
    repeated int32 span = 2 [packed = true];

    // If this SourceCodeInfo represents a complete declaration, these are any
    // comments appearing before and after the declaration which appear to be
    // attached to the declaration.
    //
    // A series of line comments appearing on consecutive lines, with no other
    // tokens appearing on those lines, will be treated as a single comment.
    //
    // leading_detached_comments will keep paragraphs of comments that appear
    // before (but not connected to) the current element. Each paragraph,
    // separated by empty lines, will be one comment element in the repeated
    // field.
    //
    // Only the comment content is provided; comment markers (e.g. //) are
    // stripped out.  For block comments, leading whitespace and an asterisk
    // will be stripped from the beginning of each line other than the first.
    // Newlines are included in the output.
    //
    // Examples:
    //
    //   optional int32 foo = 1;  // Comment attached to foo.
    //   // Comment attached to bar.
    //   optional int32 bar = 2;
    //
    //   optional string baz = 3;
    //   // Comment attached to baz.
    //   // Another line attached to baz.
    //
    //   // Comment attached to moo.
    //   //
    //   // Another line attached to moo.
    //   optional double moo = 4;
    //
    //   // Detached comment for corge. This is not leading or trailing comments
    //   // to moo or corge because there are blank lines separating it from
    //   // both.
    //
    //   // Detached comment for corge paragraph 2.
    //
    //   optional string corge = 5;
    //   /* Block comment attached
    //    * to corge.  Leading asterisks
    //    * will be removed. */
    //   /* Block comment attached to
    //    * grault. */
    //   optional int32 grault = 6;
    //
    //   // ignored detached comments.
    optional string leading_comments = 3;
    optional string trailing_comments = 4;
    repeated string leading_detached_comments = 6;
  }
}

// Describes the relationship between generated code and its original source
// file. A GeneratedCodeInfo message is associated with only one generated
// source file, but may contain references to different source .proto files.
message GeneratedCodeInfo {
  // An Annotation connects some span of text in generated code to an element
  // of its generating .proto file.
  repeated Annotation annotation = 1;
  message Annotation {
    // Identifies the element in the original source .proto file. This field
    // is formatted the same as SourceCodeInfo.Location.path.
    repeated int32 path = 1 [packed = true];

    // Identifies the filesystem path to the original source .proto.
    optional string source_file = 2;

    // Identifies the starting offset in bytes in the generated code
    // that relates to the identified object.
    optional int32 begin = 3;

    // Identifies the ending offset in bytes in the generated code that
    // relates to the identified object. The end offset should be one past
    // the last relevant byte (so the length of the text = end - begin).
    optional int32 end = 4;

    // Represents the identified object's effect on the element in the original
    // .proto file.
    enum Semantic {
      // There is no effect or the effect is indescribable.
      NONE = 0;
      // The element is set or otherwise mutated.
      SET = 1;
      // An alias to the element is returned.
      ALIAS = 2;
    }
    optional Semantic semantic = 5;
  }
}
