import type { ColDef, ColGroupDef } from '../entities/colDef';
export interface IPivotColDefService {
    createColDefsFromFields: (fields: string[]) => (ColDef | ColGroupDef)[];
    recreateColDef(colDef: ColDef): ColDef;
}
