import { ITSToStringLiteral } from './string';
export type ITSNumberString<N extends number | bigint = number> = ITSToStringLiteral<N>;
export type ITSUnpackNumberString<S extends string, R = never> = S extends ITSNumberString<infer N> ? N : R;
export type ITSNumberValue = number | string;
export type ITSNumberValue2 = number | ITSNumberString;
