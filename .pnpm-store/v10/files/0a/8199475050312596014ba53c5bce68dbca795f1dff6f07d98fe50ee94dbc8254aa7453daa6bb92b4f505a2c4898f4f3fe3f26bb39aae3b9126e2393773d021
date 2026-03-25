import type { If, IsNever, IsObject } from "../../utils";
import type { AnyType } from "../any";
import type { ArrayType } from "../array";
import type { Const, ConstType, ConstValue } from "../const";
import type { EnumType } from "../enum";
import type { Never, NeverType } from "../never";
import type { IsObjectOpen, ObjectOpenProps, ObjectRequiredKeys, ObjectType, ObjectValues } from "../object";
import type { PrimitiveType } from "../primitive";
import type { Resolve } from "../resolve";
import type { TupleType } from "../tuple";
import type { Type } from "../type";
import type { UnionType } from "../union";
import type { _Exclude } from "./index";
import type { ExcludeUnion } from "./union";
export declare type ExcludeFromConst<META_CONST extends ConstType, META_TYPE> = META_TYPE extends Type ? META_TYPE extends NeverType ? META_CONST : META_TYPE extends AnyType ? Never : META_TYPE extends ConstType ? CheckNotExtendsResolved<META_CONST, META_TYPE> : META_TYPE extends EnumType ? CheckNotExtendsResolved<META_CONST, META_TYPE> : META_TYPE extends PrimitiveType ? CheckNotExtendsResolved<META_CONST, META_TYPE> : META_TYPE extends ArrayType ? CheckNotExtendsResolved<META_CONST, META_TYPE> : META_TYPE extends TupleType ? CheckNotExtendsResolved<META_CONST, META_TYPE> : META_TYPE extends ObjectType ? ExcludeObject<META_CONST, META_TYPE> : META_TYPE extends UnionType ? ExcludeUnion<META_CONST, META_TYPE> : Never : Never;
declare type CheckNotExtendsResolved<META_CONST extends ConstType, META_TYPE extends Type> = ConstValue<META_CONST> extends Resolve<META_TYPE, {
    deserialize: false;
}> ? Never : META_CONST;
declare type ExcludeObject<META_CONST extends ConstType, META_OBJECT extends ObjectType> = If<IsObject<ConstValue<META_CONST>>, ObjectRequiredKeys<META_OBJECT> extends keyof ConstValue<META_CONST> ? ExcludeObjectFromConst<META_CONST, META_OBJECT> : META_CONST, META_CONST>;
declare type ExcludeObjectFromConst<META_CONST extends ConstType, META_OBJECT extends ObjectType, EXCLUDED_CONST_VALUES = ExcludeConstValues<ConstValue<META_CONST>, META_OBJECT>> = If<IsNever<RepresentableKeys<EXCLUDED_CONST_VALUES>>, Never, META_CONST>;
declare type ExcludeConstValues<VALUE, META_OBJECT extends ObjectType> = {
    [KEY in keyof VALUE]: KEY extends keyof ObjectValues<META_OBJECT> ? _Exclude<Const<VALUE[KEY]>, ObjectValues<META_OBJECT>[KEY]> : IsObjectOpen<META_OBJECT> extends true ? _Exclude<Const<VALUE[KEY]>, ObjectOpenProps<META_OBJECT>> : Const<VALUE[KEY]>;
};
declare type RepresentableKeys<VALUES> = {
    [KEY in keyof VALUES]: VALUES[KEY] extends Never ? never : KEY;
}[keyof VALUES];
export {};
