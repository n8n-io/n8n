import type { And, If, IsNever } from "../utils";
import type { Never } from "./never";
import type { ResolveOptions } from "./resolve";
import type { Deserialized, IsSerialized } from "./utils";
export declare type PrimitiveTypeId = "primitive";
export declare type Primitive<VALUE extends null | boolean | number | string, IS_SERIALIZED extends boolean = false, DESERIALIZED = never> = $Primitive<VALUE, IS_SERIALIZED, DESERIALIZED>;
export declare type $Primitive<VALUE, IS_SERIALIZED = false, DESERIALIZED = never> = If<IsNever<VALUE>, Never, {
    type: PrimitiveTypeId;
    value: VALUE;
    isSerialized: IS_SERIALIZED;
    deserialized: DESERIALIZED;
}>;
export declare type PrimitiveType = {
    type: PrimitiveTypeId;
    value: null | boolean | number | string;
    isSerialized: boolean;
    deserialized: unknown;
};
export declare type PrimitiveValue<META_PRIMITIVE extends PrimitiveType> = META_PRIMITIVE["value"];
export declare type ResolvePrimitive<META_PRIMITIVE extends PrimitiveType, OPTIONS extends ResolveOptions> = If<And<OPTIONS["deserialize"], IsSerialized<META_PRIMITIVE>>, Deserialized<META_PRIMITIVE>, PrimitiveValue<META_PRIMITIVE>>;
