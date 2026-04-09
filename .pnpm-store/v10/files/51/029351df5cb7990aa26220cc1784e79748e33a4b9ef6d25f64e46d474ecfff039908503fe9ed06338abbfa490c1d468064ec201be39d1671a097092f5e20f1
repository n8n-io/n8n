import { BeanStub } from '../../context/beanStub';
import type { BeanCollection } from '../../context/context';
import type { AgColumn } from '../../entities/agColumn';
import type { RowStyle } from '../../entities/gridOptions';
import type { RowNode } from '../../entities/rowNode';
import type { AgEventType } from '../../eventTypes';
import type { CellFocusedEvent, RowEvent } from '../../events';
import type { RowContainerType } from '../../gridBodyComp/rowContainer/rowContainerCtrl';
import type { BrandedType } from '../../interfaces/brandedType';
import type { RenderedRowEvent } from '../../interfaces/iCallbackParams';
import type { RefreshRowsParams } from '../../interfaces/iCellsParams';
import type { RowPosition } from '../../interfaces/iRowPosition';
import type { IRowStyleFeature } from '../../interfaces/iRowStyleFeature';
import type { UserCompDetails } from '../../interfaces/iUserCompDetails';
import { CellCtrl } from '../cell/cellCtrl';
import type { ICellRenderer, ICellRendererParams } from '../cellRenderers/iCellRenderer';
export type RowCtrlInstanceId = BrandedType<string, 'RowCtrlInstanceId'>;
export interface IRowComp {
    setDomOrder(domOrder: boolean): void;
    toggleCss(cssClassName: string, on: boolean): void;
    setCellCtrls(cellCtrls: CellCtrl[], useFlushSync: boolean): void;
    showFullWidth(compDetails: UserCompDetails): void;
    getFullWidthCellRenderer(): ICellRenderer | null | undefined;
    getFullWidthCellRendererParams(): ICellRendererParams | undefined;
    setTop(top: string): void;
    setTransform(transform: string): void;
    setRowIndex(rowIndex: string): void;
    setRowId(rowId: string): void;
    setRowBusinessKey(businessKey: string): void;
    setUserStyles(styles: RowStyle | undefined): void;
    refreshFullWidth(getUpdatedParams: () => ICellRendererParams): boolean;
}
export interface RowGui {
    rowComp: IRowComp;
    element: HTMLElement;
    containerType: RowContainerType;
    compBean: BeanStub;
}
type RowCtrlEvent = RenderedRowEvent;
export declare class RowCtrl extends BeanStub<RowCtrlEvent> {
    readonly rowNode: RowNode;
    private readonly useAnimationFrameForCreate;
    readonly printLayout: boolean;
    readonly instanceId: RowCtrlInstanceId;
    private tooltipFeature;
    private rowType;
    private leftGui;
    private centerGui;
    private rightGui;
    private fullWidthGui;
    private allRowGuis;
    private firstRowOnPage;
    private lastRowOnPage;
    private active;
    private rowFocused;
    private centerCellCtrls;
    private leftCellCtrls;
    private rightCellCtrls;
    private slideInAnimation;
    private fadeInAnimation;
    private rowDragComps;
    private paginationPage;
    private lastMouseDownOnDragger;
    private rowLevel;
    rowStyles: RowStyle;
    private readonly emptyStyle;
    private readonly suppressRowTransform;
    private updateColumnListsPending;
    rowId: string | null;
    /** sanitised */
    businessKey: string | null;
    private businessKeyForNodeFunc;
    rowEditStyleFeature?: IRowStyleFeature;
    constructor(rowNode: RowNode, beans: BeanCollection, animateIn: boolean, useAnimationFrameForCreate: boolean, printLayout: boolean);
    private initRowBusinessKey;
    private updateRowBusinessKey;
    private updateGui;
    setComp(rowComp: IRowComp, element: HTMLElement, containerType: RowContainerType, compBean: BeanStub<any> | undefined): void;
    unsetComp(containerType: RowContainerType): void;
    isCacheable(): boolean;
    setCached(cached: boolean): void;
    private initialiseRowComp;
    private setRowCompRowBusinessKey;
    private setRowCompRowId;
    private executeSlideAndFadeAnimations;
    private addRowDraggerToRow;
    private setupFullWidth;
    getFullWidthCellRenderers(): (ICellRenderer<any> | null | undefined)[];
    private executeProcessRowPostCreateFunc;
    private areAllContainersReady;
    private isNodeFullWidthCell;
    private setRowType;
    private updateColumnLists;
    /**
     * Overridden by SpannedRowCtrl
     */
    protected getNewCellCtrl(col: AgColumn): CellCtrl | undefined;
    /**
     * Overridden by SpannedRowCtrl, if span context changes cell needs rebuilt
     */
    protected isCorrectCtrlForSpan(cell: CellCtrl): boolean;
    private createCellCtrls;
    /**
     * Creates a new cell ctrl for the focused cell, if this is the correct row ctrl.
     * @returns a CellCtrl for the focused cell, if required.
     */
    private createFocusedCellCtrl;
    private updateColumnListsImpl;
    private setCellCtrls;
    private getCellCtrlsForContainer;
    private createAllCellCtrls;
    private isCellEligibleToBeRemoved;
    getDomOrder(): boolean;
    private listenOnDomOrder;
    private setAnimateFlags;
    isFullWidth(): boolean;
    refreshFullWidth(): boolean;
    private addListeners;
    private addListenersForCellComps;
    /** Should only ever be triggered on source rows (i.e. not on pinned siblings) */
    private onRowPinned;
    private onRowNodeDataChanged;
    refreshRow(params: RefreshRowsParams & {
        newData?: boolean;
    }): void;
    private postProcessCss;
    private onRowNodeHighlightChanged;
    private postProcessRowDragging;
    private onDisplayedColumnsChanged;
    private onVirtualColumnsChanged;
    getRowPosition(): RowPosition;
    onKeyboardNavigate(keyboardEvent: KeyboardEvent): void;
    onTabKeyDown(keyboardEvent: KeyboardEvent): void;
    getFullWidthElement(): HTMLElement | null;
    getRowYPosition(): number;
    onSuppressCellFocusChanged(suppressCellFocus: boolean): void;
    onFullWidthRowFocused(event?: CellFocusedEvent): void;
    recreateCell(cellCtrl: CellCtrl): void;
    private removeCellCtrl;
    onMouseEvent(eventName: string, mouseEvent: MouseEvent): void;
    createRowEvent<T extends AgEventType>(type: T, domEvent?: Event): RowEvent<T>;
    private createRowEventWithSource;
    private onRowDblClick;
    findFullWidthInfoForEvent(event?: Event): {
        rowGui: RowGui;
        column: AgColumn;
    } | undefined;
    private findFullWidthRowGui;
    private getColumnForFullWidth;
    private onRowMouseDown;
    isSuppressMouseEvent(mouseEvent: MouseEvent): boolean;
    onRowClick(mouseEvent: MouseEvent): void;
    setupDetailRowAutoHeight(eDetailGui: HTMLElement): void;
    private createFullWidthCompDetails;
    private setupFullWidthRowTooltip;
    private addFullWidthRowDragging;
    private onUiLevelChanged;
    private isFirstRowOnPage;
    private isLastRowOnPage;
    protected refreshFirstAndLastRowStyles(): void;
    getAllCellCtrls(): CellCtrl[];
    private postProcessClassesFromGridOptions;
    private postProcessRowClassRules;
    private setStylesFromGridOptions;
    private getPinnedForContainer;
    protected getInitialRowClasses(rowContainerType: RowContainerType): string[];
    private processStylesFromGridOptions;
    private onRowSelected;
    announceDescription(): void;
    protected addHoverFunctionality(eGui: RowGui): void;
    resetHoveredStatus(el?: HTMLElement): void;
    private roundRowTopToBounds;
    forEachGui(gui: RowGui | undefined, callback: (gui: RowGui) => void): void;
    isRowRendered(): boolean;
    protected onRowHeightChanged(gui?: RowGui): void;
    destroyFirstPass(suppressAnimation?: boolean): void;
    destroySecondPass(): void;
    private setFocusedClasses;
    private onCellFocusChanged;
    private onPaginationChanged;
    private onTopChanged;
    private onPaginationPixelOffsetChanged;
    private applyPaginationOffset;
    setRowTop(pixels: number): void;
    getInitialRowTop(rowContainerType: RowContainerType): string | undefined;
    getInitialTransform(rowContainerType: RowContainerType): string | undefined;
    private getInitialRowTopShared;
    private setRowTopStyle;
    getCellCtrl(column: AgColumn, skipColSpanSearch?: boolean): CellCtrl | null;
    protected onRowIndexChanged(): void;
    private updateRowIndexes;
}
export {};
