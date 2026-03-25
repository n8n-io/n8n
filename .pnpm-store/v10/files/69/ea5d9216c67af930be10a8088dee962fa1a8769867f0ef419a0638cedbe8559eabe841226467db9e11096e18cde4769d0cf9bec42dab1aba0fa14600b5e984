import type { AnyType } from "./any";
import type { ArrayType } from "./array";
import type { ConstType } from "./const";
import type { EnumType } from "./enum";
import type { NeverType } from "./never";
import type { ObjectType } from "./object";
import type { PrimitiveType } from "./primitive";
import type { TupleType } from "./tuple";
import type { UnionType } from "./union";
export declare type Type = NeverType | AnyType | ConstType | EnumType | PrimitiveType | ArrayType | TupleType | ObjectType | UnionType;
export declare type SerializableType = Type extends infer META_TYPE ? META_TYPE extends {
    isSerialized: boolean;
    deserialized: unknown;
} ? META_TYPE : never : never;
