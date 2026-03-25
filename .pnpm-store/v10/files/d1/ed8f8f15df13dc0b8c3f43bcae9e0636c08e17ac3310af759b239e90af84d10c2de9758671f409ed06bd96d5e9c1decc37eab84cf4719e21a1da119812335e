import Reference from '../Reference';
export default class ReferenceSet {
    list: Set<unknown>;
    refs: Map<string, Reference>;
    constructor();
    get size(): number;
    describe(): unknown[];
    toArray(): unknown[];
    resolveAll(resolve: (v: unknown) => unknown): unknown[];
    add(value: unknown): void;
    delete(value: unknown): void;
    clone(): ReferenceSet;
    merge(newItems: ReferenceSet, removeItems: ReferenceSet): ReferenceSet;
}
