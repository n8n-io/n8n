export type MatcherFn<T> = (actualValue: T) => boolean;
export declare class Matcher<T> {
    readonly asymmetricMatch: MatcherFn<T>;
    private readonly description;
    $$typeof: symbol;
    inverse?: boolean;
    constructor(asymmetricMatch: MatcherFn<T>, description: string);
    toString(): string;
    toAsymmetricMatcher(): string;
    getExpectedType(): string;
}
export declare class CaptorMatcher<T> {
    $$typeof: symbol;
    readonly asymmetricMatch: MatcherFn<T>;
    readonly value: T;
    readonly values: T[];
    constructor();
    getExpectedType(): string;
    toString(): string;
    toAsymmetricMatcher(): string;
}
export interface MatcherCreator<T, E = T> {
    (expectedValue?: E): Matcher<T>;
}
export type MatchersOrLiterals<Y extends any[]> = {
    [K in keyof Y]: Matcher<Y[K]> | Y[K];
};
export declare const any: MatcherCreator<any>;
export declare const anyBoolean: MatcherCreator<boolean>;
export declare const anyNumber: MatcherCreator<number>;
export declare const anyString: MatcherCreator<string>;
export declare const anyFunction: MatcherCreator<Function>;
export declare const anySymbol: MatcherCreator<Symbol>;
export declare const anyObject: MatcherCreator<any>;
export declare const anyArray: MatcherCreator<any[]>;
export declare const anyMap: MatcherCreator<Map<any, any>>;
export declare const anySet: MatcherCreator<Set<any>>;
export declare const isA: MatcherCreator<any>;
export declare const arrayIncludes: MatcherCreator<any[], any>;
export declare const setHas: MatcherCreator<Set<any>, any>;
export declare const mapHas: MatcherCreator<Map<any, any>, any>;
export declare const objectContainsKey: MatcherCreator<any, string>;
export declare const objectContainsValue: MatcherCreator<any>;
export declare const notNull: MatcherCreator<any>;
export declare const notUndefined: MatcherCreator<any>;
export declare const notEmpty: MatcherCreator<any>;
export declare const captor: <T extends unknown = any>() => CaptorMatcher<T>;
export declare const matches: <T extends unknown = any>(matcher: MatcherFn<T>) => Matcher<T>;
