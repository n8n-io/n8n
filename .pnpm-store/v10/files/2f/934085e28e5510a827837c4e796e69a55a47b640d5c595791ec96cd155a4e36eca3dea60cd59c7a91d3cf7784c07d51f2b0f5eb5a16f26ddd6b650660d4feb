import { IsFullyWritable } from "../is-fully-writable";
export type WritableKeys<Type extends {}> = {
    [Key in keyof Type]-?: IsFullyWritable<Pick<Type, Key>> extends true ? Key : never;
}[keyof Type];
