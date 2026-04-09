import { AgPromise } from '../../agStack/utils/promise';
import { BeanStub } from '../../context/beanStub';
import type { BeanCollection } from '../../context/context';
import type { RowDragComp } from '../../dragAndDrop/rowDragComp';
import type { AgColumn } from '../../entities/agColumn';
import type { CellStyle } from '../../entities/colDef';
import type { RowNode } from '../../entities/rowNode';
import type { AgEventType } from '../../eventTypes';
import type { CellEvent, CellFocusedEvent } from '../../events';
import type { BrandedType } from '../../interfaces/brandedType';
import type { ICellEditor } from '../../interfaces/iCellEditor';
import type { CellPosition } from '../../interfaces/iCellPosition';
import type { ICellRangeFeature } from '../../interfaces/iCellRangeFeature';
import type { ICellStyleFeature } from '../../interfaces/iCellStyleFeature';
import type { RefreshCellsParams } from '../../interfaces/iCellsParams';
import type { CellChangedEvent } from '../../interfaces/iRowNode';
import type { RowPosition } from '../../interfaces/iRowPosition';
import type { UserCompDetails } from '../../interfaces/iUserCompDetails';
import type { CheckboxSelectionComponent } from '../../selection/checkboxSelectionComponent';
import type { TooltipFeature } from '../../tooltip/tooltipFeature';
import type { ICellRenderer } from '../cellRenderers/iCellRenderer';
import type { DndSourceComp } from '../dndSourceComp';
import type { RowCtrl } from '../row/rowCtrl';
import type { CellSpan } from '../spanning/rowSpanCache';
export interface ICellComp {
    toggleCss(cssClassName: string, on: boolean): void;
    setUserStyles(styles: CellStyle): void;
    getFocusableElement(): HTMLElement;
    setIncludeSelection(include: boolean): void;
    setIncludeRowDrag(include: boolean): void;
    setIncludeDndSource(include: boolean): void;
    getCellEditor(): ICellEditor | null;
    getCellRenderer(): ICellRenderer | null;
    getParentOfValue(): HTMLElement | null;
    setRenderDetails(compDetails: UserCompDetails | undefined, valueToDisplay: any, forceNewCellRendererInstance: boolean): void;
    setEditDetails(compDetails?: UserCompDetails, popup?: boolean, position?: 'over' | 'under', reactiveCustomComponents?: boolean): void;
    refreshEditStyles: (editing: boolean, isPopup: boolean) => void;
}
export type CellCtrlInstanceId = BrandedType<string, 'CellCtrlInstanceId'>;
export declare class CellCtrl extends BeanStub {
    readonly column: AgColumn;
    readonly rowNode: RowNode;
    readonly rowCtrl: RowCtrl;
    readonly instanceId: CellCtrlInstanceId;
    eGui: HTMLElement;
    comp: ICellComp;
    editCompDetails?: UserCompDetails;
    printLayout: boolean;
    value: any;
    valueFormatted: any;
    rangeFeature: ICellRangeFeature | undefined;
    private rowResizeFeature;
    private positionFeature;
    private customStyleFeature;
    editStyleFeature: ICellStyleFeature | undefined;
    private mouseListener;
    private keyboardListener;
    cellPosition: CellPosition;
    private includeSelection;
    private includeDndSource;
    private includeRowDrag;
    isAutoHeight: boolean;
    suppressRefreshCell: boolean;
    private customRowDragComp;
    onCompAttachedFuncs: (() => void)[];
    onEditorAttachedFuncs: (() => void)[];
    private focusEventWhileNotReady;
    private hasBeenFocused;
    private readonly editSvc?;
    private readonly hasEdit;
    tooltipFeature: TooltipFeature | undefined;
    editorTooltipFeature: TooltipFeature | undefined;
    constructor(column: AgColumn, rowNode: RowNode, beans: BeanCollection, rowCtrl: RowCtrl);
    private addFeatures;
    isCellSpanning(): boolean;
    getCellSpan(): CellSpan | undefined;
    private removeFeatures;
    private enableTooltipFeature;
    private disableTooltipFeature;
    enableEditorTooltipFeature(editor: ICellEditor): void;
    disableEditorTooltipFeature(): void;
    setComp(comp: ICellComp, eCell: HTMLElement, _eWrapper: HTMLElement | undefined, eCellWrapper: HTMLElement | undefined, printLayout: boolean, startEditing: boolean, compBean: BeanStub | undefined): void;
    private setupAutoHeight;
    getCellAriaRole(): string;
    isCellRenderer(): boolean;
    getValueToDisplay(): any;
    getDeferLoadingCellRenderer(): {
        loadingComp: UserCompDetails | undefined;
        onReady: AgPromise<void>;
    };
    private showValue;
    private setupControlComps;
    isForceWrapper(): boolean;
    getCellValueClass(): string;
    /**
     * Wrapper providing general conditions under which control elements (e.g. checkboxes and drag handles)
     * are rendered for a particular cell.
     * @param value Whether to render the control in the specific context of the caller
     * @param allowManuallyPinned Whether manually pinned rows are permitted this form of control element
     */
    private isIncludeControl;
    private isCheckboxSelection;
    private refreshShouldDestroy;
    onPopupEditorClosed(): void;
    /**
     * Ends the Cell Editing
     * @param cancel `True` if the edit process is being canceled.
     * @returns `True` if the value of the `GridCell` has been updated, otherwise `False`.
     */
    stopEditing(cancel?: boolean): boolean;
    private createCellRendererParams;
    onCellChanged(event: CellChangedEvent): void;
    refreshOrDestroyCell(params?: RefreshCellsParams): void;
    refreshCell({ force, suppressFlash, newData }?: RefreshCellsParams & {
        newData?: boolean;
    }): void;
    isCellEditable(): boolean;
    formatValue(value: any): any;
    private callValueFormatter;
    updateAndFormatValue(compareValues: boolean): boolean;
    private valuesAreEqual;
    private addDomData;
    createEvent<T extends AgEventType>(domEvent: Event | null, eventType: T): CellEvent<T>;
    processCharacter(event: KeyboardEvent): void;
    onKeyDown(event: KeyboardEvent): void;
    onMouseEvent(eventName: string, mouseEvent: MouseEvent): void;
    getColSpanningList(): AgColumn[];
    onLeftChanged(): void;
    onDisplayedColumnsChanged(): void;
    private refreshFirstAndLastStyles;
    private refreshAriaColIndex;
    onWidthChanged(): void;
    getRowPosition(): RowPosition;
    updateRangeBordersIfRangeCount(): void;
    onCellSelectionChanged(): void;
    isRangeSelectionEnabled(): boolean;
    focusCell(forceBrowserFocus?: boolean, sourceEvent?: Event): void;
    /**
     * Restores focus to the cell, if it should have it
     * @param waitForRender if the cell has just setComp, it may not be rendered yet, so we wait for the next render
     */
    private restoreFocus;
    onRowIndexChanged(): void;
    onSuppressCellFocusChanged(suppressCellFocus: boolean): void;
    onFirstRightPinnedChanged(): void;
    onLastLeftPinnedChanged(): void;
    /**
     * Returns whether cell is focused by the focusSvc, overridden by spannedCellCtrl
     */
    protected checkCellFocused(): boolean;
    isCellFocused(): boolean;
    setupFocus(): void;
    onCellFocused(event?: CellFocusedEvent): void;
    private createCellPosition;
    protected applyStaticCssClasses(): void;
    onColumnHover(): void;
    onColDefChanged(): void;
    private setWrapText;
    dispatchCellContextMenuEvent(event: Event | null): void;
    getCellRenderer(): ICellRenderer | null;
    destroy(): void;
    hasBrowserFocus(): boolean;
    createSelectionCheckbox(): CheckboxSelectionComponent | undefined;
    createDndSource(): DndSourceComp | undefined;
    registerRowDragger(customElement: HTMLElement, dragStartPixels?: number, alwaysVisible?: boolean): void;
    createRowDragComp(customElement?: HTMLElement, dragStartPixels?: number, alwaysVisible?: boolean): RowDragComp | undefined;
    cellEditorAttached(): void;
    setFocusedCellPosition(_cellPosition: CellPosition): void;
    getFocusedCellPosition(): CellPosition;
    refreshAriaRowIndex(): void;
    /**
     * Returns the root element of the cell, could be a span container rather than the cell element.
     * @returns The root element of the cell.
     */
    getRootElement(): HTMLElement;
}
