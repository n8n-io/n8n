import { Writable } from "../writable";
import { WritableKeys } from "../writable-keys";
export type MarkWritable<Type, Keys extends keyof Type> = Type extends Type ? Readonly<Type> & Writable<Pick<Type, (Type extends object ? WritableKeys<Type> : never) | Keys>> : never;
