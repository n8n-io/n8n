import { ReadonlyKeys } from "../readonly-keys";
import { Writable } from "../writable";
export type MarkReadonly<Type, Keys extends keyof Type> = Type extends Type ? Readonly<Type> & Writable<Pick<Type, Exclude<keyof Type, Keys | (Type extends object ? ReadonlyKeys<Type> : never)>>> : never;
