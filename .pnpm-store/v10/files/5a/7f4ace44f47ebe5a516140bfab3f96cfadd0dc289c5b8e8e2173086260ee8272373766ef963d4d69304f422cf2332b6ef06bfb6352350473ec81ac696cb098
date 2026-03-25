import type { ValueGetterFunc } from '../entities/colDef';
import type { CoreDataTypeDefinition, DataTypeFormatValueFunc } from '../entities/dataType';
import type { IMultiFilterParams } from './iMultiFilter';
export interface IMultiFilterService {
    getParamsForDataType(existingFilterParams: IMultiFilterParams | undefined, existingFilterValueGetter: string | ValueGetterFunc | undefined, dataTypeDefinition: CoreDataTypeDefinition, formatValue: DataTypeFormatValueFunc): {
        filterParams?: any;
        filterValueGetter?: string | ValueGetterFunc;
    };
}
