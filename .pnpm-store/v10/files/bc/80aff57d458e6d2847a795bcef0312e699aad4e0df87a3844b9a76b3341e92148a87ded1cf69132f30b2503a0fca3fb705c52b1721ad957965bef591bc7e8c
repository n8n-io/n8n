import type { And, DoesExtend, If, Not, Tail } from "../../utils";
import type { AnyType } from "../any";
import type { ArrayType, ArrayValues } from "../array";
import type { Const, ConstType, ConstValue } from "../const";
import type { EnumType } from "../enum";
import type { Never, NeverType } from "../never";
import type { ObjectType } from "../object";
import type { PrimitiveType } from "../primitive";
import type { $Tuple, IsTupleOpen, Tuple, TupleOpenProps, TupleType, TupleValues } from "../tuple";
import type { Type } from "../type";
import type { UnionType } from "../union";
import type { Deserialized, IsSerialized } from "../utils";
import type { ExcludeEnum } from "./enum";
import type { _Exclude } from "./index";
import type { ExcludeUnion } from "./union";
import type { ExclusionResult, IsOmittable, IsOutsideOfExcludedScope, IsOutsideOfSourceScope, PropagateExclusion, SourceValue, ValueExclusionResult, ValueExclusionResultType } from "./utils";
export declare type ExcludeFromTuple<META_TUPLE extends TupleType, META_TYPE> = META_TYPE extends Type ? META_TYPE extends NeverType ? META_TUPLE : META_TYPE extends AnyType ? Never : META_TYPE extends ConstType ? ExcludeConst<META_TUPLE, META_TYPE> : META_TYPE extends EnumType ? ExcludeEnum<META_TUPLE, META_TYPE> : META_TYPE extends PrimitiveType ? META_TUPLE : META_TYPE extends ArrayType ? ExcludeArray<META_TUPLE, META_TYPE> : META_TYPE extends TupleType ? ExcludeTuples<META_TUPLE, META_TYPE> : META_TYPE extends ObjectType ? META_TUPLE : META_TYPE extends UnionType ? ExcludeUnion<META_TUPLE, META_TYPE> : Never : Never;
declare type ExcludeArray<META_TUPLE extends TupleType, META_ARRAY extends ArrayType> = ExcludeTuples<META_TUPLE, Tuple<[
], ArrayValues<META_ARRAY>, IsSerialized<META_ARRAY>, Deserialized<META_ARRAY>>>;
declare type ExcludeTuples<META_TUPLE_A extends TupleType, META_TUPLE_B extends TupleType, VALUE_EXCLUSION_RESULTS extends ValueExclusionResultType[] = ExcludeTupleValues<TupleValues<META_TUPLE_A>, TupleValues<META_TUPLE_B>, IsTupleOpen<META_TUPLE_A>, IsTupleOpen<META_TUPLE_B>, TupleOpenProps<META_TUPLE_A>, TupleOpenProps<META_TUPLE_B>>, REPRESENTABLE_VALUE_EXCLUSION_RESULTS extends ValueExclusionResultType[] = RepresentableExcludedValues<VALUE_EXCLUSION_RESULTS>, EXCLUDED_OPEN_PROPS = _Exclude<TupleOpenProps<META_TUPLE_A>, TupleOpenProps<META_TUPLE_B>>, IS_OPEN_PROPS_EXCLUSION_REPRESENTABLE = Not<DoesExtend<EXCLUDED_OPEN_PROPS, NeverType>>> = If<DoesTupleSizesMatch<META_TUPLE_A, META_TUPLE_B, VALUE_EXCLUSION_RESULTS>, {
    moreThanTwo: META_TUPLE_A;
    onlyOne: $Tuple<PropagateExclusions<VALUE_EXCLUSION_RESULTS>, TupleOpenProps<META_TUPLE_A>, IsSerialized<META_TUPLE_A>, Deserialized<META_TUPLE_A>>;
    none: OmitOmittableExcludedItems<META_TUPLE_A, VALUE_EXCLUSION_RESULTS>;
}[And<IsTupleOpen<META_TUPLE_A>, IS_OPEN_PROPS_EXCLUSION_REPRESENTABLE> extends true ? "moreThanTwo" : GetTupleLength<REPRESENTABLE_VALUE_EXCLUSION_RESULTS>], META_TUPLE_A>;
declare type ExcludeTupleValues<META_TUPLE_A_VALUES extends Type[], META_TUPLE_B_VALUES extends Type[], IS_META_TUPLE_A_OPEN extends boolean, IS_META_TUPLE_B_OPEN extends boolean, META_TUPLE_A_OPEN_PROPS extends Type, META_TUPLE_B_OPEN_PROPS extends Type, VALUE_EXCLUSION_RESULTS extends ValueExclusionResultType[] = []> = META_TUPLE_A_VALUES extends [
    infer META_TUPLE_A_VALUES_HEAD,
    ...infer META_TUPLE_A_VALUES_TAIL
] ? META_TUPLE_A_VALUES_HEAD extends Type ? META_TUPLE_A_VALUES_TAIL extends Type[] ? META_TUPLE_B_VALUES extends [
    infer META_TUPLE_B_VALUES_HEAD,
    ...infer META_TUPLE_B_VALUES_TAIL
] ? META_TUPLE_B_VALUES_HEAD extends Type ? META_TUPLE_B_VALUES_TAIL extends Type[] ? ExcludeTupleValues<META_TUPLE_A_VALUES_TAIL, META_TUPLE_B_VALUES_TAIL, IS_META_TUPLE_A_OPEN, IS_META_TUPLE_B_OPEN, META_TUPLE_A_OPEN_PROPS, META_TUPLE_B_OPEN_PROPS, [
    ...VALUE_EXCLUSION_RESULTS,
    ValueExclusionResult<META_TUPLE_A_VALUES_HEAD, true, true, META_TUPLE_B_VALUES_HEAD, true, true>
]> : never : never : ExcludeTupleValues<META_TUPLE_A_VALUES_TAIL, [
], IS_META_TUPLE_A_OPEN, IS_META_TUPLE_B_OPEN, META_TUPLE_A_OPEN_PROPS, META_TUPLE_B_OPEN_PROPS, [
    ...VALUE_EXCLUSION_RESULTS,
    ValueExclusionResult<META_TUPLE_A_VALUES_HEAD, true, true, META_TUPLE_B_OPEN_PROPS, IS_META_TUPLE_B_OPEN, false>
]> : never : never : META_TUPLE_B_VALUES extends [
    infer META_TUPLE_B_VALUES_HEAD,
    ...infer META_TUPLE_B_VALUES_TAIL
] ? META_TUPLE_B_VALUES_HEAD extends Type ? META_TUPLE_B_VALUES_TAIL extends Type[] ? ExcludeTupleValues<[
], META_TUPLE_B_VALUES_TAIL, IS_META_TUPLE_A_OPEN, IS_META_TUPLE_B_OPEN, META_TUPLE_A_OPEN_PROPS, META_TUPLE_B_OPEN_PROPS, [
    ...VALUE_EXCLUSION_RESULTS,
    ValueExclusionResult<META_TUPLE_A_OPEN_PROPS, IS_META_TUPLE_A_OPEN, false, META_TUPLE_B_VALUES_HEAD, true, true>
]> : never : never : VALUE_EXCLUSION_RESULTS;
declare type GetTupleLength<ANY_TUPLE extends unknown[], TAIL extends unknown[] = Tail<ANY_TUPLE>> = If<DoesExtend<ANY_TUPLE, []>, "none", If<DoesExtend<TAIL, []>, "onlyOne", "moreThanTwo">>;
declare type DoesTupleSizesMatch<META_TUPLE_A extends TupleType, META_TUPLE_B extends TupleType, VALUE_EXCLUSION_RESULTS extends ValueExclusionResultType[]> = If<And<IsTupleOpen<META_TUPLE_A>, Not<IsTupleOpen<META_TUPLE_B>>>, false, And<IsExcludedSmallEnough<VALUE_EXCLUSION_RESULTS>, IsExcludedBigEnough<VALUE_EXCLUSION_RESULTS>>>;
declare type IsExcludedSmallEnough<VALUE_EXCLUSION_RESULTS extends ValueExclusionResultType[]> = VALUE_EXCLUSION_RESULTS extends [
    infer VALUE_EXCLUSION_RESULTS_HEAD,
    ...infer VALUE_EXCLUSION_RESULTS_TAIL
] ? VALUE_EXCLUSION_RESULTS_HEAD extends ValueExclusionResultType ? VALUE_EXCLUSION_RESULTS_TAIL extends ValueExclusionResultType[] ? If<IsOutsideOfSourceScope<VALUE_EXCLUSION_RESULTS_HEAD>, false, IsExcludedSmallEnough<VALUE_EXCLUSION_RESULTS_TAIL>> : never : never : true;
declare type IsExcludedBigEnough<VALUE_EXCLUSION_RESULTS extends ValueExclusionResultType[]> = VALUE_EXCLUSION_RESULTS extends [
    infer VALUE_EXCLUSION_RESULTS_HEAD,
    ...infer VALUE_EXCLUSION_RESULTS_TAIL
] ? VALUE_EXCLUSION_RESULTS_HEAD extends ValueExclusionResultType ? VALUE_EXCLUSION_RESULTS_TAIL extends ValueExclusionResultType[] ? If<IsOutsideOfExcludedScope<VALUE_EXCLUSION_RESULTS_HEAD>, false, IsExcludedBigEnough<VALUE_EXCLUSION_RESULTS_TAIL>> : never : never : true;
declare type RepresentableExcludedValues<VALUE_EXCLUSION_RESULTS extends ValueExclusionResultType[], REPRESENTABLE_VALUE_EXCLUSION_RESULTS extends ValueExclusionResultType[] = []> = VALUE_EXCLUSION_RESULTS extends [
    infer VALUE_EXCLUSION_RESULTS_HEAD,
    ...infer VALUE_EXCLUSION_RESULTS_TAIL
] ? VALUE_EXCLUSION_RESULTS_HEAD extends ValueExclusionResultType ? VALUE_EXCLUSION_RESULTS_TAIL extends ValueExclusionResultType[] ? ExclusionResult<VALUE_EXCLUSION_RESULTS_HEAD> extends NeverType ? RepresentableExcludedValues<VALUE_EXCLUSION_RESULTS_TAIL, REPRESENTABLE_VALUE_EXCLUSION_RESULTS> : RepresentableExcludedValues<VALUE_EXCLUSION_RESULTS_TAIL, [
    ...REPRESENTABLE_VALUE_EXCLUSION_RESULTS,
    VALUE_EXCLUSION_RESULTS_HEAD
]> : never : never : REPRESENTABLE_VALUE_EXCLUSION_RESULTS;
declare type PropagateExclusions<VALUE_EXCLUSION_RESULTS extends ValueExclusionResultType[], RESULT extends unknown[] = []> = VALUE_EXCLUSION_RESULTS extends [
    infer VALUE_EXCLUSION_RESULTS_HEAD,
    ...infer VALUE_EXCLUSION_RESULTS_TAIL
] ? VALUE_EXCLUSION_RESULTS_HEAD extends ValueExclusionResultType ? VALUE_EXCLUSION_RESULTS_TAIL extends ValueExclusionResultType[] ? PropagateExclusions<VALUE_EXCLUSION_RESULTS_TAIL, [
    ...RESULT,
    PropagateExclusion<VALUE_EXCLUSION_RESULTS_HEAD>
]> : never : never : RESULT;
declare type OmitOmittableExcludedItems<META_TUPLE extends TupleType, ITEM_EXCLUSION_RESULTS extends ValueExclusionResultType[], OMITTABLE_ITEM_EXCLUSION_RESULTS extends ValueExclusionResultType[] = OmittableExcludedItems<ITEM_EXCLUSION_RESULTS>, OMITTABLE_ITEMS_COUNT extends string = GetTupleLength<OMITTABLE_ITEM_EXCLUSION_RESULTS>> = OMITTABLE_ITEMS_COUNT extends "moreThanTwo" ? META_TUPLE : OMITTABLE_ITEMS_COUNT extends "onlyOne" ? $Tuple<RequiredExcludedItems<ITEM_EXCLUSION_RESULTS>, Never, IsSerialized<META_TUPLE>, Deserialized<META_TUPLE>> : Never;
declare type OmittableExcludedItems<ITEM_EXCLUSION_RESULTS extends ValueExclusionResultType[], RESULT extends ValueExclusionResultType[] = []> = ITEM_EXCLUSION_RESULTS extends [
    infer VALUE_EXCLUSION_RESULTS_HEAD,
    ...infer VALUE_EXCLUSION_RESULTS_TAIL
] ? VALUE_EXCLUSION_RESULTS_HEAD extends ValueExclusionResultType ? VALUE_EXCLUSION_RESULTS_TAIL extends ValueExclusionResultType[] ? If<IsOmittable<VALUE_EXCLUSION_RESULTS_HEAD>, OmittableExcludedItems<VALUE_EXCLUSION_RESULTS_TAIL, [
    ...RESULT,
    VALUE_EXCLUSION_RESULTS_HEAD
]>, OmittableExcludedItems<VALUE_EXCLUSION_RESULTS_TAIL, RESULT>> : never : never : RESULT;
declare type RequiredExcludedItems<ITEM_EXCLUSION_RESULTS extends ValueExclusionResultType[], RESULT extends Type[] = []> = ITEM_EXCLUSION_RESULTS extends [
    infer VALUE_EXCLUSION_RESULTS_HEAD,
    ...infer VALUE_EXCLUSION_RESULTS_TAIL
] ? VALUE_EXCLUSION_RESULTS_HEAD extends ValueExclusionResultType ? VALUE_EXCLUSION_RESULTS_TAIL extends ValueExclusionResultType[] ? IsOmittable<VALUE_EXCLUSION_RESULTS_HEAD> extends true ? RESULT : RequiredExcludedItems<VALUE_EXCLUSION_RESULTS_TAIL, [
    ...RESULT,
    SourceValue<VALUE_EXCLUSION_RESULTS_HEAD>
]> : never : never : RESULT;
declare type ExcludeConst<META_TUPLE extends TupleType, META_CONST extends ConstType, META_CONST_VALUE = ConstValue<META_CONST>> = META_CONST_VALUE extends unknown[] ? _Exclude<META_TUPLE, $Tuple<ExtractConstValues<META_CONST_VALUE>, Never, IsSerialized<META_CONST>, Deserialized<META_CONST>>> : META_TUPLE;
declare type ExtractConstValues<CONST_VALUES extends unknown[], RESULT extends unknown[] = []> = CONST_VALUES extends [infer CONST_VALUES_HEAD, ...infer CONST_VALUES_TAIL] ? ExtractConstValues<CONST_VALUES_TAIL, [...RESULT, Const<CONST_VALUES_HEAD>]> : RESULT;
export {};
