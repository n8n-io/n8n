import type { If, Or } from "../../utils";
import type { SerializableType } from "../type";
import type { Deserialized, IsSerialized } from "../utils";
export declare type IntersectIsSerialized<SERIALIZABLE_META_TYPE_A extends SerializableType, SERIALIZABLE_META_TYPE_B extends SerializableType> = Or<IsSerialized<SERIALIZABLE_META_TYPE_A>, IsSerialized<SERIALIZABLE_META_TYPE_B>>;
export declare type IntersectDeserialized<SERIALIZABLE_META_TYPE_A extends SerializableType, SERIALIZABLE_META_TYPE_B extends SerializableType> = If<IsSerialized<SERIALIZABLE_META_TYPE_A>, If<IsSerialized<SERIALIZABLE_META_TYPE_B>, Deserialized<SERIALIZABLE_META_TYPE_A> & Deserialized<SERIALIZABLE_META_TYPE_B>, Deserialized<SERIALIZABLE_META_TYPE_A>>, If<IsSerialized<SERIALIZABLE_META_TYPE_B>, Deserialized<SERIALIZABLE_META_TYPE_B>>>;
