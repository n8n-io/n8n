import { ITSEnumLike } from '../../type/record/enum';
import { ITSValueOf } from '../key-value';
import { ITSStringInferToNumber } from '../string/infer';
import { ITSToStringLiteral } from '../string';
export type ITSExcludeEnumValue<Enum extends ITSEnumLike, U extends ITSValueOf<Enum>> = Exclude<ITSValueOf<Enum>, U>;
export type ITSExtractEnumValue<Enum extends ITSEnumLike, U extends ITSValueOf<Enum>> = Extract<ITSValueOf<Enum>, U>;
export type ITSNumberEnumToNumber<T extends number> = ITSStringInferToNumber<ITSToStringLiteral<Extract<T, number>>>;
export type ITSNumberEnumAndNumber<T extends number> = Extract<T, number> | ITSNumberEnumToNumber<T>;
