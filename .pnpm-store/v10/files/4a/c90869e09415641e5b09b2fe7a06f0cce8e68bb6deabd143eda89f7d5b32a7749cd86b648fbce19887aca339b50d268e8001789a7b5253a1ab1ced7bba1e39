import type { ExpressionAnalysis } from './ExpressionBuilder';
interface TmplOrTournament {
    tmpl: boolean;
    tournament: boolean;
}
interface TmplSame {
    same: true;
    expression?: SanitizedString;
}
interface TmplDiff {
    same: false;
    expression: SanitizedString | 'UNPARSEABLE';
    has?: ExpressionAnalysis['has'];
    parserError?: TmplOrTournament;
}
export type TmplDifference = TmplSame | TmplDiff;
export declare const getTmplDifference: (expr: string, dataNodeName: string) => TmplDifference;
export interface SanitizedString {
    value: string;
    sanitized: 'ACTUALLY_SANITIZED_DO_NOT_MANUALLY_MAKE_THIS_OBJECT';
}
export declare const stripIdentifyingInformation: (expr: string) => SanitizedString;
export {};
