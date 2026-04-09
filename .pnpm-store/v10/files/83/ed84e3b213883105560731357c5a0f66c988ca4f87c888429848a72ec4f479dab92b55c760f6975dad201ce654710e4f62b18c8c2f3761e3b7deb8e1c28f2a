import { IsFullyWritable } from "../is-fully-writable";
export type ReadonlyKeys<Type extends object> = Type extends unknown ? keyof {
    [Key in keyof Type as IsFullyWritable<Pick<Type, Key>> extends true ? never : Key]: never;
} : never;
