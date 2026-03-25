import { IsFullyWritable } from "../is-fully-writable";
export type ReadonlyKeys<Type extends object> = {
    [Key in keyof Type]-?: IsFullyWritable<Pick<Type, Key>> extends true ? never : Key;
}[keyof Type];
