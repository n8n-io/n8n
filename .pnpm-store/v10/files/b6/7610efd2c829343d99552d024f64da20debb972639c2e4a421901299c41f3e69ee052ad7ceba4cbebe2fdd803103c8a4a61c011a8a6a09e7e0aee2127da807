import PostgrestFilterBuilder from './PostgrestFilterBuilder';
import { GetResult } from './select-query-parser/result';
import { Fetch, GenericSchema, GenericTable, GenericView } from './types';
export default class PostgrestQueryBuilder<Schema extends GenericSchema, Relation extends GenericTable | GenericView, RelationName = unknown, Relationships = Relation extends {
    Relationships: infer R;
} ? R : unknown> {
    url: URL;
    headers: Record<string, string>;
    schema?: string;
    signal?: AbortSignal;
    fetch?: Fetch;
    constructor(url: URL, { headers, schema, fetch, }: {
        headers?: Record<string, string>;
        schema?: string;
        fetch?: Fetch;
    });
    /**
     * Perform a SELECT query on the table or view.
     *
     * @param columns - The columns to retrieve, separated by commas. Columns can be renamed when returned with `customName:columnName`
     *
     * @param options - Named parameters
     *
     * @param options.head - When set to `true`, `data` will not be returned.
     * Useful if you only need the count.
     *
     * @param options.count - Count algorithm to use to count rows in the table or view.
     *
     * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
     * hood.
     *
     * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
     * statistics under the hood.
     *
     * `"estimated"`: Uses exact count for low numbers and planned count for high
     * numbers.
     */
    select<Query extends string = '*', ResultOne = GetResult<Schema, Relation['Row'], RelationName, Relationships, Query>>(columns?: Query, { head, count, }?: {
        head?: boolean;
        count?: 'exact' | 'planned' | 'estimated';
    }): PostgrestFilterBuilder<Schema, Relation['Row'], ResultOne[], RelationName, Relationships>;
    insert<Row extends Relation extends {
        Insert: unknown;
    } ? Relation['Insert'] : never>(values: Row, options?: {
        count?: 'exact' | 'planned' | 'estimated';
    }): PostgrestFilterBuilder<Schema, Relation['Row'], null, RelationName, Relationships>;
    insert<Row extends Relation extends {
        Insert: unknown;
    } ? Relation['Insert'] : never>(values: Row[], options?: {
        count?: 'exact' | 'planned' | 'estimated';
        defaultToNull?: boolean;
    }): PostgrestFilterBuilder<Schema, Relation['Row'], null, RelationName, Relationships>;
    upsert<Row extends Relation extends {
        Insert: unknown;
    } ? Relation['Insert'] : never>(values: Row, options?: {
        onConflict?: string;
        ignoreDuplicates?: boolean;
        count?: 'exact' | 'planned' | 'estimated';
    }): PostgrestFilterBuilder<Schema, Relation['Row'], null, RelationName, Relationships>;
    upsert<Row extends Relation extends {
        Insert: unknown;
    } ? Relation['Insert'] : never>(values: Row[], options?: {
        onConflict?: string;
        ignoreDuplicates?: boolean;
        count?: 'exact' | 'planned' | 'estimated';
        defaultToNull?: boolean;
    }): PostgrestFilterBuilder<Schema, Relation['Row'], null, RelationName, Relationships>;
    /**
     * Perform an UPDATE on the table or view.
     *
     * By default, updated rows are not returned. To return it, chain the call
     * with `.select()` after filters.
     *
     * @param values - The values to update with
     *
     * @param options - Named parameters
     *
     * @param options.count - Count algorithm to use to count updated rows.
     *
     * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
     * hood.
     *
     * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
     * statistics under the hood.
     *
     * `"estimated"`: Uses exact count for low numbers and planned count for high
     * numbers.
     */
    update<Row extends Relation extends {
        Update: unknown;
    } ? Relation['Update'] : never>(values: Row, { count, }?: {
        count?: 'exact' | 'planned' | 'estimated';
    }): PostgrestFilterBuilder<Schema, Relation['Row'], null, RelationName, Relationships>;
    /**
     * Perform a DELETE on the table or view.
     *
     * By default, deleted rows are not returned. To return it, chain the call
     * with `.select()` after filters.
     *
     * @param options - Named parameters
     *
     * @param options.count - Count algorithm to use to count deleted rows.
     *
     * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
     * hood.
     *
     * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
     * statistics under the hood.
     *
     * `"estimated"`: Uses exact count for low numbers and planned count for high
     * numbers.
     */
    delete({ count, }?: {
        count?: 'exact' | 'planned' | 'estimated';
    }): PostgrestFilterBuilder<Schema, Relation['Row'], null, RelationName, Relationships>;
}
//# sourceMappingURL=PostgrestQueryBuilder.d.ts.map