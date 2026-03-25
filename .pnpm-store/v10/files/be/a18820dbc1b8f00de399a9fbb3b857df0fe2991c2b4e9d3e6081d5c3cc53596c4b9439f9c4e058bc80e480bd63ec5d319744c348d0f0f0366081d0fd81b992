export interface ExpressionText {
    type: 'text';
    text: string;
}
export interface ExpressionCode {
    type: 'code';
    text: string;
    hasClosingBrackets: boolean;
}
export type ExpressionChunk = ExpressionCode | ExpressionText;
export declare const escapeCode: (text: string) => string;
export declare const splitExpression: (expression: string) => ExpressionChunk[];
export declare const joinExpression: (parts: ExpressionChunk[]) => string;
