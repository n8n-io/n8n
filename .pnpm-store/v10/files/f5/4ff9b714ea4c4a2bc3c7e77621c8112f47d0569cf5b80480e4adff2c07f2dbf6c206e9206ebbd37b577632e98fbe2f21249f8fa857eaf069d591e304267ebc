export type Variables = Record<string, string | string[]>;
export declare class UriTemplate {
    /**
     * Returns true if the given string contains any URI template expressions.
     * A template expression is a sequence of characters enclosed in curly braces,
     * like {foo} or {?bar}.
     */
    static isTemplate(str: string): boolean;
    private static validateLength;
    private readonly template;
    private readonly parts;
    get variableNames(): string[];
    constructor(template: string);
    toString(): string;
    private parse;
    private getOperator;
    private getNames;
    private encodeValue;
    private expandPart;
    expand(variables: Variables): string;
    private escapeRegExp;
    private partToRegExp;
    match(uri: string): Variables | null;
}
//# sourceMappingURL=uriTemplate.d.ts.map