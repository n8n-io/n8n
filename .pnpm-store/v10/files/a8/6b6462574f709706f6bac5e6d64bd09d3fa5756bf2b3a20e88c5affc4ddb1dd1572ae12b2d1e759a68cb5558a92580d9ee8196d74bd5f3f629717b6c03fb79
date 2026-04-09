import { Writable } from "../writable";
import { WritableKeys } from "../writable-keys";
import { Prettify } from "../prettify";
export type MarkWritable<Type, Keys extends keyof Type> = Type extends Type ? Prettify<Readonly<Type> & Writable<Omit<Type, Exclude<keyof Type, WritableKeys<Type & object> | Keys>>>> : never;
