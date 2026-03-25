import type { And, DoesExtend, If, Not } from "../utils";
import type { Never, NeverType } from "./never";
import type { Resolve, ResolveOptions } from "./resolve";
import type { Type } from "./type";
import type { Deserialized, IsSerialized } from "./utils";
export declare type TupleTypeId = "tuple";
export declare type Tuple<VALUES extends Type[], OPEN_PROPS extends Type = Never, IS_SERIALIZED extends boolean = false, DESERIALIZED = never> = $Tuple<VALUES, OPEN_PROPS, IS_SERIALIZED, DESERIALIZED>;
export declare type $Tuple<VALUES, OPEN_PROPS = Never, IS_SERIALIZED = false, DESERIALIZED = never> = IsAnyValueNever<VALUES> extends true ? Never : {
    type: TupleTypeId;
    values: VALUES;
    isOpen: Not<DoesExtend<OPEN_PROPS, NeverType>>;
    openProps: OPEN_PROPS;
    isSerialized: IS_SERIALIZED;
    deserialized: DESERIALIZED;
};
declare type IsAnyValueNever<TUPLE> = TUPLE extends [
    infer TUPLE_HEAD,
    ...infer TUPLE_TAIL
] ? TUPLE_HEAD extends NeverType ? true : IsAnyValueNever<TUPLE_TAIL> : false;
export declare type TupleType = {
    type: TupleTypeId;
    values: Type[];
    isOpen: boolean;
    openProps: Type;
    isSerialized: boolean;
    deserialized: unknown;
};
export declare type TupleValues<META_TUPLE extends TupleType> = META_TUPLE["values"];
export declare type IsTupleOpen<META_TUPLE extends TupleType> = META_TUPLE["isOpen"];
export declare type TupleOpenProps<META_TUPLE extends TupleType> = META_TUPLE["openProps"];
export declare type ResolveTuple<META_TUPLE extends TupleType, OPTIONS extends ResolveOptions> = If<And<OPTIONS["deserialize"], IsSerialized<META_TUPLE>>, Deserialized<META_TUPLE>, If<IsTupleOpen<META_TUPLE>, [
    ...RecurseOnTuple<TupleValues<META_TUPLE>, OPTIONS>,
    ...Resolve<TupleOpenProps<META_TUPLE>, OPTIONS>[]
], RecurseOnTuple<TupleValues<META_TUPLE>, OPTIONS>>>;
declare type RecurseOnTuple<VALUES extends Type[], OPTIONS extends ResolveOptions, RESULT extends unknown[] = []> = VALUES extends [infer VALUES_HEAD, ...infer VALUES_TAIL] ? VALUES_HEAD extends Type ? VALUES_TAIL extends Type[] ? RecurseOnTuple<VALUES_TAIL, OPTIONS, [
    ...RESULT,
    Resolve<VALUES_HEAD, OPTIONS>
]> : never : never : RESULT;
export {};
