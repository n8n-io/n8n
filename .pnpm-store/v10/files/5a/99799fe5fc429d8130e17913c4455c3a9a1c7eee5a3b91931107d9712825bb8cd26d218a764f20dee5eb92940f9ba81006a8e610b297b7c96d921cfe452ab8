import PostgrestTransformBuilder from './PostgrestTransformBuilder'
import { JsonPathToAccessor, JsonPathToType } from './select-query-parser/utils'
import { GenericSchema } from './types'

type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'ilike'
  | 'is'
  | 'in'
  | 'cs'
  | 'cd'
  | 'sl'
  | 'sr'
  | 'nxl'
  | 'nxr'
  | 'adj'
  | 'ov'
  | 'fts'
  | 'plfts'
  | 'phfts'
  | 'wfts'

export type IsStringOperator<Path extends string> = Path extends `${string}->>${string}`
  ? true
  : false

// Match relationship filters with `table.column` syntax and resolve underlying
// column value. If not matched, fallback to generic type.
// TODO: Validate the relationship itself ala select-query-parser. Currently we
// assume that all tables have valid relationships to each other, despite
// nonexistent foreign keys.
type ResolveFilterValue<
  Schema extends GenericSchema,
  Row extends Record<string, unknown>,
  ColumnName extends string
> = ColumnName extends `${infer RelationshipTable}.${infer Remainder}`
  ? Remainder extends `${infer _}.${infer _}`
    ? ResolveFilterValue<Schema, Row, Remainder>
    : ResolveFilterRelationshipValue<Schema, RelationshipTable, Remainder>
  : ColumnName extends keyof Row
  ? Row[ColumnName]
  : // If the column selection is a jsonpath like `data->value` or `data->>value` we attempt to match
  // the expected type with the parsed custom json type
  IsStringOperator<ColumnName> extends true
  ? string
  : JsonPathToType<Row, JsonPathToAccessor<ColumnName>> extends infer JsonPathValue
  ? JsonPathValue extends never
    ? never
    : JsonPathValue
  : never

type ResolveFilterRelationshipValue<
  Schema extends GenericSchema,
  RelationshipTable extends string,
  RelationshipColumn extends string
> = Schema['Tables'] & Schema['Views'] extends infer TablesAndViews
  ? RelationshipTable extends keyof TablesAndViews
    ? 'Row' extends keyof TablesAndViews[RelationshipTable]
      ? RelationshipColumn extends keyof TablesAndViews[RelationshipTable]['Row']
        ? TablesAndViews[RelationshipTable]['Row'][RelationshipColumn]
        : unknown
      : unknown
    : unknown
  : never

export default class PostgrestFilterBuilder<
  Schema extends GenericSchema,
  Row extends Record<string, unknown>,
  Result,
  RelationName = unknown,
  Relationships = unknown
