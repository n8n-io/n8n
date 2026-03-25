import { Prettify } from "../prettify";
type ExtractFromObject<Obj extends Record<PropertyKey, unknown>, Key> = Key extends keyof Obj ? Obj[Key] : Key extends keyof NonNullable<Obj> ? NonNullable<Obj>[Key] | undefined : undefined;
type ExtractFromArray<Arr extends readonly any[], Key> = any[] extends Arr ? Arr extends readonly (infer T)[] ? T | undefined : undefined : Key extends keyof Arr ? Arr[Key] : undefined;
type GetWithArray<Type, Path, PrettifiedType = Prettify<Type>> = Path extends [] ? Type : Path extends [infer Key, ...infer Rest] ? PrettifiedType extends Record<PropertyKey, unknown> ? GetWithArray<ExtractFromObject<PrettifiedType, Key>, Rest> : Type extends readonly any[] ? GetWithArray<ExtractFromArray<Type, Key>, Rest> : undefined : never;
type Path<Type> = Type extends `${infer Key}.${infer Rest}` ? [Key, ...Path<Rest>] : Type extends `${infer Key}` ? [Key] : [];
export type PathValue<Type, StringPath> = GetWithArray<Type, Path<StringPath>>;
export {};
