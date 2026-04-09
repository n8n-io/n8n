import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { BeanCollection } from '../context/context';
import type { AgColumn } from '../entities/agColumn';
import type { IRowNode } from '../interfaces/iRowNode';
export declare class ValueService extends BeanStub implements NamedBean {
    beanName: "valueSvc";
    private expressionSvc?;
    private colModel;
    private valueCache?;
    private dataTypeSvc?;
    private editSvc?;
    private hasEditSvc;
    wireBeans(beans: BeanCollection): void;
    private cellExpressions;
    private isTreeData;
    private initialised;
    private isSsrm;
    private executeValueGetter;
    postConstruct(): void;
    private init;
    /**
     * Use this function to get a displayable cell value.
     * The values from this function are not used for sorting, filtering, or aggregation purposes.
     * Handles: groupHideOpenParents, showOpenedGroup and groupSuppressBlankHeader behaviours
     */
    getValueForDisplay(column: AgColumn | undefined, node: IRowNode, includeValueFormatted?: boolean, exporting?: boolean, source?: 'ui' | 'api'): {
        value: any;
        valueFormatted: string | null;
    };
    getValue(column: AgColumn, rowNode?: IRowNode | null, ignoreAggData?: boolean, source?: 'ui' | 'api' | 'edit' | string): any;
    parseValue(column: AgColumn, rowNode: IRowNode | null, newValue: any, oldValue: any): any;
    getDeleteValue(column: AgColumn, rowNode: IRowNode): any;
    formatValue(column: AgColumn, node: IRowNode | null, value: any, suppliedFormatter?: (value: any) => string, useFormatterFromColumn?: boolean): string | null;
    /**
     * Sets the value of a GridCell
     * @param rowNode The `RowNode` to be updated
     * @param colKey The `Column` to be updated
     * @param newValue The new value to be set
     * @param eventSource The event source
     * @returns `True` if the value has been updated, otherwise`False`.
     */
    setValue(rowNode: IRowNode, colKey: string | AgColumn, newValue: any, eventSource?: string): boolean;
    private dispatchCellValueChangedEvent;
    private callColumnCellValueChangedHandler;
    private setValueUsingField;
    private executeValueGetterWithValueCache;
    private executeValueGetterWithoutValueCache;
    getValueCallback(node: IRowNode, field: string | AgColumn): any;
    getKeyForNode(col: AgColumn, rowNode: IRowNode): any;
}
