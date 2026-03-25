export declare class LineParser<T> {
    protected matches: string[];
    protected useMatches: (target: T, match: string[]) => boolean | void;
    private _regExp;
    constructor(regExp: RegExp | RegExp[], useMatches?: (target: T, match: string[]) => boolean | void);
    parse: (line: (offset: number) => string | undefined, target: T) => boolean;
    protected resetMatches(): void;
    protected prepareMatches(): string[];
    protected addMatch(reg: RegExp, index: number, line?: string): boolean;
    protected pushMatch(_index: number, matched: string[]): void;
}
export declare class RemoteLineParser<T> extends LineParser<T> {
    protected addMatch(reg: RegExp, index: number, line?: string): boolean;
    protected pushMatch(index: number, matched: string[]): void;
}
