interface SpellCheckTerms {
    mode: 'INCLUDE' | 'EXCLUDE';
    dictionary: string;
}
interface SpellCheckOptions {
    DISTANCE?: number;
    TERMS?: SpellCheckTerms | Array<SpellCheckTerms>;
    DIALECT?: number;
}
export declare function transformArguments(index: string, query: string, options?: SpellCheckOptions): Array<string>;
type SpellCheckRawReply = Array<[
    _: string,
    term: string,
    suggestions: Array<[score: string, suggestion: string]>
]>;
type SpellCheckReply = Array<{
    term: string;
    suggestions: Array<{
        score: number;
        suggestion: string;
    }>;
}>;
export declare function transformReply(rawReply: SpellCheckRawReply): SpellCheckReply;
export {};
