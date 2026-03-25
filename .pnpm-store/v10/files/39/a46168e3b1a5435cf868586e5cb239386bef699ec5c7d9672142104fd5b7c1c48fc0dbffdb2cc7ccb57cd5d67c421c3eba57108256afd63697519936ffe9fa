# @volar/source-map

Provides functionality related to source maps.

## API

### This package exports a `SourceMap` class with the following methods:

Params:

- `fallbackToAnyMatch`(default: false): allow the start and end offsets to come from different mappings.
- `filter?: (data: Data) => boolean)`(default: undefined):  according to mapping: Mapping<MyDataType>.data, filter out offsets that do not meet the custom conditions.

Methods:

- `toSourceRange(generatedStart: number, generatedEnd: number, fallbackToAnyMatch: boolean, filter?: (data: Data) => boolean)`: Returns all source start and end offsets for the given generated start and end offsets.

- `toGeneratedRange(sourceStart: number, sourceEnd: number, fallbackToAnyMatch: boolean, filter?: (data: Data) => boolean) `: Returns all generated start and end offsets for the given source start and end offsets.

- `toSourceLocation(generatedOffset: number, filter?: (data: Data) => boolean)`: Returns all source offsets for a given generated offset.

- `toGeneratedLocation(sourceOffset: number, filter?: (data: Data) => boolean)`: Returns all generated offsets for a given source offset.

## Data Structures

### `Mapping`

The `Mapping` is a tuple that represents a mapping in the source map. It consists of the following elements:

- `source`: A string representing the source file. This can be `undefined`.
- `sourceOffsets`: Offsets in the source code.
- `generatedOffsets`: Offsets in the generated code.
- `data`: The data associated with this mapping. The type of this data is generic and can be specified when creating a `SourceMap` instance.

Here is an example of a `Mapping`:

```ts
let mapping: Mapping<MyDataType> = {
    source: '.../sourceFile.ts',
    sourceOffsets: [10],
    generatedOffsets: [30],
	lengths: [10],
    data: myData,
};
```

In this example, `myData` is of type `MyDataType`, which is the type specified for the SourceMap instance.

Remember to replace `MyDataType` and `myData` with actual types and data that are relevant to your project.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
