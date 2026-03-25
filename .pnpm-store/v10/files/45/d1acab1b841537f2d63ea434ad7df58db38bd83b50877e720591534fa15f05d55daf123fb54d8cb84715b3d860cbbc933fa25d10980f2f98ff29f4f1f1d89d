"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataArgsStorage = void 0;
const MetadataUtils_1 = require("../metadata-builder/MetadataUtils");
/**
 * Storage all metadatas args of all available types: tables, columns, subscribers, relations, etc.
 * Each metadata args represents some specifications of what it represents.
 * MetadataArgs used to create a real Metadata objects.
 */
class MetadataArgsStorage {
    constructor() {
        // -------------------------------------------------------------------------
        // Properties
        // -------------------------------------------------------------------------
        this.tables = [];
        this.trees = [];
        this.entityRepositories = [];
        this.transactionEntityManagers = [];
        this.transactionRepositories = [];
        this.namingStrategies = [];
        this.entitySubscribers = [];
        this.indices = [];
        this.uniques = [];
        this.checks = [];
        this.exclusions = [];
        this.columns = [];
        this.generations = [];
        this.relations = [];
        this.joinColumns = [];
        this.joinTables = [];
        this.entityListeners = [];
        this.relationCounts = [];
        this.relationIds = [];
        this.embeddeds = [];
        this.inheritances = [];
        this.discriminatorValues = [];
    }
    filterTables(target) {
        return this.filterByTarget(this.tables, target);
    }
    filterColumns(target) {
        return this.filterByTargetAndWithoutDuplicateProperties(this.columns, target);
    }
    findGenerated(target, propertyName) {
        return this.generations.find((generated) => {
            return ((Array.isArray(target)
                ? target.indexOf(generated.target) !== -1
                : generated.target === target) &&
                generated.propertyName === propertyName);
        });
    }
    findTree(target) {
        return this.trees.find((tree) => {
            return Array.isArray(target)
                ? target.indexOf(tree.target) !== -1
                : tree.target === target;
        });
    }
    filterRelations(target) {
        return this.filterByTargetAndWithoutDuplicateRelationProperties(this.relations, target);
    }
    filterRelationIds(target) {
        return this.filterByTargetAndWithoutDuplicateProperties(this.relationIds, target);
    }
    filterRelationCounts(target) {
        return this.filterByTargetAndWithoutDuplicateProperties(this.relationCounts, target);
    }
    filterIndices(target) {
        // todo: implement parent-entity overrides?
        return this.indices.filter((index) => {
            return Array.isArray(target)
                ? target.indexOf(index.target) !== -1
                : index.target === target;
        });
    }
    filterUniques(target) {
        return this.uniques.filter((unique) => {
            return Array.isArray(target)
                ? target.indexOf(unique.target) !== -1
                : unique.target === target;
        });
    }
    filterChecks(target) {
        return this.checks.filter((check) => {
            return Array.isArray(target)
                ? target.indexOf(check.target) !== -1
                : check.target === target;
        });
    }
    filterExclusions(target) {
        return this.exclusions.filter((exclusion) => {
            return Array.isArray(target)
                ? target.indexOf(exclusion.target) !== -1
                : exclusion.target === target;
        });
    }
    filterListeners(target) {
        return this.filterByTarget(this.entityListeners, target);
    }
    filterEmbeddeds(target) {
        return this.filterByTargetAndWithoutDuplicateEmbeddedProperties(this.embeddeds, target);
    }
    findJoinTable(target, propertyName) {
        return this.joinTables.find((joinTable) => {
            return (joinTable.target === target &&
                joinTable.propertyName === propertyName);
        });
    }
    filterJoinColumns(target, propertyName) {
        // todo: implement parent-entity overrides?
        return this.joinColumns.filter((joinColumn) => {
            return (joinColumn.target === target &&
                joinColumn.propertyName === propertyName);
        });
    }
    filterSubscribers(target) {
        return this.filterByTarget(this.entitySubscribers, target);
    }
    filterNamingStrategies(target) {
        return this.filterByTarget(this.namingStrategies, target);
    }
    filterTransactionEntityManagers(target, propertyName) {
        return this.transactionEntityManagers.filter((transactionEm) => {
            return ((Array.isArray(target)
                ? target.indexOf(transactionEm.target) !== -1
                : transactionEm.target === target) &&
                transactionEm.methodName === propertyName);
        });
    }
    filterTransactionRepository(target, propertyName) {
        return this.transactionRepositories.filter((transactionEm) => {
            return ((Array.isArray(target)
                ? target.indexOf(transactionEm.target) !== -1
                : transactionEm.target === target) &&
                transactionEm.methodName === propertyName);
        });
    }
    filterSingleTableChildren(target) {
        return this.tables.filter((table) => {
            return (typeof table.target === "function" &&
                typeof target === "function" &&
                MetadataUtils_1.MetadataUtils.isInherited(table.target, target) &&
                table.type === "entity-child");
        });
    }
    findInheritanceType(target) {
        return this.inheritances.find((inheritance) => inheritance.target === target);
    }
    findDiscriminatorValue(target) {
        return this.discriminatorValues.find((discriminatorValue) => discriminatorValue.target === target);
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Filters given array by a given target or targets.
     */
    filterByTarget(array, target) {
        return array.filter((table) => {
            return Array.isArray(target)
                ? target.indexOf(table.target) !== -1
                : table.target === target;
        });
    }
    /**
     * Filters given array by a given target or targets and prevents duplicate property names.
     */
    filterByTargetAndWithoutDuplicateProperties(array, target) {
        const newArray = [];
        array.forEach((item) => {
            const sameTarget = Array.isArray(target)
                ? target.indexOf(item.target) !== -1
                : item.target === target;
            if (sameTarget) {
                if (!newArray.find((newItem) => newItem.propertyName === item.propertyName))
                    newArray.push(item);
            }
        });
        return newArray;
    }
    /**
     * Filters given array by a given target or targets and prevents duplicate relation property names.
     */
    filterByTargetAndWithoutDuplicateRelationProperties(array, target) {
        const newArray = [];
        array.forEach((item) => {
            const sameTarget = Array.isArray(target)
                ? target.indexOf(item.target) !== -1
                : item.target === target;
            if (sameTarget) {
                const existingIndex = newArray.findIndex((newItem) => newItem.propertyName === item.propertyName);
                if (Array.isArray(target) &&
                    existingIndex !== -1 &&
                    target.indexOf(item.target) <
                        target.indexOf(newArray[existingIndex].target)) {
                    const clone = Object.create(newArray[existingIndex]);
                    clone.type = item.type;
                    newArray[existingIndex] = clone;
                }
                else if (existingIndex === -1) {
                    newArray.push(item);
                }
            }
        });
        return newArray;
    }
    /**
     * Filters given array by a given target or targets and prevents duplicate embedded property names.
     */
    filterByTargetAndWithoutDuplicateEmbeddedProperties(array, target) {
        const newArray = [];
        array.forEach((item) => {
            const sameTarget = Array.isArray(target)
                ? target.indexOf(item.target) !== -1
                : item.target === target;
            if (sameTarget) {
                const isDuplicateEmbeddedProperty = newArray.find((newItem) => newItem.prefix === item.prefix &&
                    newItem.propertyName === item.propertyName);
                if (!isDuplicateEmbeddedProperty)
                    newArray.push(item);
            }
        });
        return newArray;
    }
}
exports.MetadataArgsStorage = MetadataArgsStorage;

//# sourceMappingURL=MetadataArgsStorage.js.map
