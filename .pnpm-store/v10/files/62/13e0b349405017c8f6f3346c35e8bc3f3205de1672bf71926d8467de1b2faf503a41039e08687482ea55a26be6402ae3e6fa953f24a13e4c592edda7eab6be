import { GroupedTag, Sheet, SheetOptions } from './types';
type SheetConstructorArgs = {
    isServer?: boolean;
    useCSSOMInjection?: boolean;
    target?: HTMLElement | undefined;
};
type GlobalStylesAllocationMap = {
    [key: string]: number;
};
type NamesAllocationMap = Map<string, Set<string>>;
/** Contains the main stylesheet logic for stringification and caching */
export default class StyleSheet implements Sheet {
    gs: GlobalStylesAllocationMap;
    names: NamesAllocationMap;
    options: SheetOptions;
    server: boolean;
    tag?: GroupedTag | undefined;
    /** Register a group ID to give it an index */
    static registerId(id: string): number;
    constructor(options?: SheetConstructorArgs, globalStyles?: GlobalStylesAllocationMap, names?: NamesAllocationMap | undefined);
    reconstructWithOptions(options: SheetConstructorArgs, withNames?: boolean): StyleSheet;
    allocateGSInstance(id: string): number;
    /** Lazily initialises a GroupedTag for when it's actually needed */
    getTag(): GroupedTag;
    /** Check whether a name is known for caching */
    hasNameForId(id: string, name: string): boolean;
    /** Mark a group's name as known for caching */
    registerName(id: string, name: string): void;
    /** Insert new rules which also marks the name as known */
    insertRules(id: string, name: string, rules: string | string[]): void;
    /** Clears all cached names for a given group ID */
    clearNames(id: string): void;
    /** Clears all rules for a given group ID */
    clearRules(id: string): void;
    /** Clears the entire tag which deletes all rules but not its names */
    clearTag(): void;
}
export {};
