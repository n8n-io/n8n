import { ObjectLikeSchema } from "../object-like";
import { Discriminant } from "./discriminant";
import { inferParsedUnion, inferRawUnion, UnionSubtypes } from "./types";
export declare function union<D extends string | Discriminant<any, any>, U extends UnionSubtypes<any>>(discriminant: D, union: U): ObjectLikeSchema<inferRawUnion<D, U>, inferParsedUnion<D, U>>;
