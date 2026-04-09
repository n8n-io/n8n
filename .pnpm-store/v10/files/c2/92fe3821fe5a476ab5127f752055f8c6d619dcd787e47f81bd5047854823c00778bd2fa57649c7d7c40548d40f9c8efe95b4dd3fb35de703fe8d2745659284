import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { BeanCollection } from '../context/context';
import type { AgColumn } from '../entities/agColumn';
import type { ColDef } from '../entities/colDef';
import type { BaseCellDataType, CoreDataTypeDefinition, DataTypeDefinition, DataTypeFormatValueFunc } from '../entities/dataType';
export declare class DataTypeService extends BeanStub implements NamedBean {
    beanName: "dataTypeSvc";
    private colModel;
    wireBeans(beans: BeanCollection): void;
    private dataTypeDefinitions;
    private dataTypeMatchers;
    private formatValueFuncs;
    isPendingInference: boolean;
    private hasObjectValueParser;
    private hasObjectValueFormatter;
    private initialData;
    private isColumnTypeOverrideInDataTypeDefinitions;
    private columnStateUpdatesPendingInference;
    private columnStateUpdateListenerDestroyFuncs;
    postConstruct(): void;
    private processDataTypeDefinitions;
    /**
     * Sorts the keys in the matchers object.
     * Does not mutate the original object, creates a copy of it with sorted keys instead.
     */
    private sortKeysInMatchers;
    private processDataTypeDefinition;
    updateColDefAndGetColumnType(colDef: ColDef, userColDef: ColDef, colId: string): string | string[] | undefined;
    addColumnListeners(column: AgColumn): void;
    private canInferCellDataType;
    private inferCellDataType;
    private getInitialData;
    private initWaitForRowData;
    private processColumnsPendingInference;
    private generateColumnStateForRowGroupAndPivotIndexes;
    private resetColDefIntoCol;
    private getDateStringTypeDefinition;
    getDateParserFunction(column?: AgColumn | null): (value: string | undefined) => Date | undefined;
    getDateFormatterFunction(column?: AgColumn | null): (value: Date | undefined) => string | undefined;
    getDateIncludesTimeFlag(cellDataType?: any): boolean;
    getDataTypeDefinition(column: AgColumn): DataTypeDefinition | CoreDataTypeDefinition | undefined;
    getBaseDataType(column: AgColumn): BaseCellDataType | undefined;
    checkType(column: AgColumn, value: any): boolean;
    validateColDef(colDef: ColDef): void;
    postProcess(colDef: ColDef): void;
    getFormatValue(cellDataType: string): DataTypeFormatValueFunc | undefined;
    isColPendingInference(colId: string): boolean;
    private readonly columnDefinitionPropsPerDataType;
    private setColDefPropertiesForBaseDataType;
    private getDateObjectTypeDef;
    private getDateStringTypeDef;
    private getDefaultDataTypes;
    private destroyColumnStateUpdateListeners;
    destroy(): void;
}
