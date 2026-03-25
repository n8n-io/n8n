import type { CellClassParams } from '../entities/colDef';
import type { RowClassParams } from '../entities/gridOptions';
import type { ExpressionService } from '../valueService/expressionService';
export declare function processClassRules(expressionSvc: ExpressionService | undefined, previousClassRules: {
    [cssClassName: string]: ((...args: any[]) => any) | string;
} | undefined, classRules: {
    [cssClassName: string]: ((...args: any[]) => any) | string;
} | undefined, params: RowClassParams | CellClassParams, onApplicableClass: (className: string) => void, onNotApplicableClass?: (className: string) => void): void;
