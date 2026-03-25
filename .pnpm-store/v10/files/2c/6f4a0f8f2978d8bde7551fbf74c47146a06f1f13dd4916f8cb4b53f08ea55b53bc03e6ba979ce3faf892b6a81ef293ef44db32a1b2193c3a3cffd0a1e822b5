import type { Fetch, PostgrestSingleResponse, PostgrestResponseSuccess, CheckMatchingArrayTypes, MergePartialResult, IsValidResultOverride } from './types';
import { ContainsNull } from './select-query-parser/types';
export default abstract class PostgrestBuilder<Result, ThrowOnError extends boolean = false> implements PromiseLike<ThrowOnError extends true ? PostgrestResponseSuccess<Result> : PostgrestSingleResponse<Result>> {
    protected method: 'GET' | 'HEAD' | 'POST' | 'PATCH' | 'DELETE';
    protected url: URL;
    protected headers: Record<string, string>;
    protected schema?: string;
    protected body?: unknown;
    protected shouldThrowOnError: boolean;
    protected signal?: AbortSignal;
    protected fetch: Fetch;
    protected isMaybeSingle: boolean;
    constructor(builder: PostgrestBuilder<Result>);
    /**
     * If there's an error with the query, throwOnError will reject the promise by
     * throwing the error instead of returning it as part of a successful response.
     *
     * {@link https://github.com/supabase/supabase-js/issues/92}
     */
    throwOnError(): this & PostgrestBuilder<Result, true>;
    /**
     * Set an HTTP header for the request.
     */
    setHeader(name: string, value: string): this;
    then<TResult1 = ThrowOnError extends true ? PostgrestResponseSuccess<Result> : PostgrestSingleResponse<Result>, TResult2 = never>(onfulfilled?: ((value: ThrowOnError extends true ? PostgrestResponseSuccess<Result> : PostgrestSingleResponse<Result>) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): PromiseLike<TResult1 | TResult2>;
    /**
     * Override the type of the returned `data`.
     *
     * @typeParam NewResult - The new result type to override with
     * @deprecated Use overrideTypes<yourType, { merge: false }>() method at the end of your call chain instead
     */
    returns<NewResult>(): PostgrestBuilder<CheckMatchingArrayTypes<Result, NewResult>, ThrowOnError>;
    /**
     * Override the type of the returned `data` field in the response.
     *
     * @typeParam NewResult - The new type to cast the response data to
     * @typeParam Options - Optional type configuration (defaults to { merge: true })
     * @typeParam Options.merge - When true, merges the new type with existing return type. When false, replaces the existing types entirely (defaults to true)
     * @example
     * ```typescript
     * // Merge with existing types (default behavior)
     * const query = supabase
     *   .from('users')
     *   .select()
     *   .overrideTypes<{ custom_field: string }>()
     *
     * // Replace existing types completely
     * const replaceQuery = supabase
     *   .from('users')
     *   .select()
     *   .overrideTypes<{ id: number; name: string }, { merge: false }>()
     * ```
     * @returns A PostgrestBuilder instance with the new type
     */
    overrideTypes<NewResult, Options extends {
        merge?: boolean;
    } = {
        merge: true;
    }>(): PostgrestBuilder<IsValidResultOverride<Result, NewResult, false, false> extends true ? ContainsNull<Result> extends true ? MergePartialResult<NewResult, NonNullable<Result>, Options> | null : MergePartialResult<NewResult, Result, Options> : CheckMatchingArrayTypes<Result, NewResult>, ThrowOnError>;
}
//# sourceMappingURL=PostgrestBuilder.d.ts.map