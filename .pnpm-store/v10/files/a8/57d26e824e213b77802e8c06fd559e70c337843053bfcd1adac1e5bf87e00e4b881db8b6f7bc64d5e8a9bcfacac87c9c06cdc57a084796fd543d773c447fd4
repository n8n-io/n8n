export interface Predicate {
    match(str: string): boolean;
}
/**
 * Wildcard pattern predicate, supports patterns like `*`, `foo*`, `*bar`.
 */
export declare class PatternPredicate implements Predicate {
    private _matchAll;
    private _regexp;
    constructor(pattern: string);
    match(str: string): boolean;
    static escapePattern(pattern: string): string;
    static hasWildcard(pattern: string): boolean;
}
export declare class ExactPredicate implements Predicate {
    private _matchAll;
    private _pattern?;
    constructor(pattern?: string);
    match(str: string): boolean;
}
//# sourceMappingURL=Predicate.d.ts.map