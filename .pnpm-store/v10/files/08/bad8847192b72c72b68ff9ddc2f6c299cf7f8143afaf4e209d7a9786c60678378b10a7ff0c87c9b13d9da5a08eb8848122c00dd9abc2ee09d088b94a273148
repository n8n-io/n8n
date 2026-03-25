import type { And, If, IsNever } from "../utils";
import type { Never } from "./never";
import type { ResolveOptions } from "./resolve";
import type { Deserialized, IsSerialized } from "./utils";
export declare type ConstTypeId = "const";
export declare type Const<VALUE, IS_SERIALIZED extends boolean = false, DESERIALIZED = never> = If<IsNever<VALUE>, Never, {
    type: ConstTypeId;
    value: VALUE;
    isSerialized: IS_SERIALIZED;
    deserialized: DESERIALIZED;
}>;
export declare type ConstType = {
    type: ConstTypeId;
    value: unknown;
    isSerialized: boolean;
    deserialized: unknown;
};
export declare type ConstValue<META_CONST extends ConstType> = META_CONST["value"];
export declare type ResolveConst<META_CONST extends ConstType, OPTIONS extends ResolveOptions> = If<And<OPTIONS["deserialize"], IsSerialized<META_CONST>>, Deserialized<META_CONST>, ConstValue<META_CONST>>;
