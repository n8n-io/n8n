import type { GenericRelationship, GenericSchema, GenericTable, Prettify } from '../types'

export type { GenericRelationship, GenericSchema, GenericTable, Prettify }

export type AggregateWithoutColumnFunctions = 'count'

export type AggregateWithColumnFunctions =
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | AggregateWithoutColumnFunctions

export type AggregateFunctions = AggregateWithColumnFunctions

export type Json =
  | string
  | number
  | boolean
  | null
  | {
      [key: string]: Json | undefined
    }
  | Json[]

type PostgresSQLNumberTypes = 'int2' | 'int4' | 'int8' | 'float4' | 'float8' | 'numeric'

type PostgresSQLStringTypes =
  | 'bytea'
  | 'bpchar'
  | 'varchar'
  | 'date'
  | 'text'
  | 'citext'
  | 'time'
  | 'timetz'
  | 'timestamp'
  | 'timestamptz'
  | 'uuid'
  | 'vector'

type SingleValuePostgreSQLTypes =
  | PostgresSQLNumberTypes
  | PostgresSQLStringTypes
  | 'bool'
  | 'json'
  | 'jsonb'
  | 'void'
  | 'record'
  | string

type ArrayPostgreSQLTypes = `_${SingleValuePostgreSQLTypes}`

type TypeScriptSingleValueTypes<T extends SingleValuePostgreSQLTypes> = T extends 'bool'
  ? boolean
  : T extends PostgresSQLNumberTypes
  ? number
  : T extends PostgresSQLStringTypes
  ? string
  : T extends 'json' | 'jsonb'
  ? Json
  : T extends 'void'
  ? undefined
  : T extends 'record'
  ? Record<string, unknown>
  : unknown

type StripUnderscore<T extends string> = T extends `_${infer U}` ? U : T

// Represents all possible PostgreSQL types, including array types, allow for custom types with 'string' in union
export type PostgreSQLTypes = SingleValuePostgreSQLTypes | ArrayPostgreSQLTypes

// Helper type to convert PostgreSQL types to their TypeScript equivalents
export type TypeScriptTypes<T extends PostgreSQLTypes> = T extends ArrayPostgreSQLTypes
  ? TypeScriptSingleValueTypes<StripUnderscore<Extract<T, SingleValuePostgreSQLTypes>>>[]
  : TypeScriptSingleValueTypes<T>

// Utility types for working with unions
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never

export type LastOf<T> = UnionToIntersection<T extends any ? () => T : never> extends () => infer R
  ? R
  : never

export type Push<T extends any[], V> = [...T, V]

// Converts a union type to a tuple type
export type UnionToTuple<T, L = LastOf<T>, N = [T] extends [never] ? true : false> = N extends true
  ? []
  : Push<UnionToTuple<Exclude<T, L>>, L>

export type UnionToArray<T> = UnionToTuple<T>

// Extracts the type of the first property in an object type
export type ExtractFirstProperty<T> = T extends { [K in keyof T]: infer U } ? U : never

// Type predicates
export type ContainsNull<T> = null extends T ? true : false

export type IsNonEmptyArray<T> = Exclude<T, undefined> extends readonly [unknown, ...unknown[]]
  ? true
  : false

// Types for working with database schemas
export type TablesAndViews<Schema extends GenericSchema> = Schema['Tables'] &
  Exclude<Schema['Views'], ''>

export type GetTableRelationships<
  Schema extends GenericSchema,
  Tname extends string
> = TablesAndViews<Schema>[Tname] extends { Relationships: infer R } ? R : false
