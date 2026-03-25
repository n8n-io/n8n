import type {TypedArray} from './typed-array';
import type {FindGlobalInstanceType} from './find-global-type';

type StructuredCloneablePrimitive =
	| string
	| number
	| bigint
	| boolean
	| null
	| undefined
	| Boolean
	| Number
	| String;

type StructuredCloneableData =
	| ArrayBuffer
	| DataView
	| Date
	| Error
	| RegExp
	| TypedArray
	| FindGlobalInstanceType<
	// DOM or Node types
	| 'Blob'
	| 'File'
	// DOM exclusive types
	| 'AudioData'
	| 'CropTarget'
	| 'CryptoKey'
	| 'DOMException'
	| 'DOMMatrix'
	| 'DOMMatrixReadOnly'
	| 'DOMPoint'
	| 'DOMPointReadOnly'
	| 'DOMQuad'
	| 'DOMRect'
	| 'DOMRectReadOnly'
	| 'FileList'
	| 'FileSystemDirectoryHandle'
	| 'FileSystemFileHandle'
	| 'FileSystemHandle'
	| 'GPUCompilationInfo'
	| 'GPUCompilationMessage'
	| 'ImageBitmap'
	| 'ImageData'
	| 'RTCCertificate'
	| 'VideoFrame'
	>;

type StructuredCloneableCollection =
	| readonly StructuredCloneable[]
	| {readonly [key: string]: StructuredCloneable; readonly [key: number]: StructuredCloneable}
	| ReadonlyMap<StructuredCloneable, StructuredCloneable>
	| ReadonlySet<StructuredCloneable>;

/**
Matches a value that can be losslessly cloned using `structuredClone`.

Note:
- Custom error types will be cloned as the base `Error` type

@see https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm

@example
```
import type {StructuredCloneable} from 'type-fest';

class CustomClass {}

// @ts-expect-error
const error: StructuredCloneable = {
    custom: new CustomClass(),
};

structuredClone(error);
//=> {custom: {}}

const good: StructuredCloneable = {
    number: 3,
    date: new Date(),
    map: new Map<string, number>(),
}

good.map.set('key', 1);

structuredClone(good);
//=> {number: 3, date: Date(2022-10-17 22:22:35.920), map: Map {'key' -> 1}}
```

@category Structured clone
*/
export type StructuredCloneable = StructuredCloneablePrimitive | StructuredCloneableData | StructuredCloneableCollection;
