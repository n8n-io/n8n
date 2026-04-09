import { ReadonlyKeys } from "../readonly-keys";
import { Writable } from "../writable";
import { Prettify } from "../prettify";
export type MarkReadonly<Type, Keys extends keyof Type> = Type extends Type ? Prettify<Readonly<Type> & Writable<Omit<Type, Keys | ReadonlyKeys<Type & object>>>> : never;
