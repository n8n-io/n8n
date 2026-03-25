import type { AnyType } from "../any";
import type { ArrayType, ArrayValues } from "../array";
import type { ConstType } from "../const";
import type { EnumType } from "../enum";
import type { Never, NeverType } from "../never";
import type { ObjectType } from "../object";
import type { PrimitiveType } from "../primitive";
import type { $Tuple, IsTupleOpen, TupleOpenProps, TupleType, TupleValues } from "../tuple";
import type { SerializableType, Type } from "../type";
import type { UnionType } from "../union";
import type { IntersectConstToTuple } from "./const";
import type { IntersectEnumToTuple } from "./enum";
import type { $Intersect, Intersect } from "./index";
import type { DistributeIntersection } from "./union";
import type { IntersectDeserialized, IntersectIsSerialized } from "./utils";
export declare type IntersectTupleSerializationParams<VALUES extends Type[], OPEN_PROPS extends Type, META_TUPLE extends TupleType, SERIALIZABLE_META_TYPE extends SerializableType> = $MergeTuplePropsToSerializable<VALUES, OPEN_PROPS, META_TUPLE, SERIALIZABLE_META_TYPE>;
declare type $MergeTuplePropsToSerializable<VALUES, OPEN_PROPS, META_TUPLE extends TupleType, SERIALIZABLE_META_TYPE extends SerializableType> = $Tuple<VALUES, OPEN_PROPS, IntersectIsSerialized<META_TUPLE, SERIALIZABLE_META_TYPE>, IntersectDeserialized<META_TUPLE, SERIALIZABLE_META_TYPE>>;
export declare type IntersectTuple<META_TUPLE extends TupleType, META_TYPE> = META_TYPE extends NeverType ? META_TYPE : META_TYPE extends AnyType ? IntersectTupleSerializationParams<TupleValues<META_TUPLE>, TupleOpenProps<META_TUPLE>, META_TUPLE, META_TYPE> : META_TYPE extends ConstType ? IntersectConstToTuple<META_TYPE, META_TUPLE> : META_TYPE extends EnumType ? IntersectEnumToTuple<META_TYPE, META_TUPLE> : META_TYPE extends PrimitiveType ? Never : META_TYPE extends ArrayType ? IntersectTupleToArray<META_TUPLE, META_TYPE> : META_TYPE extends TupleType ? IntersectTuples<META_TUPLE, META_TYPE> : META_TYPE extends ObjectType ? Never : META_TYPE extends UnionType ? DistributeIntersection<META_TYPE, META_TUPLE> : Never;
export declare type IntersectTupleToArray<META_TUPLE extends TupleType, META_ARRAY extends ArrayType, INTERSECTED_VALUES extends unknown[] = IntersectTupleToArrayValues<TupleValues<META_TUPLE>, ArrayValues<META_ARRAY>>, INTERSECTED_OPEN_PROPS = $Intersect<TupleOpenProps<META_TUPLE>, ArrayValues<META_ARRAY>>> = $MergeTuplePropsToSerializable<INTERSECTED_VALUES, INTERSECTED_OPEN_PROPS, META_TUPLE, META_ARRAY>;
declare type IntersectTupleToArrayValues<TUPLE_VALUES extends Type[], ARRAY_VALUES extends Type, RESULT extends unknown[] = []> = TUPLE_VALUES extends [infer TUPLE_VALUES_HEAD, ...infer TUPLE_VALUES_TAIL] ? TUPLE_VALUES_HEAD extends Type ? TUPLE_VALUES_TAIL extends Type[] ? IntersectTupleToArrayValues<TUPLE_VALUES_TAIL, ARRAY_VALUES, [
    ...RESULT,
    Intersect<TUPLE_VALUES_HEAD, ARRAY_VALUES>
]> : never : never : RESULT;
declare type IntersectTuples<META_TUPLE_A extends TupleType, META_TUPLE_B extends TupleType, INTERSECTED_VALUES extends unknown[] = IntersectTupleValues<TupleValues<META_TUPLE_A>, TupleValues<META_TUPLE_B>, IsTupleOpen<META_TUPLE_A>, IsTupleOpen<META_TUPLE_B>, TupleOpenProps<META_TUPLE_A>, TupleOpenProps<META_TUPLE_B>>, INTERSECTED_OPEN_PROPS = $Intersect<TupleOpenProps<META_TUPLE_A>, TupleOpenProps<META_TUPLE_B>>> = $MergeTuplePropsToSerializable<INTERSECTED_VALUES, INTERSECTED_OPEN_PROPS, META_TUPLE_A, META_TUPLE_B>;
declare type IntersectTupleValues<TUPLE_A_VALUES extends Type[], TUPLE_B_VALUES extends Type[], TUPLE_A_IS_OPEN extends boolean, TUPLE_B_IS_OPEN extends boolean, TUPLE_A_OPEN_PROPS extends Type, TUPLE_B_OPEN_PROPS extends Type, RESULT extends unknown[] = []> = TUPLE_A_VALUES extends [
    infer TUPLE_A_VALUES_HEAD,
    ...infer TUPLE_A_VALUES_TAIL
] ? TUPLE_A_VALUES_HEAD extends Type ? TUPLE_A_VALUES_TAIL extends Type[] ? TUPLE_B_VALUES extends [
    infer TUPLE_B_VALUES_HEAD,
    ...infer TUPLE_B_VALUES_TAIL
] ? TUPLE_B_VALUES_HEAD extends Type ? TUPLE_B_VALUES_TAIL extends Type[] ? IntersectTupleValues<TUPLE_A_VALUES_TAIL, TUPLE_B_VALUES_TAIL, TUPLE_A_IS_OPEN, TUPLE_B_IS_OPEN, TUPLE_A_OPEN_PROPS, TUPLE_B_OPEN_PROPS, [
    ...RESULT,
    Intersect<TUPLE_A_VALUES_HEAD, TUPLE_B_VALUES_HEAD>
]> : never : never : IntersectTupleValues<TUPLE_A_VALUES_TAIL, TUPLE_B_VALUES, TUPLE_A_IS_OPEN, TUPLE_B_IS_OPEN, TUPLE_A_OPEN_PROPS, TUPLE_B_OPEN_PROPS, [
    ...RESULT,
    TUPLE_B_IS_OPEN extends true ? Intersect<TUPLE_A_VALUES_HEAD, TUPLE_B_OPEN_PROPS> : Never
]> : never : never : TUPLE_B_VALUES extends [
    infer TUPLE_B_VALUES_HEAD,
    ...infer TUPLE_B_VALUES_TAIL
] ? TUPLE_B_VALUES_HEAD extends Type ? TUPLE_B_VALUES_TAIL extends Type[] ? IntersectTupleValues<TUPLE_A_VALUES, TUPLE_B_VALUES_TAIL, TUPLE_A_IS_OPEN, TUPLE_B_IS_OPEN, TUPLE_A_OPEN_PROPS, TUPLE_B_OPEN_PROPS, [
    ...RESULT,
    TUPLE_A_IS_OPEN extends true ? Intersect<TUPLE_B_VALUES_HEAD, TUPLE_A_OPEN_PROPS> : Never
]> : never : never : RESULT;
export {};
