import { ParserOptions } from '@babel/parser';
import * as b from '@babel/types';
export { ParserOptions as BabylonOptions };
export interface ExpressionToConstantOptions {
    constants?: any;
}
export interface Options extends ExpressionToConstantOptions {
    babylon?: ParserOptions;
}
export declare function expressionToConstant(expression: b.Expression, options?: ExpressionToConstantOptions): {
    constant: true;
    result: any;
} | {
    constant: false;
    result?: void;
};
export declare function isConstant(src: string, constants?: any, options?: ParserOptions): boolean;
export declare function toConstant(src: string, constants?: any, options?: ParserOptions): any;
export default isConstant;
