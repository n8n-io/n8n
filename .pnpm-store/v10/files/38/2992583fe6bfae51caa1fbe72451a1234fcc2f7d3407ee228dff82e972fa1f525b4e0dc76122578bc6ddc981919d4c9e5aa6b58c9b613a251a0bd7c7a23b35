import { inferParsedObject, inferRawObject, ObjectSchema } from "../object";
import { Discriminant } from "./discriminant";
export declare type UnionSubtypes<DiscriminantValues extends string | number | symbol> = {
    [K in DiscriminantValues]: ObjectSchema<any, any>;
};
export declare type inferRawUnion<D extends string | Discriminant<any, any>, U extends UnionSubtypes<keyof U>> = {
    [K in keyof U]: Record<inferRawDiscriminant<D>, K> & inferRawObject<U[K]>;
}[keyof U];
export declare type inferParsedUnion<D extends string | Discriminant<any, any>, U extends UnionSubtypes<keyof U>> = {
    [K in keyof U]: Record<inferParsedDiscriminant<D>, K> & inferParsedObject<U[K]>;
}[keyof U];
export declare type inferRawDiscriminant<D extends string | Discriminant<any, any>> = D extends string ? D : D extends Discriminant<infer Raw, any> ? Raw : never;
export declare type inferParsedDiscriminant<D extends string | Discriminant<any, any>> = D extends string ? D : D extends Discriminant<any, infer Parsed> ? Parsed : never;