> extends PostgrestTransformBuilder<Schema, Row, Result, RelationName, Relationships> {
  /**
   * Match only rows where `column` is equal to `value`.
   *
   * To check if the value of `column` is NULL, you should use `.is()` instead.
   *
   * @param column - The column to filter on
   * @param value - The value to filter with
   */
  eq<ColumnName extends string>(
    column: ColumnName,
    value: ResolveFilterValue<Schema, Row, ColumnName> extends never
      ? NonNullable<unknown>
      : // We want to infer the type before wrapping it into a `NonNullable` to avoid too deep
      // type resolution error
      ResolveFilterValue<Schema, Row, ColumnName> extends infer ResolvedFilterValue
      ? NonNullable<ResolvedFilterValue>
      : // We should never enter this case as all the branches are covered above
        never
  ): this {
    this.url.searchParams.append(column, `eq.${value}`)
    return this
  }

  /**
   * Match only rows where `column` is not equal to `value`.
   *
   * @param column - The column to filter on
   * @param value - The value to filter with
   */
  neq<ColumnName extends string>(
    column: ColumnName,
    value: ResolveFilterValue<Schema, Row, ColumnName> extends never
      ? unknown
      : ResolveFilterValue<Schema, Row, ColumnName> extends infer ResolvedFilterValue
      ? ResolvedFilterValue
      : never
  ): this {
    this.url.searchParams.append(column, `neq.${value}`)
    return this
  }

  gt<ColumnName extends string & keyof Row>(column: ColumnName, value: Row[ColumnName]): this
  gt(column: string, value: unknown): this
  /**
   * Match only rows where `column` is greater than `value`.
   *
   * @param column - The column to filter on
   * @param value - The value to filter with
   */
  gt(column: string, value: unknown): this {
    this.url.searchParams.append(column, `gt.${value}`)
    return this
  }

  gte<ColumnName extends string & keyof Row>(column: ColumnName, value: Row[ColumnName]): this
  gte(column: string, value: unknown): this
  /**
   * Match only rows where `column` is greater than or equal to `value`.
   *
   * @param column - The column to filter on
   * @param value - The value to filter with
   */
  gte(column: string, value: unknown): this {
    this.url.searchParams.append(column, `gte.${value}`)
    return this
  }

  lt<ColumnName extends string & keyof Row>(column: ColumnName, value: Row[ColumnName]): this
  lt(column: string, value: unknown): this
  /**
   * Match only rows where `column` is less than `value`.
   *
   * @param column - The column to filter on
   * @param value - The value to filter with
   */
  lt(column: string, value: unknown): this {
    this.url.searchParams.append(column, `lt.${value}`)
    return this
  }

  lte<ColumnName extends string & keyof Row>(column: ColumnName, value: Row[ColumnName]): this
  lte(column: string, value: unknown): this
  /**
   * Match only rows where `column` is less than or equal to `value`.
   *
   * @param column - The column to filter on
   * @param value - The value to filter with
   */
  lte(column: string, value: unknown): this {
    this.url.searchParams.append(column, `lte.${value}`)
    return this
  }

  like<ColumnName extends string & keyof Row>(column: ColumnName, pattern: string): this
  like(column: string, pattern: string): this
  /**
   * Match only rows where `column` matches `pattern` case-sensitively.
   *
   * @param column - The column to filter on
   * @param pattern - The pattern to match with
   */
  like(column: string, pattern: string): this {
    this.url.searchParams.append(column, `like.${pattern}`)
    return this
  }

  likeAllOf<ColumnName extends string & keyof Row>(
    column: ColumnName,
    patterns: readonly string[]
  ): this
  likeAllOf(column: string, patterns: readonly string[]): this
  /**
   * Match only rows where `column` matches all of `patterns` case-sensitively.
   *
   * @param column - The column to filter on
   * @param patterns - The patterns to match with
   */
  likeAllOf(column: string, patterns: readonly string[]): this {
    this.url.searchParams.append(column, `like(all).{${patterns.join(',')}}`)
    return this
  }

  likeAnyOf<ColumnName extends string & keyof Row>(
    column: ColumnName,
    patterns: readonly string[]
  ): this
  likeAnyOf(column: string, patterns: readonly string[]): this
  /**
   * Match only rows where `column` matches any of `patterns` case-sensitively.
   *
   * @param column - The column to filter on
   * @param patterns - The patterns to match with
   */
  likeAnyOf(column: string, patterns: readonly string[]): this {
    this.url.searchParams.append(column, `like(any).{${patterns.join(',')}}`)
    return this
  }

  ilike<ColumnName extends string & keyof Row>(column: ColumnName, pattern: string): this
  ilike(column: string, pattern: string): this
  /**
   * Match only rows where `column` matches `pattern` case-insensitively.
   *
   * @param column - The column to filter on
   * @param pattern - The pattern to match with
   */
  ilike(column: string, pattern: string): this {
    this.url.searchParams.append(column, `ilike.${pattern}`)
    return this
  }

  ilikeAllOf<ColumnName extends string & keyof Row>(
    column: ColumnName,
    patterns: readonly string[]
  ): this
  ilikeAllOf(column: string, patterns: readonly string[]): this
  /**
   * Match only rows where `column` matches all of `patterns` case-insensitively.
   *
   * @param column - The column to filter on
   * @param patterns - The patterns to match with
   */
  ilikeAllOf(column: string, patterns: readonly string[]): this {
    this.url.searchParams.append(column, `ilike(all).{${patterns.join(',')}}`)
    return this
  }

  ilikeAnyOf<ColumnName extends string & keyof Row>(
    column: ColumnName,
    patterns: readonly string[]
  ): this
  ilikeAnyOf(column: string, patterns: readonly string[]): this
  /**
   * Match only rows where `column` matches any of `patterns` case-insensitively.
   *
   * @param column - The column to filter on
   * @param patterns - The patterns to match with
   */
  ilikeAnyOf(column: string, patterns: readonly string[]): this {
    this.url.searchParams.append(column, `ilike(any).{${patterns.join(',')}}`)
    return this
  }

  is<ColumnName extends string & keyof Row>(
    column: ColumnName,
    value: Row[ColumnName] & (boolean | null)
  ): this
  is(column: string, value: boolean | null): this
  /**
   * Match only rows where `column` IS `value`.
   *
   * For non-boolean columns, this is only relevant for checking if the value of
   * `column` is NULL by setting `value` to `null`.
   *
   * For boolean columns, you can also set `value` to `true` or `false` and it
   * will behave the same way as `.eq()`.
   *
   * @param column - The column to filter on
   * @param value - The value to filter with
   */
  is(column: string, value: boolean | null): this {
    this.url.searchParams.append(column, `is.${value}`)
    return this
  }

  /**
   * Match only rows where `column` is included in the `values` array.
   *
   * @param column - The column to filter on
   * @param values - The values array to filter with
   */
  in<ColumnName extends string>(
    column: ColumnName,
    values: ReadonlyArray<
      ResolveFilterValue<Schema, Row, ColumnName> extends never
        ? unknown
        : // We want to infer the type before wrapping it into a `NonNullable` to avoid too deep
        // type resolution error
        ResolveFilterValue<Schema, Row, ColumnName> extends infer ResolvedFilterValue
        ? ResolvedFilterValue
        : // We should never enter this case as all the branches are covered above
          never
    >
  ): this {
    const cleanedValues = Array.from(new Set(values))
      .map((s) => {
        // handle postgrest reserved characters
        // https://postgrest.org/en/v7.0.0/api.html#reserved-characters
        if (typeof s === 'string' && new RegExp('[,()]').test(s)) return `"${s}"`
        else return `${s}`
      })
      .join(',')
    this.url.searchParams.append(column, `in.(${cleanedValues})`)
    return this
  }

  contains<ColumnName extends string & keyof Row>(
    column: ColumnName,
    value: string | ReadonlyArray<Row[ColumnName]> | Record<string, unknown>
  ): this
  contains(column: string, value: string | readonly unknown[] | Record<string, unknown>): this
  /**
   * Only relevant for jsonb, array, and range columns. Match only rows where
   * `column` contains every element appearing in `value`.
   *
   * @param column - The jsonb, array, or range column to filter on
   * @param value - The jsonb, array, or range value to filter with
   */
  contains(column: string, value: string | readonly unknown[] | Record<string, unknown>): this {
    if (typeof value === 'string') {
      // range types can be inclusive '[', ']' or exclusive '(', ')' so just
      // keep it simple and accept a string
      this.url.searchParams.append(column, `cs.${value}`)
    } else if (Array.isArray(value)) {
      // array
      this.url.searchParams.append(column, `cs.{${value.join(',')}}`)
    } else {
      // json
      this.url.searchParams.append(column, `cs.${JSON.stringify(value)}`)
    }
    return this
  }

  containedBy<ColumnName extends string & keyof Row>(
    column: ColumnName,
    value: string | ReadonlyArray<Row[ColumnName]> | Record<string, unknown>
  ): this
  containedBy(column: string, value: string | readonly unknown[] | Record<string, unknown>): this
  /**
   * Only relevant for jsonb, array, and range columns. Match only rows where
   * every element appearing in `column` is contained by `value`.
   *
   * @param column - The jsonb, array, or range column to filter on
   * @param value - The jsonb, array, or range value to filter with
   */
  containedBy(column: string, value: string | readonly unknown[] | Record<string, unknown>): this {
    if (typeof value === 'string') {
      // range
      this.url.searchParams.append(column, `cd.${value}`)
    } else if (Array.isArray(value)) {
      // array
      this.url.searchParams.append(column, `cd.{${value.join(',')}}`)
    } else {
      // json
      this.url.searchParams.append(column, `cd.${JSON.stringify(value)}`)
    }
    return this
  }

  rangeGt<ColumnName extends string & keyof Row>(column: ColumnName, range: string): this
  rangeGt(column: string, range: string): this
  /**
   * Only relevant for range columns. Match only rows where every element in
   * `column` is greater than any element in `range`.
   *
   * @param column - The range column to filter on
   * @param range - The range to filter with
   */
  rangeGt(column: string, range: string): this {
    this.url.searchParams.append(column, `sr.${range}`)
    return this
  }

  rangeGte<ColumnName extends string & keyof Row>(column: ColumnName, range: string): this
  rangeGte(column: string, range: string): this
  /**
   * Only relevant for range columns. Match only rows where every element in
   * `column` is either contained in `range` or greater than any element in
   * `range`.
   *
   * @param column - The range column to filter on
   * @param range - The range to filter with
   */
  rangeGte(column: string, range: string): this {
    this.url.searchParams.append(column, `nxl.${range}`)
    return this
  }

  rangeLt<ColumnName extends string & keyof Row>(column: ColumnName, range: string): this
  rangeLt(column: string, range: string): this
  /**
   * Only relevant for range columns. Match only rows where every element in
   * `column` is less than any element in `range`.
   *
   * @param column - The range column to filter on
   * @param range - The range to filter with
   */
  rangeLt(column: string, range: string): this {
    this.url.searchParams.append(column, `sl.${range}`)
    return this
  }

  rangeLte<ColumnName extends string & keyof Row>(column: ColumnName, range: string): this
  rangeLte(column: string, range: string): this
  /**
   * Only relevant for range columns. Match only rows where every element in
   * `column` is either contained in `range` or less than any element in
   * `range`.
   *
   * @param column - The range column to filter on
   * @param range - The range to filter with
   */
  rangeLte(column: string, range: string): this {
    this.url.searchParams.append(column, `nxr.${range}`)
    return this
  }

  rangeAdjacent<ColumnName extends string & keyof Row>(column: ColumnName, range: string): this
  rangeAdjacent(column: string, range: string): this
  /**
   * Only relevant for range columns. Match only rows where `column` is
   * mutually exclusive to `range` and there can be no element between the two
   * ranges.
   *
   * @param column - The range column to filter on
   * @param range - The range to filter with
   */
  rangeAdjacent(column: string, range: string): this {
    this.url.searchParams.append(column, `adj.${range}`)
    return this
  }

  overlaps<ColumnName extends string & keyof Row>(
    column: ColumnName,
    value: string | ReadonlyArray<Row[ColumnName]>
  ): this
  overlaps(column: string, value: string | readonly unknown[]): this
  /**
   * Only relevant for array and range columns. Match only rows where
   * `column` and `value` have an element in common.
   *
   * @param column - The array or range column to filter on
   * @param value - The array or range value to filter with
   */
  overlaps(column: string, value: string | readonly unknown[]): this {
    if (typeof value === 'string') {
      // range
      this.url.searchParams.append(column, `ov.${value}`)
    } else {
      // array
      this.url.searchParams.append(column, `ov.{${value.join(',')}}`)
    }
    return this
  }

  textSearch<ColumnName extends string & keyof Row>(
    column: ColumnName,
    query: string,
    options?: { config?: string; type?: 'plain' | 'phrase' | 'websearch' }
  ): this
  textSearch(
    column: string,
    query: string,
    options?: { config?: string; type?: 'plain' | 'phrase' | 'websearch' }
  ): this
  /**
   * Only relevant for text and tsvector columns. Match only rows where
   * `column` matches the query string in `query`.
   *
   * @param column - The text or tsvector column to filter on
   * @param query - The query text to match with
   * @param options - Named parameters
   * @param options.config - The text search configuration to use
   * @param options.type - Change how the `query` text is interpreted
   */
  textSearch(
    column: string,
    query: string,
    { config, type }: { config?: string; type?: 'plain' | 'phrase' | 'websearch' } = {}
  ): this {
    let typePart = ''
    if (type === 'plain') {
      typePart = 'pl'
    } else if (type === 'phrase') {
      typePart = 'ph'
    } else if (type === 'websearch') {
      typePart = 'w'
    }
    const configPart = config === undefined ? '' : `(${config})`
    this.url.searchParams.append(column, `${typePart}fts${configPart}.${query}`)
    return this
  }

  match<ColumnName extends string & keyof Row>(query: Record<ColumnName, Row[ColumnName]>): this
  match(query: Record<string, unknown>): this
  /**
   * Match only rows where each column in `query` keys is equal to its
   * associated value. Shorthand for multiple `.eq()`s.
   *
   * @param query - The object to filter with, with column names as keys mapped
   * to their filter values
   */
  match(query: Record<string, unknown>): this {
    Object.entries(query).forEach(([column, value]) => {
      this.url.searchParams.append(column, `eq.${value}`)
    })
    return this
  }

  not<ColumnName extends string & keyof Row>(
    column: ColumnName,
    operator: FilterOperator,
    value: Row[ColumnName]
  ): this
  not(column: string, operator: string, value: unknown): this
  /**
   * Match only rows which doesn't satisfy the filter.
   *
   * Unlike most filters, `opearator` and `value` are used as-is and need to
   * follow [PostgREST
   * syntax](https://postgrest.org/en/stable/api.html#operators). You also need
   * to make sure they are properly sanitized.
   *
   * @param column - The column to filter on
   * @param operator - The operator to be negated to filter with, following
   * PostgREST syntax
   * @param value - The value to filter with, following PostgREST syntax
   */
  not(column: string, operator: string, value: unknown): this {
    this.url.searchParams.append(column, `not.${operator}.${value}`)
    return this
  }

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
  or(
    filters: string,
    {
      foreignTable,
      referencedTable = foreignTable,
    }: { foreignTable?: string; referencedTable?: string } = {}
  ): this {
    const key = referencedTable ? `${referencedTable}.or` : 'or'
    this.url.searchParams.append(key, `(${filters})`)
    return this
  }

  filter<ColumnName extends string & keyof Row>(
    column: ColumnName,
    operator: `${'' | 'not.'}${FilterOperator}`,
    value: unknown
  ): this
  filter(column: string, operator: string, value: unknown): this
  /**
   * Match only rows which satisfy the filter. This is an escape hatch - you
   * should use the specific filter methods wherever possible.
   *
   * Unlike most filters, `opearator` and `value` are used as-is and need to
   * follow [PostgREST
   * syntax](https://postgrest.org/en/stable/api.html#operators). You also need
   * to make sure they are properly sanitized.
   *
   * @param column - The column to filter on
   * @param operator - The operator to filter with, following PostgREST syntax
   * @param value - The value to filter with, following PostgREST syntax
   */
  filter(column: string, operator: string, value: unknown): this {
    this.url.searchParams.append(column, `${operator}.${value}`)
    return this
  }
}
