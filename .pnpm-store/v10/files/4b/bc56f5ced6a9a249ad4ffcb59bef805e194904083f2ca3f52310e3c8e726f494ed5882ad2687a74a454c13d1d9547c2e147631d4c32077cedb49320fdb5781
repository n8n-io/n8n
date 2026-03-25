/**
Merges "own" properties from a source to a destination object, including non-enumerable and accessor-defined properties. It retains original values and descriptors, ensuring the destination receives a complete and accurate copy of the source's properties.

@param destination - The object to receive properties.
@param source - The object providing properties.
@param overwrite - Optional boolean to control overwriting of existing properties. Defaults to true.
@returns The modified destination object.
*/
declare function mergeDescriptors<T, U>(destination: T, source: U, overwrite?: boolean): T & U;

export = mergeDescriptors;
