import { QueryBuilder } from "./QueryBuilder";
import { ObjectLiteral } from "../common/ObjectLiteral";
/**
 * Allows to work with entity relations and perform specific operations with those relations.
 *
 * todo: add transactions everywhere
 */
export declare class RelationQueryBuilder<Entity extends ObjectLiteral> extends QueryBuilder<Entity> {
    readonly "@instanceof": symbol;
    /**
     * Gets generated SQL query without parameters being replaced.
     */
    getQuery(): string;
    /**
     * Sets entity (target) which relations will be updated.
     */
    of(entity: any | any[]): this;
    /**
     * Sets entity relation's value.
     * Value can be entity, entity id or entity id map (if entity has composite ids).
     * Works only for many-to-one and one-to-one relations.
     * For many-to-many and one-to-many relations use #add and #remove methods instead.
     */
    set(value: any): Promise<void>;
    /**
     * Adds (binds) given value to entity relation.
     * Value can be entity, entity id or entity id map (if entity has composite ids).
     * Value also can be array of entities, array of entity ids or array of entity id maps (if entity has composite ids).
     * Works only for many-to-many and one-to-many relations.
     * For many-to-one and one-to-one use #set method instead.
     */
    add(value: any | any[]): Promise<void>;
    /**
     * Removes (unbinds) given value from entity relation.
     * Value can be entity, entity id or entity id map (if entity has composite ids).
     * Value also can be array of entities, array of entity ids or array of entity id maps (if entity has composite ids).
     * Works only for many-to-many and one-to-many relations.
     * For many-to-one and one-to-one use #set method instead.
     */
    remove(value: any | any[]): Promise<void>;
    /**
     * Adds (binds) and removes (unbinds) given values to/from entity relation.
     * Value can be entity, entity id or entity id map (if entity has composite ids).
     * Value also can be array of entities, array of entity ids or array of entity id maps (if entity has composite ids).
     * Works only for many-to-many and one-to-many relations.
     * For many-to-one and one-to-one use #set method instead.
     */
    addAndRemove(added: any | any[], removed: any | any[]): Promise<void>;
    /**
     * Gets entity's relation id.
    async getId(): Promise<any> {

    }*/
    /**
     * Gets entity's relation ids.
    async getIds(): Promise<any[]> {
        return [];
    }*/
    /**
     * Loads a single entity (relational) from the relation.
     * You can also provide id of relational entity to filter by.
     */
    loadOne<T = any>(): Promise<T | undefined>;
    /**
     * Loads many entities (relational) from the relation.
     * You can also provide ids of relational entities to filter by.
     */
    loadMany<T = any>(): Promise<T[]>;
}
