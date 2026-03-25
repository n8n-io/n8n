import { IsEqualConsideringWritability } from "./is-equal-considering-writability";
import { Writable } from "./writable";
export type IsFullyWritable<Type extends object> = IsEqualConsideringWritability<
  {
    [Key in keyof Type]: Type[Key];
  },
  Writable<{
    [Key in keyof Type]: Type[Key];
  }>
>;
