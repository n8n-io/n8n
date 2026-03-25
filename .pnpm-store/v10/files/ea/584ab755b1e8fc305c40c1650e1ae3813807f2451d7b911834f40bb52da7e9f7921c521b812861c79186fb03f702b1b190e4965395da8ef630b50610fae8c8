import Mexp from './index';
export type Token = {
    type: tokenTypes;
    value: any;
    token: string;
    numberOfArguments?: number;
    show: string;
    precedence: number;
};
export type ParsedToken = Omit<Token, 'token'> & {
    hasDec?: true;
};
export declare const preced: {
    [key in tokenTypes]: number;
};
export declare const createTokens: (mexp: Mexp) => {
    precedence: number;
    type: tokenTypes;
    value: any;
    token: string;
    numberOfArguments?: number | undefined;
    show: string;
}[];
export declare enum tokenTypes {
    FUNCTION_WITH_ONE_ARG = 0,
    NUMBER = 1,
    BINARY_OPERATOR_HIGH_PRECENDENCE = 2,
    CONSTANT = 3,
    OPENING_PARENTHESIS = 4,
    CLOSING_PARENTHESIS = 5,
    DECIMAL = 6,
    POSTFIX_FUNCTION_WITH_ONE_ARG = 7,
    FUNCTION_WITH_N_ARGS = 8,
    BINARY_OPERATOR_LOW_PRECENDENCE = 9,
    BINARY_OPERATOR_PERMUTATION = 10,
    COMMA = 11,
    EVALUATED_FUNCTION = 12,
    EVALUATED_FUNCTION_PARAMETER = 13,
    SPACE = 14
}
//# sourceMappingURL=token.d.ts.map