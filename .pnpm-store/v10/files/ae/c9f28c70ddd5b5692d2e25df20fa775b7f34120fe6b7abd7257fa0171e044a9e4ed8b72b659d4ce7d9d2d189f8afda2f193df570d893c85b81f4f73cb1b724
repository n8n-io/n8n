import { OptionalKeys } from "../optional-keys";
import { Prettify } from "../prettify";
export type MarkOptional<Type, Keys extends keyof Type> = Type extends Type ? Prettify<Partial<Type> & Required<Omit<Type, Keys | OptionalKeys<Type>>>> : never;
