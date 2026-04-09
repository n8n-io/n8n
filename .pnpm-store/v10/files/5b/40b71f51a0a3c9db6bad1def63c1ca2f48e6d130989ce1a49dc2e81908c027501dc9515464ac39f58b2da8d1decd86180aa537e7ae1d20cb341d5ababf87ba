import { InsertionTarget } from '../types';
/** CSSStyleSheet-like Tag abstraction for CSS rules */
export interface Tag {
    insertRule(index: number, rule: string): boolean;
    deleteRule(index: number): void;
    getRule(index: number): string;
    length: number;
}
/** Group-aware Tag that sorts rules by indices */
export interface GroupedTag {
    clearGroup(group: number): void;
    getGroup(group: number): string;
    groupSizes: Uint32Array;
    insertRules(group: number, rules: string[]): void;
    length: number;
    tag: Tag;
}
export type SheetOptions = {
    isServer: boolean;
    target?: InsertionTarget | undefined;
    useCSSOMInjection: boolean;
};
export interface Sheet {
    allocateGSInstance(id: string): number;
    clearNames(id: string): void;
    clearRules(id: string): void;
    clearTag(): void;
    getTag(): GroupedTag;
    hasNameForId(id: string, name: string): boolean;
    insertRules(id: string, name: string, rules: string[]): void;
    options: SheetOptions;
    names: Map<string, Set<string>>;
    registerName(id: string, name: string): void;
    rehydrate(): void;
    toString(): string;
}
