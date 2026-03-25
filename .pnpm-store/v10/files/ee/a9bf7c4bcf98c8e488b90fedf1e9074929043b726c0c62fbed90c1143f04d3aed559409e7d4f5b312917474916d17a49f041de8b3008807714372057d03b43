import type { types } from 'recast';
import type { ExpressionCode, ExpressionText } from './ExpressionSplitter';
import type { TournamentHooks } from './ast';
export interface ExpressionAnalysis {
    has: {
        function: boolean;
        templateString: boolean;
    };
}
type ParsedCode = ExpressionCode & {
    parsed: types.namedTypes.File;
};
export declare const getParsedExpression: (expr: string) => Array<ExpressionText | ParsedCode>;
export declare const getExpressionCode: (expr: string, dataNodeName: string, hooks: TournamentHooks) => [string, ExpressionAnalysis];
export {};
