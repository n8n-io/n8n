import type { And, DeepMergeUnsafe, DoesExtend, If, IsNever, Not } from "../utils";
import type { Any } from "./any";
import type { Never, NeverType } from "./never";
import type { Resolve, ResolveOptions } from "./resolve";
import type { Type } from "./type";
import type { Deserialized, IsSerialized } from "./utils";
export declare type ObjectTypeId = "object";
export declare type _Object<VALUES extends Record<string, Type> = {}, REQUIRED_KEYS extends string = never, OPEN_PROPS extends Type = Never, CLOSE_ON_RESOLVE extends boolean = false, IS_SERIALIZED extends boolean = false, DESERIALIZED = never> = _$Object<VALUES, REQUIRED_KEYS, OPEN_PROPS, CLOSE_ON_RESOLVE, IS_SERIALIZED, DESERIALIZED>;
export declare type _$Object<VALUES = {}, REQUIRED_KEYS = never, OPEN_PROPS = Never, CLOSE_ON_RESOLVE = false, IS_SERIALIZED = false, DESERIALIZED = never> = DoesExtend<true, {
    [KEY in Extract<REQUIRED_KEYS, string>]: KEY extends keyof VALUES ? DoesExtend<VALUES[KEY], NeverType> : DoesExtend<OPEN_PROPS, NeverType>;
}[Extract<REQUIRED_KEYS, string>]> extends true ? Never : {
    type: ObjectTypeId;
    values: VALUES;
    required: REQUIRED_KEYS;
    isOpen: Not<DoesExtend<OPEN_PROPS, NeverType>>;
    openProps: OPEN_PROPS;
    closeOnResolve: CLOSE_ON_RESOLVE;
    isSerialized: IS_SERIALIZED;
    deserialized: DESERIALIZED;
};
export declare type ObjectType = {
    type: ObjectTypeId;
    values: Record<string, Type>;
    required: string;
    isOpen: boolean;
    openProps: Type;
    closeOnResolve: boolean;
    isSerialized: boolean;
    deserialized: unknown;
};
export declare type ObjectValues<META_OBJECT extends ObjectType> = META_OBJECT["values"];
export declare type ObjectValue<META_OBJECT extends ObjectType, KEY extends string> = KEY extends keyof ObjectValues<META_OBJECT> ? ObjectValues<META_OBJECT>[KEY] : IsObjectOpen<META_OBJECT> extends true ? ObjectOpenProps<META_OBJECT> : Never;
export declare type ObjectRequiredKeys<META_OBJECT extends ObjectType> = META_OBJECT["required"];
export declare type IsObjectOpen<META_OBJECT extends ObjectType> = META_OBJECT["isOpen"];
export declare type ObjectOpenProps<META_OBJECT extends ObjectType> = META_OBJECT["openProps"];
export declare type IsObjectClosedOnResolve<META_OBJECT extends ObjectType> = META_OBJECT["closeOnResolve"];
declare type IsObjectEmpty<META_OBJECT extends ObjectType> = IsNever<keyof ObjectValues<META_OBJECT>>;
export declare type ResolveObject<META_OBJECT extends ObjectType, OPTIONS extends ResolveOptions> = If<And<OPTIONS["deserialize"], IsSerialized<META_OBJECT>>, Deserialized<META_OBJECT>, DeepMergeUnsafe<If<And<IsObjectOpen<META_OBJECT>, Not<IsObjectClosedOnResolve<META_OBJECT>>>, If<IsObjectEmpty<META_OBJECT>, {
    [KEY: string]: Resolve<ObjectOpenProps<META_OBJECT>, OPTIONS>;
}, {
    [KEY: string]: Resolve<Any, OPTIONS>;
}>, {}>, DeepMergeUnsafe<{
    [KEY in Exclude<keyof ObjectValues<META_OBJECT>, ObjectRequiredKeys<META_OBJECT>>]?: Resolve<ObjectValues<META_OBJECT>[KEY], OPTIONS>;
}, {
    [KEY in ObjectRequiredKeys<META_OBJECT>]: KEY extends keyof ObjectValues<META_OBJECT> ? Resolve<ObjectValues<META_OBJECT>[KEY], OPTIONS> : Resolve<Any, OPTIONS>;
}>>>;
export {};
