# typedarray-dts

Type definitions for JavaScript typed arrays.

There are 9 typed array types in JavaScript:

- Int8Array
- Int16Array
- Int32Array
- Uint8Array
- Uint16Array
- Uint32Array
- Uint8ClampedArray
- Float32Array
- Float64Array

It is not unusual to require a variable that is of a `TypedArray` type. However,
the JavaScript standard library type definitions do not include an abstract
`TypedArray` type. This package implements one.

## Usage

This package does not implement functionality, only type definitions.

```ts
import { TypedArray } from "typedarray-dts";

function doSomething(x: TypedArray): void {
    // IntelliSense now knows `x` is a `TypedArray`!
}
```

There are two other types provided by this package: `SignedTypedArray` and
`UnsignedTypedArray`:

```ts
import { SignedTypedArray, UnsignedTypedArray } from "typedarray-dts";

function doSomethingSigned(x: SignedTypedArray): void {
    // `x` is a signed `TypedArray`!
}

function doSomethingUnsigned(x: UnsignedTypedArray): void {
    // `x` is an unsigned `TypedArray`!
}
```

## License

Refer to the `LICENSE` file for license information.
