import type { SetupContext, UnwrapRef } from 'vue';
import type { RuleItem, ValidateError, ValidateFieldsError } from 'async-validator';
import type { ComponentSize } from 'element-plus/es/constants';
import type { Arrayable } from 'element-plus/es/utils';
import type { MaybeRef } from '@vueuse/core';
import type { FormItemProp, FormItemProps, FormItemValidateState } from './form-item';
import type { FormEmits, FormProps } from './form';
import type { useFormLabelWidth } from './utils';
export declare type FormLabelWidthContext = ReturnType<typeof useFormLabelWidth>;
export interface FormItemRule extends RuleItem {
    trigger?: Arrayable<string>;
}
declare type Primitive = null | undefined | string | number | boolean | symbol | bigint;
declare type BrowserNativeObject = Date | FileList | File | Blob | RegExp;
/**
 * Check whether it is tuple
 *
 * 检查是否为元组
 *
 * @example
 * IsTuple<[1, 2, 3]> => true
 * IsTuple<Array[number]> => false
 */
declare type IsTuple<T extends ReadonlyArray<any>> = number extends T['length'] ? false : true;
/**
 * Array method key
 *
 * 数组方法键
 */
declare type ArrayMethodKey = keyof any[];
/**
 * Tuple index key
 *
 * 元组下标键
 *
 * @example
 * TupleKey<[1, 2, 3]> => '0' | '1' | '2'
 */
declare type TupleKey<T extends ReadonlyArray<any>> = Exclude<keyof T, ArrayMethodKey>;
/**
 * Array index key
 *
 * 数组下标键
 */
declare type ArrayKey = number;
/**
 * Helper type for recursively constructing paths through a type
 *
 * 用于通过一个类型递归构建路径的辅助类型
 */
declare type PathImpl<K extends string | number, V> = V extends Primitive | BrowserNativeObject ? `${K}` : `${K}` | `${K}.${Path<V>}`;
/**
 * Type which collects all paths through a type
 *
 * 通过一个类型收集所有路径的类型
 *
 * @see {@link FieldPath}
 */
declare type Path<T> = T extends ReadonlyArray<infer V> ? IsTuple<T> extends true ? {
    [K in TupleKey<T>]-?: PathImpl<Exclude<K, symbol>, T[K]>;
}[TupleKey<T>] : PathImpl<ArrayKey, V> : {
    [K in keyof T]-?: PathImpl<Exclude<K, symbol>, T[K]>;
}[keyof T];
/**
 * Type which collects all paths through a type
 *
 * 通过一个类型收集所有路径的类型
 *
 * @example
 * FieldPath<{ 1: number; a: number; b: string; c: { d: number; e: string }; f: [{ value: string }]; g: { value: string }[]; h: Date; i: FileList; j: File; k: Blob; l: RegExp }> => '1' | 'a' | 'b' | 'c' | 'f' | 'g' | 'c.d' | 'c.e' | 'f.0' | 'f.0.value' | 'g.number' | 'g.number.value' | 'h' | 'i' | 'j' | 'k' | 'l'
 */
declare type FieldPath<T> = T extends object ? Path<T> : never;
export declare type FormRules<T extends MaybeRef<Record<string, any> | string> = string> = Partial<Record<UnwrapRef<T> extends string ? UnwrapRef<T> : FieldPath<UnwrapRef<T>>, Arrayable<FormItemRule>>>;
export declare type FormValidationResult = Promise<boolean>;
export declare type FormValidateCallback = (isValid: boolean, invalidFields?: ValidateFieldsError) => void;
export interface FormValidateFailure {
    errors: ValidateError[] | null;
    fields: ValidateFieldsError;
}
export declare type FormContext = FormProps & UnwrapRef<FormLabelWidthContext> & {
    emit: SetupContext<FormEmits>['emit'];
    addField: (field: FormItemContext) => void;
    removeField: (field: FormItemContext) => void;
    resetFields: (props?: Arrayable<FormItemProp>) => void;
    clearValidate: (props?: Arrayable<FormItemProp>) => void;
    validateField: (props?: Arrayable<FormItemProp>, callback?: FormValidateCallback) => FormValidationResult;
};
export interface FormItemContext extends FormItemProps {
    $el: HTMLDivElement | undefined;
    size: ComponentSize;
    validateState: FormItemValidateState;
    isGroup: boolean;
    labelId: string;
    inputIds: string[];
    hasLabel: boolean;
    addInputId: (id: string) => void;
    removeInputId: (id: string) => void;
    validate: (trigger: string, callback?: FormValidateCallback) => FormValidationResult;
    resetField(): void;
    clearValidate(): void;
}
export {};
