import { ObjectLiteral } from "../common/ObjectLiteral";
/**
 * Make all properties in T optional
 */
export type QueryPartialEntity<T> = {
    [P in keyof T]?: T[P] | (() => string);
};
/**
 * Make all properties in T optional. Deep version.
 */
export type QueryDeepPartialEntity<T> = _QueryDeepPartialEntity<ObjectLiteral extends T ? unknown : T, never>;
type _QueryDeepPartialEntity<Entity, Seen = never> = {
    [Property in keyof Entity]?: (Entity[Property] extends Seen ? Entity[Property] : Entity[Property] extends Array<infer ArrayItem> ? Array<_QueryDeepPartialEntity<ArrayItem, Seen | Entity[Property]>> : Entity[Property] extends ReadonlyArray<infer ArrayItem> ? ReadonlyArray<_QueryDeepPartialEntity<ArrayItem, Seen | Entity[Property]>> : _QueryDeepPartialEntity<Entity[Property], Seen | Entity[Property]>) | (() => string);
};
export {};
