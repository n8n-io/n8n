import type { And, DoesExtend, If, IsNever, IsObject, Not, Or, UnionPop } from "../../utils";
import type { AnyType } from "../any";
import type { ArrayType } from "../array";
import type { Const, ConstType, ConstValue } from "../const";
import type { EnumType } from "../enum";
import type { Never, NeverType } from "../never";
import type { _Object, IsObjectClosedOnResolve, IsObjectOpen, ObjectOpenProps, ObjectRequiredKeys, ObjectType, ObjectValue, ObjectValues } from "../object";
import type { PrimitiveType } from "../primitive";
import type { TupleType } from "../tuple";
import type { Type } from "../type";
import type { UnionType } from "../union";
import type { Deserialized, IsSerialized } from "../utils";
import type { ExcludeEnum } from "./enum";
import type { _$Exclude, _Exclude } from "./index";
import type { ExcludeUnion } from "./union";
import type { ExclusionResult, IsOmittable, IsOutsideOfExcludedScope, IsOutsideOfSourceScope, PropagateExclusion, SourceValue, ValueExclusionResult, ValueExclusionResultType } from "./utils";
export declare type ExcludeFromObject<META_OBJECT extends ObjectType, META_TYPE> = META_TYPE extends Type ? META_TYPE extends NeverType ? META_OBJECT : META_TYPE extends AnyType ? Never : META_TYPE extends ConstType ? ExcludeConstFromObject<META_OBJECT, META_TYPE> : META_TYPE extends EnumType ? ExcludeEnum<META_OBJECT, META_TYPE> : META_TYPE extends PrimitiveType ? META_OBJECT : META_TYPE extends ArrayType ? META_OBJECT : META_TYPE extends TupleType ? META_OBJECT : META_TYPE extends ObjectType ? ExcludeObjects<META_OBJECT, META_TYPE> : META_TYPE extends UnionType ? ExcludeUnion<META_OBJECT, META_TYPE> : Never : Never;
declare type ExcludeObjects<META_OBJECT_A extends ObjectType, META_OBJECT_B extends ObjectType, VALUE_EXCLUSION_RESULTS extends Record<string, ValueExclusionResultType> = ExcludeObjectValues<META_OBJECT_A, META_OBJECT_B>, REPRESENTABLE_KEYS extends string = RepresentableKeys<VALUE_EXCLUSION_RESULTS>, OPEN_PROPS_EXCLUSION = _Exclude<ObjectOpenProps<META_OBJECT_A>, ObjectOpenProps<META_OBJECT_B>>> = DoesObjectSizesMatch<META_OBJECT_A, META_OBJECT_B, VALUE_EXCLUSION_RESULTS> extends true ? {
    moreThanTwo: META_OBJECT_A;
    onlyOne: PropagateExclusions<META_OBJECT_A, VALUE_EXCLUSION_RESULTS>;
    none: OmitOmittableKeys<META_OBJECT_A, VALUE_EXCLUSION_RESULTS>;
}[And<IsObjectOpen<META_OBJECT_A>, Not<DoesExtend<OPEN_PROPS_EXCLUSION, NeverType>>> extends true ? "moreThanTwo" : GetUnionLength<REPRESENTABLE_KEYS>] : META_OBJECT_A;
declare type ExcludeObjectValues<META_OBJECT_A extends ObjectType, META_OBJECT_B extends ObjectType> = {
    [KEY in Extract<keyof ObjectValues<META_OBJECT_A> | keyof ObjectValues<META_OBJECT_B> | ObjectRequiredKeys<META_OBJECT_A> | ObjectRequiredKeys<META_OBJECT_B>, string>]: ValueExclusionResult<ObjectValue<META_OBJECT_A, KEY>, IsAllowedIn<META_OBJECT_A, KEY>, IsRequiredIn<META_OBJECT_A, KEY>, ObjectValue<META_OBJECT_B, KEY>, IsAllowedIn<META_OBJECT_B, KEY>, IsRequiredIn<META_OBJECT_B, KEY>>;
};
declare type GetUnionLength<UNION> = If<IsNever<UNION>, "none", If<IsNever<UnionPop<UNION>>, "onlyOne", "moreThanTwo">>;
declare type IsAllowedIn<META_OBJECT extends ObjectType, KEY extends string> = Or<DoesExtend<KEY, keyof ObjectValues<META_OBJECT>>, IsObjectOpen<META_OBJECT>>;
declare type IsRequiredIn<META_OBJECT extends ObjectType, KEY extends string> = DoesExtend<KEY, ObjectRequiredKeys<META_OBJECT>>;
declare type DoesObjectSizesMatch<META_OBJECT_A extends ObjectType, META_OBJECT_B extends ObjectType, VALUE_EXCLUSION_RESULTS extends Record<string, ValueExclusionResultType>> = If<And<IsObjectOpen<META_OBJECT_A>, Not<IsObjectOpen<META_OBJECT_B>>>, false, And<IsExcludedSmallEnough<VALUE_EXCLUSION_RESULTS>, IsExcludedBigEnough<VALUE_EXCLUSION_RESULTS>>>;
declare type IsExcludedSmallEnough<VALUE_EXCLUSION_RESULTS extends Record<string, ValueExclusionResultType>> = Not<DoesExtend<true, {
    [KEY in keyof VALUE_EXCLUSION_RESULTS]: IsOutsideOfSourceScope<VALUE_EXCLUSION_RESULTS[KEY]>;
}[keyof VALUE_EXCLUSION_RESULTS]>>;
declare type IsExcludedBigEnough<VALUE_EXCLUSION_RESULTS extends Record<string, ValueExclusionResultType>> = Not<DoesExtend<true, {
    [KEY in keyof VALUE_EXCLUSION_RESULTS]: IsOutsideOfExcludedScope<VALUE_EXCLUSION_RESULTS[KEY]>;
}[keyof VALUE_EXCLUSION_RESULTS]>>;
declare type RepresentableKeys<VALUE_EXCLUSION_RESULTS extends Record<string, ValueExclusionResultType>> = {
    [KEY in Extract<keyof VALUE_EXCLUSION_RESULTS, string>]: ExclusionResult<VALUE_EXCLUSION_RESULTS[KEY]> extends NeverType ? never : KEY;
}[Extract<keyof VALUE_EXCLUSION_RESULTS, string>];
declare type PropagateExclusions<META_OBJECT extends ObjectType, VALUE_EXCLUSION_RESULTS extends Record<string, ValueExclusionResultType>> = _Object<{
    [KEY in keyof VALUE_EXCLUSION_RESULTS]: PropagateExclusion<VALUE_EXCLUSION_RESULTS[KEY]>;
}, ObjectRequiredKeys<META_OBJECT>, ObjectOpenProps<META_OBJECT>, IsObjectClosedOnResolve<META_OBJECT>, IsSerialized<META_OBJECT>, Deserialized<META_OBJECT>>;
declare type OmitOmittableKeys<META_OBJECT extends ObjectType, VALUE_EXCLUSION_RESULTS extends Record<string, ValueExclusionResultType>, OMITTABLE_KEYS extends string = OmittableKeys<VALUE_EXCLUSION_RESULTS>, OMITTABLE_KEYS_COUNT extends string = GetUnionLength<OMITTABLE_KEYS>> = OMITTABLE_KEYS_COUNT extends "moreThanTwo" ? META_OBJECT : OMITTABLE_KEYS_COUNT extends "onlyOne" ? _Object<{
    [KEY in keyof VALUE_EXCLUSION_RESULTS]: KEY extends OMITTABLE_KEYS ? Never : SourceValue<VALUE_EXCLUSION_RESULTS[KEY]>;
}, ObjectRequiredKeys<META_OBJECT>, ObjectOpenProps<META_OBJECT>, IsObjectClosedOnResolve<META_OBJECT>, IsSerialized<META_OBJECT>, Deserialized<META_OBJECT>> : Never;
declare type OmittableKeys<VALUE_EXCLUSION_RESULTS extends Record<string, ValueExclusionResultType>> = {
    [KEY in Extract<keyof VALUE_EXCLUSION_RESULTS, string>]: IsOmittable<VALUE_EXCLUSION_RESULTS[KEY]> extends true ? KEY : never;
}[Extract<keyof VALUE_EXCLUSION_RESULTS, string>];
declare type ExcludeConstFromObject<META_OBJECT extends ObjectType, META_CONST extends ConstType, CONST_VALUE = ConstValue<META_CONST>> = If<IsObject<CONST_VALUE>, _$Exclude<META_OBJECT, _Object<{
    [KEY in Extract<keyof CONST_VALUE, string>]: Const<CONST_VALUE[KEY]>;
}, Extract<keyof CONST_VALUE, string>, Never, IsObjectClosedOnResolve<META_OBJECT>, IsSerialized<META_CONST>, Deserialized<META_CONST>>>, META_OBJECT>;
export {};
