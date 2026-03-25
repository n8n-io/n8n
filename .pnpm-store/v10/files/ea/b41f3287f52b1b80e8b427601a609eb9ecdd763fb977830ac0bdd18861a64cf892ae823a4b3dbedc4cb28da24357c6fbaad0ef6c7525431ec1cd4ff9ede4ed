import PostgrestTransformBuilder from './PostgrestTransformBuilder';
import { JsonPathToAccessor, JsonPathToType } from './select-query-parser/utils';
import { GenericSchema } from './types';
declare type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in' | 'cs' | 'cd' | 'sl' | 'sr' | 'nxl' | 'nxr' | 'adj' | 'ov' | 'fts' | 'plfts' | 'phfts' | 'wfts';
export declare type IsStringOperator<Path extends string> = Path extends `${string}->>${string}` ? true : false;
declare type ResolveFilterValue<Schema extends GenericSchema, Row extends Record<string, unknown>, ColumnName extends string> = ColumnName extends `${infer RelationshipTable}.${infer Remainder}` ? Remainder extends `${infer _}.${infer _}` ? ResolveFilterValue<Schema, Row, Remainder> : ResolveFilterRelationshipValue<Schema, RelationshipTable, Remainder> : ColumnName extends keyof Row ? Row[ColumnName] : IsStringOperator<ColumnName> extends true ? string : JsonPathToType<Row, JsonPathToAccessor<ColumnName>> extends infer JsonPathValue ? JsonPathValue extends never ? never : JsonPathValue : never;
declare type ResolveFilterRelationshipValue<Schema extends GenericSchema, RelationshipTable extends string, RelationshipColumn extends string> = Schema['Tables'] & Schema['Views'] extends infer TablesAndViews ? RelationshipTable extends keyof TablesAndViews ? 'Row' extends keyof TablesAndViews[RelationshipTable] ? RelationshipColumn extends keyof TablesAndViews[RelationshipTable]['Row'] ? TablesAndViews[RelationshipTable]['Row'][RelationshipColumn] : unknown : unknown : unknown : never;
export default class PostgrestFilterBuilder<Schema extends GenericSchema, Row extends Record<string, unknown>, Result, RelationName = unknown, Relationships = unknown> extends PostgrestTransformBuilder<Schema, Row, Result, RelationName, Relationships> {
    /**
     * Match only rows where `column` is equal to `value`.
     *
     * To check if the value of `column` is NULL, you should use `.is()` instead.
     *
     * @param column - The column to filter on
     * @param value - The value to filter with
     */
    eq<ColumnName extends string>(column: ColumnName, value: ResolveFilterValue<Schema, Row, ColumnName> extends never ? NonNullable<unknown> : ResolveFilterValue<Schema, Row, ColumnName> extends infer ResolvedFilterValue ? NonNullable<ResolvedFilterValue> : never): this;
    /**
     * Match only rows where `column` is not equal to `value`.
     *
     * @param column - The column to filter on
     * @param value - The value to filter with
     */
    neq<ColumnName extends string>(column: ColumnName, value: ResolveFilterValue<Schema, Row, ColumnName> extends never ? unknown : ResolveFilterValue<Schema, Row, ColumnName> extends infer ResolvedFilterValue ? ResolvedFilterValue : never): this;
    gt<ColumnName extends string & keyof Row>(column: ColumnName, value: Row[ColumnName]): this;
    gt(column: string, value: unknown): this;
    gte<ColumnName extends string & keyof Row>(column: ColumnName, value: Row[ColumnName]): this;
    gte(column: string, value: unknown): this;
    lt<ColumnName extends string & keyof Row>(column: ColumnName, value: Row[ColumnName]): this;
    lt(column: string, value: unknown): this;
    lte<ColumnName extends string & keyof Row>(column: ColumnName, value: Row[ColumnName]): this;
    lte(column: string, value: unknown): this;
    like<ColumnName extends string & keyof Row>(column: ColumnName, pattern: string): this;
    like(column: string, pattern: string): this;
    likeAllOf<ColumnName extends string & keyof Row>(column: ColumnName, patterns: readonly string[]): this;
    likeAllOf(column: string, patterns: readonly string[]): this;
    likeAnyOf<ColumnName extends string & keyof Row>(column: ColumnName, patterns: readonly string[]): this;
    likeAnyOf(column: string, patterns: readonly string[]): this;
    ilike<ColumnName extends string & keyof Row>(column: ColumnName, pattern: string): this;
    ilike(column: string, pattern: string): this;
    ilikeAllOf<ColumnName extends string & keyof Row>(column: ColumnName, patterns: readonly string[]): this;
    ilikeAllOf(column: string, patterns: readonly string[]): this;
    ilikeAnyOf<ColumnName extends string & keyof Row>(column: ColumnName, patterns: readonly string[]): this;
    ilikeAnyOf(column: string, patterns: readonly string[]): this;
    is<ColumnName extends string & keyof Row>(column: ColumnName, value: Row[ColumnName] & (boolean | null)): this;
    is(column: string, value: boolean | null): this;
    /**
     * Match only rows where `column` is included in the `values` array.
     *
     * @param column - The column to filter on
     * @param values - The values array to filter with
     */
    in<ColumnName extends string>(column: ColumnName, values: ReadonlyArray<ResolveFilterValue<Schema, Row, ColumnName> extends never ? unknown : ResolveFilterValue<Schema, Row, ColumnName> extends infer ResolvedFilterValue ? ResolvedFilterValue : never>): this;
    contains<ColumnName extends string & keyof Row>(column: ColumnName, value: string | ReadonlyArray<Row[ColumnName]> | Record<string, unknown>): this;
    contains(column: string, value: string | readonly unknown[] | Record<string, unknown>): this;
    containedBy<ColumnName extends string & keyof Row>(column: ColumnName, value: string | ReadonlyArray<Row[ColumnName]> | Record<string, unknown>): this;
    containedBy(column: string, value: string | readonly unknown[] | Record<string, unknown>): this;
    rangeGt<ColumnName extends string & keyof Row>(column: ColumnName, range: string): this;
    rangeGt(column: string, range: string): this;
    rangeGte<ColumnName extends string & keyof Row>(column: ColumnName, range: string): this;
    rangeGte(column: string, range: string): this;
    rangeLt<ColumnName extends string & keyof Row>(column: ColumnName, range: string): this;
    rangeLt(column: string, range: string): this;
    rangeLte<ColumnName extends string & keyof Row>(column: ColumnName, range: string): this;
    rangeLte(column: string, range: string): this;
    rangeAdjacent<ColumnName extends string & keyof Row>(column: ColumnName, range: string): this;
    rangeAdjacent(column: string, range: string): this;
    overlaps<ColumnName extends string & keyof Row>(column: ColumnName, value: string | ReadonlyArray<Row[ColumnName]>): this;
    overlaps(column: string, value: string | readonly unknown[]): this;
    textSearch<ColumnName extends string & keyof Row>(column: ColumnName, query: string, options?: {
        config?: string;
        type?: 'plain' | 'phrase' | 'websearch';
    }): this;
    textSearch(column: string, query: string, options?: {
        config?: string;
        type?: 'plain' | 'phrase' | 'websearch';
    }): this;
    match<ColumnName extends string & keyof Row>(query: Record<ColumnName, Row[ColumnName]>): this;
    match(query: Record<string, unknown>): this;
    not<ColumnName extends string & keyof Row>(column: ColumnName, operator: FilterOperator, value: Row[ColumnName]): this;
    not(column: string, operator: string, value: unknown): this;
    /**
     * Match only rows which satisfy at least one of the filters.
     *
     * Unlike most filters, `filters` is used as-is and needs to follow [PostgREST
     * syntax](https://postgrest.org/en/stable/api.html#operators). You also need
     * to make sure it's properly sanitized.
     *
     * It's currently not possible to do an `.or()` filter across multiple tables.
     *
     * @param filters - The filters to use, following PostgREST syntax
     * @param options - Named parameters
     * @param options.referencedTable - Set this to filter on referenced tables
     * instead of the parent table
     * @param options.foreignTable - Deprecated, use `referencedTable` instead
     */
    or(filters: string, { foreignTable, referencedTable, }?: {
        foreignTable?: string;
        referencedTable?: string;
    }): this;
    filter<ColumnName extends string & keyof Row>(column: ColumnName, operator: `${'' | 'not.'}${FilterOperator}`, value: unknown): this;
    filter(column: string, operator: string, value: unknown): this;
}
export {};
//# sourceMappingURL=PostgrestFilterBuilder.d.ts.map