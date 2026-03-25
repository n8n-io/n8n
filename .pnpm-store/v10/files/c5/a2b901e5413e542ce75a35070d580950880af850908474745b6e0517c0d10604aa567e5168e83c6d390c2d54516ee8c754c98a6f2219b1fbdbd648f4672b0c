import PostgrestBuilder from './PostgrestBuilder';
import { GetResult } from './select-query-parser/result';
import { GenericSchema, CheckMatchingArrayTypes } from './types';
export default class PostgrestTransformBuilder<Schema extends GenericSchema, Row extends Record<string, unknown>, Result, RelationName = unknown, Relationships = unknown> extends PostgrestBuilder<Result> {
    /**
     * Perform a SELECT on the query result.
     *
     * By default, `.insert()`, `.update()`, `.upsert()`, and `.delete()` do not
     * return modified rows. By calling this method, modified rows are returned in
     * `data`.
     *
     * @param columns - The columns to retrieve, separated by commas
     */
    select<Query extends string = '*', NewResultOne = GetResult<Schema, Row, RelationName, Relationships, Query>>(columns?: Query): PostgrestTransformBuilder<Schema, Row, NewResultOne[], RelationName, Relationships>;
    order<ColumnName extends string & keyof Row>(column: ColumnName, options?: {
        ascending?: boolean;
        nullsFirst?: boolean;
        referencedTable?: undefined;
    }): this;
    order(column: string, options?: {
        ascending?: boolean;
        nullsFirst?: boolean;
        referencedTable?: string;
    }): this;
    /**
     * @deprecated Use `options.referencedTable` instead of `options.foreignTable`
     */
    order<ColumnName extends string & keyof Row>(column: ColumnName, options?: {
        ascending?: boolean;
        nullsFirst?: boolean;
        foreignTable?: undefined;
    }): this;
    /**
     * @deprecated Use `options.referencedTable` instead of `options.foreignTable`
     */
    order(column: string, options?: {
        ascending?: boolean;
        nullsFirst?: boolean;
        foreignTable?: string;
    }): this;
    /**
     * Limit the query result by `count`.
     *
     * @param count - The maximum number of rows to return
     * @param options - Named parameters
     * @param options.referencedTable - Set this to limit rows of referenced
     * tables instead of the parent table
     * @param options.foreignTable - Deprecated, use `options.referencedTable`
     * instead
     */
    limit(count: number, { foreignTable, referencedTable, }?: {
        foreignTable?: string;
        referencedTable?: string;
    }): this;
    /**
     * Limit the query result by starting at an offset `from` and ending at the offset `to`.
     * Only records within this range are returned.
     * This respects the query order and if there is no order clause the range could behave unexpectedly.
     * The `from` and `to` values are 0-based and inclusive: `range(1, 3)` will include the second, third
     * and fourth rows of the query.
     *
     * @param from - The starting index from which to limit the result
     * @param to - The last index to which to limit the result
     * @param options - Named parameters
     * @param options.referencedTable - Set this to limit rows of referenced
     * tables instead of the parent table
     * @param options.foreignTable - Deprecated, use `options.referencedTable`
     * instead
     */
    range(from: number, to: number, { foreignTable, referencedTable, }?: {
        foreignTable?: string;
        referencedTable?: string;
    }): this;
    /**
     * Set the AbortSignal for the fetch request.
     *
     * @param signal - The AbortSignal to use for the fetch request
     */
    abortSignal(signal: AbortSignal): this;
    /**
     * Return `data` as a single object instead of an array of objects.
     *
     * Query result must be one row (e.g. using `.limit(1)`), otherwise this
     * returns an error.
     */
    single<ResultOne = Result extends (infer ResultOne)[] ? ResultOne : never>(): PostgrestBuilder<ResultOne>;
    /**
     * Return `data` as a single object instead of an array of objects.
     *
     * Query result must be zero or one row (e.g. using `.limit(1)`), otherwise
     * this returns an error.
     */
    maybeSingle<ResultOne = Result extends (infer ResultOne)[] ? ResultOne : never>(): PostgrestBuilder<ResultOne | null>;
    /**
     * Return `data` as a string in CSV format.
     */
    csv(): PostgrestBuilder<string>;
    /**
     * Return `data` as an object in [GeoJSON](https://geojson.org) format.
     */
    geojson(): PostgrestBuilder<Record<string, unknown>>;
    /**
     * Return `data` as the EXPLAIN plan for the query.
     *
     * You need to enable the
     * [db_plan_enabled](https://supabase.com/docs/guides/database/debugging-performance#enabling-explain)
     * setting before using this method.
     *
     * @param options - Named parameters
     *
     * @param options.analyze - If `true`, the query will be executed and the
     * actual run time will be returned
     *
     * @param options.verbose - If `true`, the query identifier will be returned
     * and `data` will include the output columns of the query
     *
     * @param options.settings - If `true`, include information on configuration
     * parameters that affect query planning
     *
     * @param options.buffers - If `true`, include information on buffer usage
     *
     * @param options.wal - If `true`, include information on WAL record generation
     *
     * @param options.format - The format of the output, can be `"text"` (default)
     * or `"json"`
     */
    explain({ analyze, verbose, settings, buffers, wal, format, }?: {
        analyze?: boolean;
        verbose?: boolean;
        settings?: boolean;
        buffers?: boolean;
        wal?: boolean;
        format?: 'json' | 'text';
    }): PostgrestBuilder<Record<string, unknown>[]> | PostgrestBuilder<string>;
    /**
     * Rollback the query.
     *
     * `data` will still be returned, but the query is not committed.
     */
    rollback(): this;
    /**
     * Override the type of the returned `data`.
     *
     * @typeParam NewResult - The new result type to override with
     * @deprecated Use overrideTypes<yourType, { merge: false }>() method at the end of your call chain instead
     */
    returns<NewResult>(): PostgrestTransformBuilder<Schema, Row, CheckMatchingArrayTypes<Result, NewResult>, RelationName, Relationships>;
}
//# sourceMappingURL=PostgrestTransformBuilder.d.ts.map