import type { IAgEventEmitter } from '../agStack/interfaces/iEventEmitter';
import type { ColumnState } from '../columns/columnStateUtils';
import { BeanStub } from '../context/beanStub';
import type { ColumnEvent, ColumnEventType } from '../events';
import type { Column, ColumnEventName, ColumnGroup, ColumnGroupShowType, ColumnHighlightPosition, ColumnInstanceId, ColumnPinnedType, HeaderColumnId, ProvidedColumnGroup } from '../interfaces/iColumn';
import type { IRowNode } from '../interfaces/iRowNode';
import type { AgColumnGroup } from './agColumnGroup';
import type { AgProvidedColumnGroup } from './agProvidedColumnGroup';
import type { AbstractColDef, ColDef, ColumnFunctionCallbackParams, IAggFunc, SortDirection } from './colDef';
export declare function getNextColInstanceId(): ColumnInstanceId;
export declare function isColumn(col: Column | ColumnGroup | ProvidedColumnGroup): col is AgColumn;
export declare class AgColumn<TValue = any> extends BeanStub<ColumnEventName> implements Column, IAgEventEmitter<ColumnEventName> {
    colDef: ColDef<any, TValue>;
    userProvidedColDef: ColDef<any, TValue> | null;
    readonly colId: string;
    private readonly primary;
    readonly isColumn: true;
    private frameworkEventListenerService?;
    private readonly instanceId;
    /** Sanitised version of the column id */
    readonly colIdSanitised: string;
    private actualWidth;
    private autoHeaderHeight;
    private visible;
    pinned: ColumnPinnedType;
    private left;
    private oldLeft;
    aggFunc: string | IAggFunc | null | undefined;
    sort: SortDirection | undefined;
    sortIndex: number | null | undefined;
    moving: boolean;
    resizing: boolean;
    menuVisible: boolean;
    highlighted: ColumnHighlightPosition | null;
    private lastLeftPinned;
    private firstRightPinned;
    minWidth: number;
    private maxWidth;
    filterActive: boolean;
    private readonly colEventSvc;
    private fieldContainsDots;
    private tooltipFieldContainsDots;
    tooltipEnabled: boolean;
    rowGroupActive: boolean;
    pivotActive: boolean;
    aggregationActive: boolean;
    flex: number | null;
    parent: AgColumnGroup | null;
    originalParent: AgProvidedColumnGroup | null;
    constructor(colDef: ColDef<any, TValue>, userProvidedColDef: ColDef<any, TValue> | null, colId: string, primary: boolean);
    destroy(): void;
    getInstanceId(): ColumnInstanceId;
    private setState;
    setColDef(colDef: ColDef<any, TValue>, userProvidedColDef: ColDef<any, TValue> | null, source: ColumnEventType): void;
    getUserProvidedColDef(): ColDef<any, TValue> | null;
    getParent(): AgColumnGroup | null;
    getOriginalParent(): AgProvidedColumnGroup | null;
    postConstruct(): void;
    private initDotNotation;
    private initMinAndMaxWidths;
    private initTooltip;
    private initRowSpan;
    private addPivotListener;
    resetActualWidth(source: ColumnEventType): void;
    private calculateColInitialWidth;
    isEmptyGroup(): boolean;
    isRowGroupDisplayed(colId: string): boolean;
    isPrimary(): boolean;
    isFilterAllowed(): boolean;
    isFieldContainsDots(): boolean;
    isTooltipEnabled(): boolean;
    isTooltipFieldContainsDots(): boolean;
    getHighlighted(): ColumnHighlightPosition | null;
    __addEventListener<T extends ColumnEventName>(eventType: T, listener: (params: ColumnEvent<T>) => void): void;
    __removeEventListener<T extends ColumnEventName>(eventType: T, listener: (params: ColumnEvent<T>) => void): void;
    /**
     * PUBLIC USE ONLY: for internal use within AG Grid use the `__addEventListener` and `__removeEventListener` methods.
     */
    addEventListener<T extends ColumnEventName>(eventType: T, userListener: (params: ColumnEvent<T>) => void): void;
    /**
     * PUBLIC USE ONLY: for internal use within AG Grid use the `__addEventListener` and `__removeEventListener` methods.
     */
    removeEventListener<T extends ColumnEventName>(eventType: T, userListener: (params: ColumnEvent<T>) => void): void;
    createColumnFunctionCallbackParams(rowNode: IRowNode): ColumnFunctionCallbackParams;
    isSuppressNavigable(rowNode: IRowNode): boolean;
    isCellEditable(rowNode: IRowNode): boolean;
    isSuppressFillHandle(): boolean;
    isAutoHeight(): boolean;
    isAutoHeaderHeight(): boolean;
    isRowDrag(rowNode: IRowNode): boolean;
    isDndSource(rowNode: IRowNode): boolean;
    isCellCheckboxSelection(rowNode: IRowNode): boolean;
    isSuppressPaste(rowNode: IRowNode): boolean;
    isResizable(): boolean;
    /** Get value from ColDef or default if it exists. */
    private getColDefValue;
    isColumnFunc(rowNode: IRowNode, value?: boolean | ((params: ColumnFunctionCallbackParams) => boolean) | null): boolean;
    private createColumnEvent;
    isMoving(): boolean;
    getSort(): SortDirection | undefined;
    isSortable(): boolean;
    /** @deprecated v32 use col.getSort() === 'asc */
    isSortAscending(): boolean;
    /** @deprecated v32 use col.getSort() === 'desc */
    isSortDescending(): boolean;
    /** @deprecated v32 use col.getSort() === undefined */
    isSortNone(): boolean;
    /** @deprecated v32 use col.getSort() !== undefined */
    isSorting(): boolean;
    getSortIndex(): number | null | undefined;
    isMenuVisible(): boolean;
    getAggFunc(): string | IAggFunc | null | undefined;
    getLeft(): number | null;
    getOldLeft(): number | null;
    getRight(): number;
    setLeft(left: number | null, source: ColumnEventType): void;
    isFilterActive(): boolean;
    /** @deprecated v33 Use `api.isColumnHovered(column)` instead. */
    isHovered(): boolean;
    setFirstRightPinned(firstRightPinned: boolean, source: ColumnEventType): void;
    setLastLeftPinned(lastLeftPinned: boolean, source: ColumnEventType): void;
    isFirstRightPinned(): boolean;
    isLastLeftPinned(): boolean;
    isPinned(): boolean;
    isPinnedLeft(): boolean;
    isPinnedRight(): boolean;
    getPinned(): ColumnPinnedType;
    setVisible(visible: boolean, source: ColumnEventType): void;
    isVisible(): boolean;
    isSpanHeaderHeight(): boolean;
    /**
     * Returns the first parent that is not a padding group.
     */
    getFirstRealParent(): AgProvidedColumnGroup | null;
    getColumnGroupPaddingInfo(): {
        numberOfParents: number;
        isSpanningTotal: boolean;
    };
    getColDef(): ColDef<any, TValue>;
    getDefinition(): AbstractColDef<any, TValue>;
    getColumnGroupShow(): ColumnGroupShowType | undefined;
    getColId(): string;
    getId(): string;
    getUniqueId(): HeaderColumnId;
    getActualWidth(): number;
    getAutoHeaderHeight(): number | null;
    /** Returns true if the header height has changed */
    setAutoHeaderHeight(height: number): boolean;
    private createBaseColDefParams;
    getColSpan(rowNode: IRowNode): number;
    getRowSpan(rowNode: IRowNode): number;
    setActualWidth(actualWidth: number, source: ColumnEventType, silent?: boolean): void;
    fireColumnWidthChangedEvent(source: ColumnEventType): void;
    isGreaterThanMax(width: number): boolean;
    getMinWidth(): number;
    getMaxWidth(): number;
    getFlex(): number | null;
    isRowGroupActive(): boolean;
    isPivotActive(): boolean;
    isAnyFunctionActive(): boolean;
    isAnyFunctionAllowed(): boolean;
    isValueActive(): boolean;
    isAllowPivot(): boolean;
    isAllowValue(): boolean;
    isAllowRowGroup(): boolean;
    dispatchColEvent(type: ColumnEventName, source: ColumnEventType, additionalEventAttributes?: any): void;
    dispatchStateUpdatedEvent(key: keyof ColumnState): void;
}
