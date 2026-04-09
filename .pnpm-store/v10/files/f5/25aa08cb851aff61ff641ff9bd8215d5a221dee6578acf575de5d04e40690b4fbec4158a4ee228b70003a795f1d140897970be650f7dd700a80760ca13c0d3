import { Prettify } from "../prettify";
export type MarkRequired<Type, Keys extends keyof Type> = Type extends Type ? Prettify<Type & Required<Omit<Type, Exclude<keyof Type, Keys>>>> : never;
