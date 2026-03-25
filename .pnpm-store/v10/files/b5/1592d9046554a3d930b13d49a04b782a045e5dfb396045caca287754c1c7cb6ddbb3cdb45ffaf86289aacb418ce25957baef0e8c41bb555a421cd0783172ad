import { BitFieldGetOperation } from './BITFIELD';
export declare const FIRST_KEY_INDEX = 1;
export declare const IS_READ_ONLY = true;
type BitFieldRoOperations = Array<Omit<BitFieldGetOperation, 'operation'> & Partial<Pick<BitFieldGetOperation, 'operation'>>>;
export declare function transformArguments(key: string, operations: BitFieldRoOperations): Array<string>;
export declare function transformReply(): Array<number | null>;
export {};
