import type { Selector, PseudoSelector } from "css-what";
export declare type Filter = "first" | "last" | "eq" | "nth" | "gt" | "lt" | "even" | "odd" | "not";
export declare const filterNames: Set<string>;
export interface CheerioSelector extends PseudoSelector {
    name: Filter;
    data: string | null;
}
export declare function isFilter(s: Selector): s is CheerioSelector;
export declare function getLimit(filter: Filter, data: string | null): number;
//# sourceMappingURL=positionals.d.ts.map