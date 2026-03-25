import { Subject } from "./Subject";
import { EntityMetadata } from "../metadata/EntityMetadata";
/**
 * Orders insert or remove subjects in proper order (using topological sorting)
 * to make sure insert or remove operations are executed in a proper order.
 */
export declare class SubjectTopoligicalSorter {
    /**
     * Insert subjects needs to be sorted.
     */
    subjects: Subject[];
    /**
     * Unique list of entity metadatas of this subject.
     */
    metadatas: EntityMetadata[];
    constructor(subjects: Subject[]);
    /**
     * Sorts (orders) subjects in their topological order.
     */
    sort(direction: "insert" | "delete"): Subject[];
    /**
     * Removes already sorted subjects from this.subjects list of subjects.
     */
    protected removeAlreadySorted(subjects: Subject[]): void;
    /**
     * Extracts all unique metadatas from the given subjects.
     */
    protected getUniqueMetadatas(subjects: Subject[]): EntityMetadata[];
    /**
     * Gets dependency tree for all entity metadatas with non-nullable relations.
     * We need to execute insertions first for entities which non-nullable relations.
     */
    protected getNonNullableDependencies(): string[][];
    /**
     * Gets dependency tree for all entity metadatas with non-nullable relations.
     * We need to execute insertions first for entities which non-nullable relations.
     */
    protected getDependencies(): string[][];
    /**
     * Sorts given graph using topological sorting algorithm.
     *
     * Algorithm is kindly taken from https://github.com/marcelklehr/toposort repository.
     */
    protected toposort(edges: any[][]): any[];
}
