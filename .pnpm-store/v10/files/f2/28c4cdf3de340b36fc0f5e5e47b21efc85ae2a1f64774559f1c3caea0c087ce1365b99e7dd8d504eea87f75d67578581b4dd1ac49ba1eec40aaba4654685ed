import type { AgColumn } from '../entities/agColumn';
import type { IAggFunc } from '../entities/colDef';
export interface IAggFuncService {
    addAggFuncs(aggFuncs: {
        [key: string]: IAggFunc;
    }): void;
    clear(): void;
    getDefaultAggFunc(column: AgColumn): string | null;
    getFuncNames(column: AgColumn): string[];
    getDefaultFuncLabel(fctName: string): string;
    getAggFunc(name: string): IAggFunc;
}
