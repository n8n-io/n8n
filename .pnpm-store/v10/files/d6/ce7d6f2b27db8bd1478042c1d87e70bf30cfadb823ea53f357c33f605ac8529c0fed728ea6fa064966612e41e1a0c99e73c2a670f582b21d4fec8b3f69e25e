"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubjectTopoligicalSorter = void 0;
const error_1 = require("../error");
/**
 * Orders insert or remove subjects in proper order (using topological sorting)
 * to make sure insert or remove operations are executed in a proper order.
 */
class SubjectTopoligicalSorter {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(subjects) {
        this.subjects = [...subjects]; // copy subjects to prevent changing of sent array
        this.metadatas = this.getUniqueMetadatas(this.subjects);
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Sorts (orders) subjects in their topological order.
     */
    sort(direction) {
        // if there are no metadatas it probably mean there is no subjects... we don't have to do anything here
        if (!this.metadatas.length)
            return this.subjects;
        const sortedSubjects = [];
        // first if we sort for deletion all junction subjects
        // junction subjects are subjects without entity and database entity set
        if (direction === "delete") {
            const junctionSubjects = this.subjects.filter((subject) => !subject.entity && !subject.databaseEntity);
            sortedSubjects.push(...junctionSubjects);
            this.removeAlreadySorted(junctionSubjects);
        }
        // next we always insert entities with non-nullable relations, sort them first
        const nonNullableDependencies = this.getNonNullableDependencies();
        let sortedNonNullableEntityTargets = this.toposort(nonNullableDependencies);
        if (direction === "insert")
            sortedNonNullableEntityTargets =
                sortedNonNullableEntityTargets.reverse();
        // so we have a sorted entity targets
        // go thought each of them and find all subjects with sorted entity target
        // add those sorted targets and remove them from original array of targets
        sortedNonNullableEntityTargets.forEach((sortedEntityTarget) => {
            const entityTargetSubjects = this.subjects.filter((subject) => subject.metadata.targetName === sortedEntityTarget ||
                subject.metadata.inheritanceTree.some((s) => s.name === sortedEntityTarget));
            sortedSubjects.push(...entityTargetSubjects);
            this.removeAlreadySorted(entityTargetSubjects);
        });
        // next sort all other entities
        // same process as in above but with other entities
        const otherDependencies = this.getDependencies();
        let sortedOtherEntityTargets = this.toposort(otherDependencies);
        if (direction === "insert")
            sortedOtherEntityTargets = sortedOtherEntityTargets.reverse();
        sortedOtherEntityTargets.forEach((sortedEntityTarget) => {
            const entityTargetSubjects = this.subjects.filter((subject) => subject.metadata.targetName === sortedEntityTarget);
            sortedSubjects.push(...entityTargetSubjects);
            this.removeAlreadySorted(entityTargetSubjects);
        });
        // if we have something left in the subjects add them as well
        sortedSubjects.push(...this.subjects);
        return sortedSubjects;
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Removes already sorted subjects from this.subjects list of subjects.
     */
    removeAlreadySorted(subjects) {
        subjects.forEach((subject) => {
            this.subjects.splice(this.subjects.indexOf(subject), 1);
        });
    }
    /**
     * Extracts all unique metadatas from the given subjects.
     */
    getUniqueMetadatas(subjects) {
        const metadatas = [];
        subjects.forEach((subject) => {
            if (metadatas.indexOf(subject.metadata) === -1)
                metadatas.push(subject.metadata);
        });
        return metadatas;
    }
    /**
     * Gets dependency tree for all entity metadatas with non-nullable relations.
     * We need to execute insertions first for entities which non-nullable relations.
     */
    getNonNullableDependencies() {
        return this.metadatas.reduce((dependencies, metadata) => {
            metadata.relationsWithJoinColumns.forEach((relation) => {
                if (relation.isNullable)
                    return;
                dependencies.push([
                    metadata.targetName,
                    relation.inverseEntityMetadata.targetName,
                ]);
            });
            return dependencies;
        }, []);
    }
    /**
     * Gets dependency tree for all entity metadatas with non-nullable relations.
     * We need to execute insertions first for entities which non-nullable relations.
     */
    getDependencies() {
        return this.metadatas.reduce((dependencies, metadata) => {
            metadata.relationsWithJoinColumns.forEach((relation) => {
                // if relation is self-referenced we skip it
                if (relation.inverseEntityMetadata === metadata)
                    return;
                dependencies.push([
                    metadata.targetName,
                    relation.inverseEntityMetadata.targetName,
                ]);
            });
            return dependencies;
        }, []);
    }
    /**
     * Sorts given graph using topological sorting algorithm.
     *
     * Algorithm is kindly taken from https://github.com/marcelklehr/toposort repository.
     */
    toposort(edges) {
        function uniqueNodes(arr) {
            let res = [];
            for (let i = 0, len = arr.length; i < len; i++) {
                let edge = arr[i];
                if (res.indexOf(edge[0]) < 0)
                    res.push(edge[0]);
                if (res.indexOf(edge[1]) < 0)
                    res.push(edge[1]);
            }
            return res;
        }
        const nodes = uniqueNodes(edges);
        let cursor = nodes.length, sorted = new Array(cursor), visited = {}, i = cursor;
        while (i--) {
            if (!visited[i])
                visit(nodes[i], i, []);
        }
        function visit(node, i, predecessors) {
            if (predecessors.indexOf(node) >= 0) {
                throw new error_1.TypeORMError("Cyclic dependency: " + JSON.stringify(node)); // todo: better error
            }
            if (!~nodes.indexOf(node)) {
                throw new error_1.TypeORMError("Found unknown node. Make sure to provided all involved nodes. Unknown node: " +
                    JSON.stringify(node));
            }
            if (visited[i])
                return;
            visited[i] = true;
            // outgoing edges
            let outgoing = edges.filter(function (edge) {
                return edge[0] === node;
            });
            if ((i = outgoing.length)) {
                let preds = predecessors.concat(node);
                do {
                    let child = outgoing[--i][1];
                    visit(child, nodes.indexOf(child), preds);
                } while (i);
            }
            sorted[--cursor] = node;
        }
        return sorted;
    }
}
exports.SubjectTopoligicalSorter = SubjectTopoligicalSorter;

//# sourceMappingURL=SubjectTopoligicalSorter.js.map
