"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataUtils = void 0;
/**
 * Metadata args utility functions.
 */
class MetadataUtils {
    /**
     * Gets given's entity all inherited classes.
     * Gives in order from parents to children.
     * For example Post extends ContentModel which extends Unit it will give
     * [Unit, ContentModel, Post]
     */
    static getInheritanceTree(entity) {
        const tree = [entity];
        const getPrototypeOf = (object) => {
            const proto = Object.getPrototypeOf(object);
            if (proto && proto.name) {
                tree.push(proto);
                getPrototypeOf(proto);
            }
        };
        getPrototypeOf(entity);
        return tree;
    }
    /**
     * Checks if this table is inherited from another table.
     */
    static isInherited(target1, target2) {
        return target1.prototype instanceof target2;
    }
    /**
     * Filters given array of targets by a given classes.
     * If classes are not given, then it returns array itself.
     */
    static filterByTarget(array, classes) {
        if (!classes)
            return array;
        return array.filter((item) => item.target && classes.indexOf(item.target) !== -1);
    }
}
exports.MetadataUtils = MetadataUtils;

//# sourceMappingURL=MetadataUtils.js.map
