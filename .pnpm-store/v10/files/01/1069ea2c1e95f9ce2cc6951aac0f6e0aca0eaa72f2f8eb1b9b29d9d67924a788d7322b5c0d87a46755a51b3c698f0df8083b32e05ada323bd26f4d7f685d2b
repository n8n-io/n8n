export declare const FIRST_KEY_INDEX = 1;
export type BitFieldEncoding = `${'i' | 'u'}${number}`;
export interface BitFieldOperation<S extends string> {
    operation: S;
}
export interface BitFieldGetOperation extends BitFieldOperation<'GET'> {
    encoding: BitFieldEncoding;
    offset: number | string;
}
interface BitFieldSetOperation extends BitFieldOperation<'SET'> {
    encoding: BitFieldEncoding;
    offset: number | string;
    value: number;
}
interface BitFieldIncrByOperation extends BitFieldOperation<'INCRBY'> {
    encoding: BitFieldEncoding;
    offset: number | string;
    increment: number;
}
interface BitFieldOverflowOperation extends BitFieldOperation<'OVERFLOW'> {
    behavior: string;
}
type BitFieldOperations = Array<BitFieldGetOperation | BitFieldSetOperation | BitFieldIncrByOperation | BitFieldOverflowOperation>;
export declare function transformArguments(key: string, operations: BitFieldOperations): Array<string>;
export declare function transformReply(): Array<number | null>;
export {};
