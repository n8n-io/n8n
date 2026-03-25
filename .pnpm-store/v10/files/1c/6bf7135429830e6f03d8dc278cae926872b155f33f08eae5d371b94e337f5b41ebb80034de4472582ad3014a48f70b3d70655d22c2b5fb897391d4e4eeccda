import type { GenericRelationship, GenericSchema, GenericTable, Prettify } from '../types';
export type { GenericRelationship, GenericSchema, GenericTable, Prettify };
export declare type AggregateWithoutColumnFunctions = 'count';
export declare type AggregateWithColumnFunctions = 'sum' | 'avg' | 'min' | 'max' | AggregateWithoutColumnFunctions;
export declare type AggregateFunctions = AggregateWithColumnFunctions;
export declare type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
declare type PostgresSQLNumberTypes = 'int2' | 'int4' | 'int8' | 'float4' | 'float8' | 'numeric';
declare type PostgresSQLStringTypes = 'bytea' | 'bpchar' | 'varchar' | 'date' | 'text' | 'citext' | 'time' | 'timetz' | 'timestamp' | 'timestamptz' | 'uuid' | 'vector';
declare type SingleValuePostgreSQLTypes = PostgresSQLNumberTypes | PostgresSQLStringTypes | 'bool' | 'json' | 'jsonb' | 'void' | 'record' | string;
declare type ArrayPostgreSQLTypes = `_${SingleValuePostgreSQLTypes}`;
declare type TypeScriptSingleValueTypes<T extends SingleValuePostgreSQLTypes> = T extends 'bool' ? boolean : T extends PostgresSQLNumberTypes ? number : T extends PostgresSQLStringTypes ? string : T extends 'json' | 'jsonb' ? Json : T extends 'void' ? undefined : T extends 'record' ? Record<string, unknown> : unknown;
declare type StripUnderscore<T extends string> = T extends `_${infer U}` ? U : T;
export declare type PostgreSQLTypes = SingleValuePostgreSQLTypes | ArrayPostgreSQLTypes;
export declare type TypeScriptTypes<T extends PostgreSQLTypes> = T extends ArrayPostgreSQLTypes ? TypeScriptSingleValueTypes<StripUnderscore<Extract<T, SingleValuePostgreSQLTypes>>>[] : TypeScriptSingleValueTypes<T>;
export declare type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
export declare type LastOf<T> = UnionToIntersection<T extends any ? () => T : never> extends () => infer R ? R : never;
export declare type Push<T extends any[], V> = [...T, V];
export declare type UnionToTuple<T, L = LastOf<T>, N = [T] extends [never] ? true : false> = N extends true ? [] : Push<UnionToTuple<Exclude<T, L>>, L>;
export declare type UnionToArray<T> = UnionToTuple<T>;
export declare type ExtractFirstProperty<T> = T extends {
    [K in keyof T]: infer U;
} ? U : never;
export declare type ContainsNull<T> = null extends T ? true : false;
export declare type IsNonEmptyArray<T> = Exclude<T, undefined> extends readonly [unknown, ...unknown[]] ? true : false;
export declare type TablesAndViews<Schema extends GenericSchema> = Schema['Tables'] & Exclude<Schema['Views'], ''>;
export declare type GetTableRelationships<Schema extends GenericSchema, Tname extends string> = TablesAndViews<Schema>[Tname] extends {
    Relationships: infer R;
} ? R : false;
//# sourceMappingURL=types.d.ts.map