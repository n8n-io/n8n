# gRPC Protobuf Loader

A utility package for loading `.proto` files for use with gRPC, using the latest Protobuf.js package.
Please refer to [protobuf.js' documentation](https://github.com/dcodeIO/protobuf.js/blob/master/README.md)
to understands its features and limitations.

## Installation

```sh
npm install @grpc/proto-loader
```

## Usage

```js
const protoLoader = require('@grpc/proto-loader');
const grpcLibrary = require('grpc');
// OR
const grpcLibrary = require('@grpc/grpc-js');

protoLoader.load(protoFileName, options).then(packageDefinition => {
  const packageObject = grpcLibrary.loadPackageDefinition(packageDefinition);
});
// OR
const packageDefinition = protoLoader.loadSync(protoFileName, options);
const packageObject = grpcLibrary.loadPackageDefinition(packageDefinition);
```

The options parameter is an object that can have the following optional properties:

| Field name | Valid values | Description
|------------|--------------|------------
| `keepCase` | `true` or `false` | Preserve field names. The default is to change them to camel case.
| `longs` | `String` or `Number` | The type to use to represent `long` values. Defaults to a `Long` object type.
| `enums` | `String` | The type to use to represent `enum` values. Defaults to the numeric value.
| `bytes` | `Array` or `String` | The type to use to represent `bytes` values. Defaults to `Buffer`.
| `defaults` | `true` or `false` | Set default values on output objects. Defaults to `false`.
| `arrays` | `true` or `false` | Set empty arrays for missing array values even if `defaults` is `false` Defaults to `false`.
| `objects` | `true` or `false` | Set empty objects for missing object values even if `defaults` is `false` Defaults to `false`.
| `oneofs` | `true` or `false` | Set virtual oneof properties to the present field's name. Defaults to `false`.
| `json` | `true` or `false` | Represent `Infinity` and `NaN` as strings in `float` fields, and automatically decode `google.protobuf.Any` values. Defaults to `false`
| `includeDirs` | An array of strings | A list of search paths for imported `.proto` files.

The following options object closely approximates the existing behavior of `grpc.load`:

```js
const options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
}
```

## Generating TypeScript types

The `proto-loader-gen-types` script distributed with this package can be used to generate TypeScript type information for the objects loaded at runtime. More information about how to use it can be found in [the *@grpc/proto-loader TypeScript Type Generator CLI Tool* proposal document](https://github.com/grpc/proposal/blob/master/L70-node-proto-loader-type-generator.md). The arguments mostly match the `load` function's options; the full usage information is as follows:

```console
proto-loader-gen-types.js [options] filenames...

Options:
      --help             Show help                                     [boolean]
      --version          Show version number                           [boolean]
      --keepCase         Preserve the case of field names
                                                      [boolean] [default: false]
      --longs            The type that should be used to output 64 bit integer
                         values. Can be String, Number[string] [default: "Long"]
      --enums            The type that should be used to output enum fields. Can
                         be String                  [string] [default: "number"]
      --bytes            The type that should be used to output bytes fields.
                         Can be String, Array       [string] [default: "Buffer"]
      --defaults         Output default values for omitted fields
                                                      [boolean] [default: false]
      --arrays           Output default values for omitted repeated fields even
                         if --defaults is not set     [boolean] [default: false]
      --objects          Output default values for omitted message fields even
                         if --defaults is not set     [boolean] [default: false]
      --oneofs           Output virtual oneof fields set to the present field's
                         name                         [boolean] [default: false]
      --json             Represent Infinity and NaN as strings in float fields.
                         Also decode google.protobuf.Any automatically
                                                      [boolean] [default: false]
      --includeComments  Generate doc comments from comments in the original
                         files                        [boolean] [default: false]
  -I, --includeDirs      Directories to search for included files        [array]
  -O, --outDir           Directory in which to output files  [string] [required]
      --grpcLib          The gRPC implementation library that these types will
                         be used with. If not provided, some types will not be
                         generated                                      [string]
      --inputTemplate    Template for mapping input or "permissive" type names
                                                        [string] [default: "%s"]
      --outputTemplate   Template for mapping output or "restricted" type names
                                                [string] [default: "%s__Output"]
      --inputBranded     Output property for branded type for  "permissive"
                         types with fullName of the Message as its value
                                                      [boolean] [default: false]
      --outputBranded    Output property for branded type for  "restricted"
                         types with fullName of the Message as its value
                                                      [boolean] [default: false]
```

### Example Usage

Generate the types:

```sh
$(npm bin)/proto-loader-gen-types --longs=String --enums=String --defaults --oneofs --grpcLib=@grpc/grpc-js --outDir=proto/ proto/*.proto
```

Consume the types:

```ts
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import type { ProtoGrpcType } from './proto/example.ts';
import type { ExampleHandlers } from './proto/example_package/Example.ts';

const exampleServer: ExampleHandlers = {
  // server handlers implementation...
};

const packageDefinition = protoLoader.loadSync('./proto/example.proto');
const proto = (grpc.loadPackageDefinition(
  packageDefinition
) as unknown) as ProtoGrpcType;

const server = new grpc.Server();
server.addService(proto.example_package.Example.service, exampleServer);
```
