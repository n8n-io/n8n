import PostgrestError from './PostgrestError';
import { ContainsNull } from './select-query-parser/types';
import { SelectQueryError } from './select-query-parser/utils';
export declare type Fetch = typeof fetch;
/**
 * Response format
 *
 * {@link https://github.com/supabase/supabase-js/issues/32}
 */
interface PostgrestResponseBase {
    status: number;
    statusText: string;
}
export interface PostgrestResponseSuccess<T> extends PostgrestResponseBase {
    error: null;
    data: T;
    count: number | null;
}
export interface PostgrestResponseFailure extends PostgrestResponseBase {
    error: PostgrestError;
    data: null;
    count: null;
}
export declare type PostgrestSingleResponse<T> = PostgrestResponseSuccess<T> | PostgrestResponseFailure;
export declare type PostgrestMaybeSingleResponse<T> = PostgrestSingleResponse<T | null>;
export declare type PostgrestResponse<T> = PostgrestSingleResponse<T[]>;
export declare type GenericRelationship = {
    foreignKeyName: string;
    columns: string[];
    isOneToOne?: boolean;
    referencedRelation: string;
    referencedColumns: string[];
};
export declare type GenericTable = {
    Row: Record<string, unknown>;
    Insert: Record<string, unknown>;
    Update: Record<string, unknown>;
    Relationships: GenericRelationship[];
};
export declare type GenericUpdatableView = {
    Row: Record<string, unknown>;
    Insert: Record<string, unknown>;
    Update: Record<string, unknown>;
    Relationships: GenericRelationship[];
};
export declare type GenericNonUpdatableView = {
    Row: Record<string, unknown>;
    Relationships: GenericRelationship[];
};
export declare type GenericView = GenericUpdatableView | GenericNonUpdatableView;
export declare type GenericFunction = {
    Args: Record<string, unknown>;
    Returns: unknown;
};
export declare type GenericSchema = {
    Tables: Record<string, GenericTable>;
    Views: Record<string, GenericView>;
    Functions: Record<string, GenericFunction>;
};
export declare type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
export declare type SimplifyDeep<Type, ExcludeType = never> = ConditionalSimplifyDeep<Type, ExcludeType | NonRecursiveType | Set<unknown> | Map<unknown, unknown>, object>;
declare type ConditionalSimplifyDeep<Type, ExcludeType = never, IncludeType = unknown> = Type extends ExcludeType ? Type : Type extends IncludeType ? {
    [TypeKey in keyof Type]: ConditionalSimplifyDeep<Type[TypeKey], ExcludeType, IncludeType>;
} : Type;
declare type NonRecursiveType = BuiltIns | Function | (new (...arguments_: any[]) => unknown);
declare type BuiltIns = Primitive | void | Date | RegExp;
declare type Primitive = null | undefined | string | number | boolean | symbol | bigint;
export declare type IsValidResultOverride<Result, NewResult, ErrorResult, ErrorNewResult> = Result extends any[] ? NewResult extends any[] ? true : ErrorResult : NewResult extends any[] ? ErrorNewResult : true;
/**
 * Utility type to check if array types match between Result and NewResult.
 * Returns either the valid NewResult type or an error message type.
 */
export declare type CheckMatchingArrayTypes<Result, NewResult> = Result extends SelectQueryError<string> ? NewResult : IsValidResultOverride<Result, NewResult, {
    Error: 'Type mismatch: Cannot cast array result to a single object. Use .overrideTypes<Array<YourType>> or .returns<Array<YourType>> (deprecated) for array results or .single() to convert the result to a single object';
}, {
    Error: 'Type mismatch: Cannot cast single object to array type. Remove Array wrapper from return type or make sure you are not using .single() up in the calling chain';
}> extends infer ValidationResult ? ValidationResult extends true ? ContainsNull<Result> extends true ? NewResult | null : NewResult : ValidationResult : never;
declare type Simplify<T> = T extends object ? {
    [K in keyof T]: T[K];
} : T;
declare type ExplicitKeys<T> = {
    [K in keyof T]: string extends K ? never : K;
}[keyof T];
declare type MergeExplicit<New, Row> = {
    [K in ExplicitKeys<New> | ExplicitKeys<Row>]: K extends keyof New ? K extends keyof Row ? Row[K] extends SelectQueryError<string> ? New[K] : New[K] extends any[] ? Row[K] extends any[] ? Array<Simplify<MergeDeep<NonNullable<New[K][number]>, NonNullable<Row[K][number]>>>> : New[K] : IsPlainObject<NonNullable<New[K]>> extends true ? IsPlainObject<NonNullable<Row[K]>> extends true ? ContainsNull<New[K]> extends true ? // If the override wants to preserve optionality
    Simplify<MergeDeep<NonNullable<New[K]>, NonNullable<Row[K]>>> | null : Simplify<MergeDeep<New[K], NonNullable<Row[K]>>> : New[K] : New[K] : New[K] : K extends keyof Row ? Row[K] : never;
};
declare type MergeDeep<New, Row> = Simplify<MergeExplicit<New, Row> & (string extends keyof Row ? {
    [K: string]: Row[string];
} : {})>;
declare type IsPlainObject<T> = T extends any[] ? false : T extends object ? true : false;
export declare type MergePartialResult<NewResult, Result, Options> = Options extends {
    merge: true;
} ? Result extends any[] ? NewResult extends any[] ? Array<Simplify<MergeDeep<NewResult[number], Result[number]>>> : never : Simplify<MergeDeep<NewResult, Result>> : NewResult;
export {};
//# sourceMappingURL=types.d.ts.map