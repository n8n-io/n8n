import { ObjectLiteral } from "../common/ObjectLiteral";
import { FindTreeOptions } from "../find-options/FindTreeOptions";
import { SelectQueryBuilder } from "../query-builder/SelectQueryBuilder";
import { Repository } from "./Repository";
/**
 * Repository with additional functions to work with trees.
 *
 * @see Repository
 */
export declare class TreeRepository<Entity extends ObjectLiteral> extends Repository<Entity> {
    /**
     * Gets complete trees for all roots in the table.
     */
    findTrees(options?: FindTreeOptions): Promise<Entity[]>;
    /**
     * Roots are entities that have no ancestors. Finds them all.
     */
    findRoots(options?: FindTreeOptions): Promise<Entity[]>;
    /**
     * Gets all children (descendants) of the given entity. Returns them all in a flat array.
     */
    findDescendants(entity: Entity, options?: FindTreeOptions): Promise<Entity[]>;
    /**
     * Gets all children (descendants) of the given entity. Returns them in a tree - nested into each other.
     */
    findDescendantsTree(entity: Entity, options?: FindTreeOptions): Promise<Entity>;
    /**
     * Gets number of descendants of the entity.
     */
    countDescendants(entity: Entity): Promise<number>;
    /**
     * Creates a query builder used to get descendants of the entities in a tree.
     */
    createDescendantsQueryBuilder(alias: string, closureTableAlias: string, entity: Entity): SelectQueryBuilder<Entity>;
    /**
     * Gets all parents (ancestors) of the given entity. Returns them all in a flat array.
     */
    findAncestors(entity: Entity, options?: FindTreeOptions): Promise<Entity[]>;
    /**
     * Gets all parents (ancestors) of the given entity. Returns them in a tree - nested into each other.
     */
    findAncestorsTree(entity: Entity, options?: FindTreeOptions): Promise<Entity>;
    /**
     * Gets number of ancestors of the entity.
     */
    countAncestors(entity: Entity): Promise<number>;
    /**
     * Creates a query builder used to get ancestors of the entities in the tree.
     */
    createAncestorsQueryBuilder(alias: string, closureTableAlias: string, entity: Entity): SelectQueryBuilder<Entity>;
}
