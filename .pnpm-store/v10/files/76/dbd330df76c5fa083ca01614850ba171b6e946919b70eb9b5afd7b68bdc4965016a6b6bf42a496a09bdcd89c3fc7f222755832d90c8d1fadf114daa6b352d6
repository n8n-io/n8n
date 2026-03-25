export type RelativeCloseToMatcherOptions = {
    threshold?: number;
    algorithm?: "levenshtein";
};
export declare function toBeRelativeCloseTo(received: string, expected: string, options?: RelativeCloseToMatcherOptions): Promise<{
    pass: boolean;
    message: () => string;
}>;
export type AbsoluteCloseToMatcherOptions = {
    threshold?: number;
    algorithm?: "levenshtein";
};
export declare function toBeAbsoluteCloseTo(received: string, expected: string, options?: AbsoluteCloseToMatcherOptions): Promise<{
    pass: boolean;
    message: () => string;
}>;
export type SemanticCloseToMatcherOptions = {
    embeddings: {
        embedQuery: (query: string) => number[] | Promise<number[]>;
    };
    threshold?: number;
    algorithm?: "cosine" | "dot-product";
};
export declare function toBeSemanticCloseTo(received: string, expected: string, options: SemanticCloseToMatcherOptions): Promise<{
    pass: boolean;
    message: () => string;
}>;
