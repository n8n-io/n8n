import { ITSToStringLiteralAllowedType } from '../string';
export type ITSStringInferToType<Str extends string, Type extends ITSToStringLiteralAllowedType, R = never> = Str extends `${infer U extends Type}` ? U : R;
export type ITSStringInferToNumber<Str extends string, R = never> = ITSStringInferToType<Str, number, R>;
export type ITSStringInferToBoolean<Str extends string, R = never> = ITSStringInferToType<Str, boolean, R>;
export type ITSStringInferToNull<Str extends string, R = never> = ITSStringInferToType<Str, null, R>;
export type ITSStringInferToUndefined<Str extends string, R = never> = ITSStringInferToType<Str, undefined, R>;
