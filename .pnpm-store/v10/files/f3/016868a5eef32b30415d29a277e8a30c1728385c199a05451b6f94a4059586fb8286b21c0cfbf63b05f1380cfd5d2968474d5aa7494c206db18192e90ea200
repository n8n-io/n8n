import * as Types from '../typebox';
import { ValueError } from '../errors/index';
import { Edit } from './delta';
/** Provides functions to perform structural updates to JavaScript values */
export declare namespace Value {
    /** Casts a value into a given type. The return value will retain as much information of the original value as possible. Cast will convert string, number, boolean and date values if a reasonable conversion is possible. */
    function Cast<T extends Types.TSchema, R extends Types.TSchema[]>(schema: T, references: [...R], value: unknown): Types.Static<T>;
    /** Casts a value into a given type. The return value will retain as much information of the original value as possible. Cast will convert string, number, boolean and date values if a reasonable conversion is possible. */
    function Cast<T extends Types.TSchema>(schema: T, value: unknown): Types.Static<T>;
    /** Creates a value from the given type */
    function Create<T extends Types.TSchema, R extends Types.TSchema[]>(schema: T, references: [...R]): Types.Static<T>;
    /** Creates a value from the given type */
    function Create<T extends Types.TSchema>(schema: T): Types.Static<T>;
    /** Returns true if the value matches the given type. */
    function Check<T extends Types.TSchema, R extends Types.TSchema[]>(schema: T, references: [...R], value: unknown): value is Types.Static<T>;
    /** Returns true if the value matches the given type. */
    function Check<T extends Types.TSchema>(schema: T, value: unknown): value is Types.Static<T>;
    /** Returns a structural clone of the given value */
    function Clone<T>(value: T): T;
    /** Returns an iterator for each error in this value. */
    function Errors<T extends Types.TSchema, R extends Types.TSchema[]>(schema: T, references: [...R], value: unknown): IterableIterator<ValueError>;
    /** Returns an iterator for each error in this value. */
    function Errors<T extends Types.TSchema>(schema: T, value: unknown): IterableIterator<ValueError>;
    /** Returns true if left and right values are structurally equal */
    function Equal<T>(left: T, right: unknown): right is T;
    /** Returns edits to transform the current value into the next value */
    function Diff(current: unknown, next: unknown): Edit[];
    /** Returns a FNV1A-64 non cryptographic hash of the given value */
    function Hash(value: unknown): bigint;
    /** Returns a new value with edits applied to the given value */
    function Patch<T = any>(current: unknown, edits: Edit[]): T;
}
