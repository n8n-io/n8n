protobufjs/ext/descriptor
=========================

Experimental extension for interoperability with [descriptor.proto](https://github.com/google/protobuf/blob/master/src/google/protobuf/descriptor.proto) types.

Usage
-----

```js
var protobuf   = require("protobufjs"), // requires the full library
    descriptor = require("protobufjs/ext/descriptor");

var root = ...;

// convert any existing root instance to the corresponding descriptor type
var descriptorMsg = root.toDescriptor("proto2");
// ^ returns a FileDescriptorSet message, see table below

// encode to a descriptor buffer
var buffer = descriptor.FileDescriptorSet.encode(descriptorMsg).finish();

// decode from a descriptor buffer
var decodedDescriptor = descriptor.FileDescriptorSet.decode(buffer);

// convert any existing descriptor to a root instance
root = protobuf.Root.fromDescriptor(decodedDescriptor);
// ^ expects a FileDescriptorSet message or buffer, see table below

// and start all over again
```

API
---

The extension adds `.fromDescriptor(descriptor[, syntax])` and `#toDescriptor([syntax])` methods to reflection objects and exports the `.google.protobuf` namespace of the internally used `Root` instance containing the following types present in descriptor.proto:

| Descriptor type               | protobuf.js type | Remarks
|-------------------------------|------------------|---------
| **FileDescriptorSet**         | Root             |
| FileDescriptorProto           |                  | dependencies are not supported
| FileOptions                   |                  |
| FileOptionsOptimizeMode       |                  |
| SourceCodeInfo                |                  | not supported
| SourceCodeInfoLocation        |                  |
| GeneratedCodeInfo             |                  | not supported
| GeneratedCodeInfoAnnotation   |                  |
| **DescriptorProto**           | Type             |
| MessageOptions                |                  |
| DescriptorProtoExtensionRange |                  |
| DescriptorProtoReservedRange  |                  |
| **FieldDescriptorProto**      | Field            |
| FieldDescriptorProtoLabel     |                  |
| FieldDescriptorProtoType      |                  |
| FieldOptions                  |                  |
| FieldOptionsCType             |                  |
| FieldOptionsJSType            |                  |
| **OneofDescriptorProto**      | OneOf            |
| OneofOptions                  |                  |
| **EnumDescriptorProto**       | Enum             |
| EnumOptions                   |                  |
| EnumValueDescriptorProto      |                  |
| EnumValueOptions              |                  | not supported
| **ServiceDescriptorProto**    | Service          |
| ServiceOptions                |                  |
| **MethodDescriptorProto**     | Method           |
| MethodOptions                 |                  |
| UninterpretedOption           |                  | not supported
| UninterpretedOptionNamePart   |                  |

Note that not all features of descriptor.proto translate perfectly to a protobuf.js root instance. A root instance has only limited knowlege of packages or individual files for example, which is then compensated by guessing and generating fictional file names.

When using TypeScript, the respective interface types can be used to reference specific message instances (i.e. `protobuf.Message<IDescriptorProto>`).
