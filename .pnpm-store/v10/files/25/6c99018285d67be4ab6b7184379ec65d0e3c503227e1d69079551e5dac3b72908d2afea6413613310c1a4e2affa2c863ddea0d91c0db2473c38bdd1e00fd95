import { NestedProperties, PhoneNumber, PhoneNumberInput, PrimitiveField, RefProperty, RefPropertyDefault, ReferenceToMultiTarget, WeaviateField } from '../index.js';
import { ReferenceManager } from '../references/classes.js';
import { CrossReference } from '../references/index.js';
export type ExtractCrossReferenceType<T> = T extends CrossReference<infer U> ? U : never;
type ExtractNestedType<T> = T extends (infer U)[] ? U extends NestedProperties ? U : never : T extends NestedProperties ? T : never;
export type QueryNested<T> = {
    [K in NestedKeys<T>]: {
        name: K;
        properties: QueryProperty<ExtractNestedType<T[K]>>[];
    };
}[NestedKeys<T>];
export type QueryNestedDefault = {
    name: string;
    properties: (string | QueryNestedDefault)[];
};
export type QueryProperty<T> = T extends undefined ? string | QueryNestedDefault : PrimitiveKeys<T> | QueryNested<T>;
export type QueryReference<T> = T extends undefined ? RefPropertyDefault : RefProperty<T>;
export type NonRefProperty<T> = keyof T | QueryNested<T>;
export type NonPrimitiveProperty<T> = RefProperty<T> | QueryNested<T>;
export type QueryVector<V> = V extends undefined ? string : keyof V & string;
export type IncludeVector<V> = boolean | QueryVector<V>[] | undefined;
export type IsEmptyType<T> = keyof T extends never ? true : false;
export type ReferenceInput<T> = string | ReferenceToMultiTarget | ReferenceManager<T> | (string | ReferenceToMultiTarget | ReferenceManager<T>)[];
export type ReferenceInputs<Obj> = Obj extends undefined ? Record<string, ReferenceInput<undefined>> : {
    [Key in keyof Obj as Key extends RefKeys<Obj> ? Key : never]: ReferenceInput<ExtractCrossReferenceType<Obj[Key]>>;
};
export type IsPrimitiveField<T> = T extends PrimitiveField ? T : never;
export type IsWeaviateField<T> = T extends WeaviateField ? T : never;
export type IsNestedField<T> = T extends NestedProperties | NestedProperties[] ? T : never;
/**
 * This is an internal type that is used to extract the keys of a user-provided generic type that are primitive fields, e.g. non-nested and non-reference.
 */
export type PrimitiveKeys<Obj> = Obj extends undefined ? string : {
    [Key in keyof Obj]-?: undefined extends Obj[Key] ? IsPrimitiveField<Exclude<Obj[Key], undefined>> extends never ? never : Key : IsPrimitiveField<Obj[Key]> extends never ? never : Key;
}[keyof Obj] & string;
/**
 * This is an internal type that is used to extract the keys of a user-provided generic type that are references.
 */
export type RefKeys<Obj> = {
    [Key in keyof Obj]: Obj[Key] extends CrossReference<any> | undefined ? Key : never;
}[keyof Obj] & string;
/**
 * This is an internal type that is used to extract the keys of a user-provided generic type that are not references.
 */
export type NonRefKeys<Obj> = {
    [Key in keyof Obj]-?: undefined extends Obj[Key] ? IsWeaviateField<Exclude<Obj[Key], undefined>> extends never ? never : Key : IsWeaviateField<Obj[Key]> extends never ? never : Key;
}[keyof Obj] & string;
/**
 * This is an internal type that is used to extract the keys of a user-provided generic type that are nested properties.
 */
export type NestedKeys<Obj> = {
    [Key in keyof Obj]-?: undefined extends Obj[Key] ? IsNestedField<Exclude<Obj[Key], undefined>> extends never ? never : Key : IsNestedField<Obj[Key]> extends never ? never : Key;
}[keyof Obj] & string;
/**
 * This is an internal type that is used to extract the allowed inputs for a non-generic type that is not a reference.
 */
export type NonReferenceInputs<Obj> = Obj extends undefined ? Record<string, WeaviateField> : {
    [Key in keyof Obj as Key extends NonRefKeys<Obj> ? Key : never]: MapPhoneNumberType<Obj[Key]>;
};
export type MapPhoneNumberType<T> = T extends PhoneNumber ? PhoneNumberInput : T;
export type NonEmpty<T> = keyof T extends never ? never : T;
export {};
