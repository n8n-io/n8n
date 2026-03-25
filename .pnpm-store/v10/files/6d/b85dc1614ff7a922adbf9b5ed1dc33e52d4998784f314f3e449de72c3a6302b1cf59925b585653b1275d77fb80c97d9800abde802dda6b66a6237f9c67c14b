/**
 * Metadata args utility functions.
 */
export declare class MetadataUtils {
    /**
     * Gets given's entity all inherited classes.
     * Gives in order from parents to children.
     * For example Post extends ContentModel which extends Unit it will give
     * [Unit, ContentModel, Post]
     */
    static getInheritanceTree(entity: Function): Function[];
    /**
     * Checks if this table is inherited from another table.
     */
    static isInherited(target1: Function, target2: Function): boolean;
    /**
     * Filters given array of targets by a given classes.
     * If classes are not given, then it returns array itself.
     */
    static filterByTarget<T extends {
        target?: any;
    }>(array: T[], classes?: any[]): T[];
}
