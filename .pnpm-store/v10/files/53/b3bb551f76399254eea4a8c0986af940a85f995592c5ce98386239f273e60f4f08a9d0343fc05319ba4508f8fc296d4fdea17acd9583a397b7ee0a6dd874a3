import { OptionalKeys } from "../optional-keys";
export type RequiredKeys<Type> = Type extends unknown ? Exclude<keyof Type, OptionalKeys<Type>> : never;
