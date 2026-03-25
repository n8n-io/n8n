# proto3 JSON serializer for TypeScript / JavaScript

This library implements proto3 JSON serialization and deserialization for
[protobuf.js](https://www.npmjs.com/package/protobufjs) protobuf objects
according to the [spec](https://developers.google.com/protocol-buffers/docs/proto3#json).

Note that the spec requires special representation of some `google.protobuf.*` types
(`Value`, `Struct`, `Timestamp`, `Duration`, etc.), so you cannot just use `.toObject()`
since the result won't be understood by protobuf in other languages.  Hence this module.

JavaScript:

```js
const serializer = require('proto3-json-serializer');
```

TypeScript:

```ts
import * as serializer from 'proto3-json-serializer';
```

## Serialization: protobuf.js object to proto3 JSON

```js
const root = protobuf.loadSync('test.proto');
const Type = root.lookupType('test.Message');
const message = Type.fromObject({...});

const serialized = serializer.toProto3JSON(message);
```

Serialization works with any object created by calling `.create()`, `.decode()`, or `.fromObject()`
for a loaded protobuf type. It relies on the `$type` field so it will not work with a static object.

## Deserialization: proto3 JSON to protobuf.js object

To deserialize an object from proto3 JSON, we must know its type (as returned by `root.lookupType('...')`).
Pass this type as the first parameter to `.fromProto3JSON`:

```js
const root = protobuf.loadSync('test.proto');
const Type = root.lookupType('test.Message');
const json = {...};

const deserialized = serializer.fromProto3JSON(Type, json);
```

## Complete example
```js
const assert = require('assert');
const path = require('path');
const protobuf = require('protobufjs');
const serializer = require('proto3-json-serializer');

// We'll take sample protos from google-proto-files but the code will work with any protos
const protos = require('google-proto-files');

// Load some proto file
const rpcProtos = protos.getProtoPath('rpc');
const root = protobuf.loadSync([
    path.join(rpcProtos, 'status.proto'),
    path.join(rpcProtos, 'error_details.proto'),
]);
const Status = root.lookupType('google.rpc.Status');

// If you have a protobuf object that follows proto3 JSON syntax
// https://developers.google.com/protocol-buffers/docs/proto3#json
// (this is an example of google.rpc.Status message in JSON)
const json = {
    code: 3,
    message: 'Test error message',
    details: [
        {
            '@type': 'google.rpc.BadRequest',
            fieldViolations: [
                {
                    field: 'field',
                    description: 'must not be null',
                },
            ],
        },
    ],
};

// You can deserialize it into a protobuf.js object:
const deserialized = serializer.fromProto3JSON(Status, json);
console.log(deserialized);

// And serialize it back
const serialized = serializer.toProto3JSON(deserialized);
assert.deepStrictEqual(serialized, json);
```

## Disclaimer

This is not an officially supported Google project.
