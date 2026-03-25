import type { epPropKey } from './runtime';
import type { ExtractPropTypes, PropType } from 'vue';
import type { IfNever, UnknownToNever, WritableArray } from './util';
declare type Value<T> = T[keyof T];
/**
 * Extract the type of a single prop
 *
 * 提取单个 prop 的参数类型
 *
 * @example
 * ExtractPropType<{ type: StringConstructor }> => string | undefined
 * ExtractPropType<{ type: StringConstructor, required: true }> => string
 * ExtractPropType<{ type: BooleanConstructor }> => boolean
 */
export declare type ExtractPropType<T extends object> = Value<ExtractPropTypes<{
    key: T;
}>>;
/**
 * Extracts types via `ExtractPropTypes`, accepting `PropType<T>`, `XXXConstructor`, `never`...
 *
 * 通过 `ExtractPropTypes` 提取类型，接受 `PropType<T>`、`XXXConstructor`、`never`...
 *
 * @example
 * ResolvePropType<BooleanConstructor> => boolean
 * ResolvePropType<PropType<T>> => T
 **/
export declare type ResolvePropType<T> = IfNever<T, never, ExtractPropType<{
    type: WritableArray<T>;
    required: true;
}>>;
/**
 * Merge Type, Value, Validator types
 * 合并 Type、Value、Validator 的类型
 *
 * @example
 * EpPropMergeType<StringConstructor, '1', 1> =>  1 | "1" // ignores StringConstructor
 * EpPropMergeType<StringConstructor, never, number> =>  string | number
 */
export declare type EpPropMergeType<Type, Value, Validator> = IfNever<UnknownToNever<Value>, ResolvePropType<Type>, never> | UnknownToNever<Value> | UnknownToNever<Validator>;
/**
 * Handling default values for input (constraints)
 *
 * 处理输入参数的默认值（约束）
 */
export declare type EpPropInputDefault<Required extends boolean, Default> = Required extends true ? never : Default extends Record<string, unknown> | Array<any> ? () => Default : (() => Default) | Default;
/**
 * Native prop types, e.g: `BooleanConstructor`, `StringConstructor`, `null`, `undefined`, etc.
 *
 * 原生 prop `类型，BooleanConstructor`、`StringConstructor`、`null`、`undefined` 等
 */
export declare type NativePropType = ((...args: any) => any) | {
    new (...args: any): any;
} | undefined | null;
export declare type IfNativePropType<T, Y, N> = [T] extends [NativePropType] ? Y : N;
/**
 * input prop `buildProp` or `buildProps` (constraints)
 *
 * prop 输入参数（约束）
 *
 * @example
 * EpPropInput<StringConstructor, 'a', never, never, true>
 * ⬇️
 * {
    type?: StringConstructor | undefined;
    required?: true | undefined;
    values?: readonly "a"[] | undefined;
    validator?: ((val: any) => boolean) | ((val: any) => val is never) | undefined;
    default?: undefined;
  }
 */
export declare type EpPropInput<Type, Value, Validator, Default extends EpPropMergeType<Type, Value, Validator>, Required extends boolean> = {
    type?: Type;
    required?: Required;
    values?: readonly Value[];
    validator?: ((val: any) => val is Validator) | ((val: any) => boolean);
    default?: EpPropInputDefault<Required, Default>;
};
/**
 * output prop `buildProp` or `buildProps`.
 *
 * prop 输出参数。
 *
 * @example
 * EpProp<'a', 'b', true>
 * ⬇️
 * {
    readonly type: PropType<"a">;
    readonly required: true;
    readonly validator: ((val: unknown) => boolean) | undefined;
    readonly default: "b";
    __epPropKey: true;
  }
 */
export declare type EpProp<Type, Default, Required> = {
    readonly type: PropType<Type>;
    readonly required: [Required] extends [true] ? true : false;
    readonly validator: ((val: unknown) => boolean) | undefined;
    [epPropKey]: true;
} & IfNever<Default, unknown, {
    readonly default: Default;
}>;
/**
 * Determine if it is `EpProp`
 */
export declare type IfEpProp<T, Y, N> = T extends {
    [epPropKey]: true;
} ? Y : N;
/**
 * Converting input to output.
 *
 * 将输入转换为输出
 */
export declare type EpPropConvert<Input> = Input extends EpPropInput<infer Type, infer Value, infer Validator, any, infer Required> ? EpPropFinalized<Type, Value, Validator, Input['default'], Required> : never;
/**
 * Finalized conversion output
 *
 * 最终转换 EpProp
 */
export declare type EpPropFinalized<Type, Value, Validator, Default, Required> = EpProp<EpPropMergeType<Type, Value, Validator>, UnknownToNever<Default>, Required>;
export {};
