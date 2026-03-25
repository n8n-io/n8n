import type { DoesExtend, If, IsNever } from "../utils";
import type { Never, NeverType } from "./never";
import type { $Resolve, ResolveOptions } from "./resolve";
import type { Type } from "./type";
export declare type UnionTypeId = "union";
export declare type Union<VALUES extends Type> = $Union<VALUES>;
export declare type $Union<VALUES> = If<IsNever<VALUES>, Never, DoesExtend<VALUES, NeverType> extends true ? Never : {
    type: UnionTypeId;
    values: VALUES;
}>;
export declare type UnionType = {
    type: UnionTypeId;
    values: Type;
};
export declare type UnionValues<META_UNION extends UnionType> = META_UNION["values"];
export declare type ResolveUnion<META_UNION extends UnionType, OPTIONS extends ResolveOptions> = RecurseOnUnion<UnionValues<META_UNION>, OPTIONS>;
declare type RecurseOnUnion<VALUES extends Type, OPTIONS extends ResolveOptions> = VALUES extends infer META_TYPE ? $Resolve<META_TYPE, OPTIONS> : never;
export {};
