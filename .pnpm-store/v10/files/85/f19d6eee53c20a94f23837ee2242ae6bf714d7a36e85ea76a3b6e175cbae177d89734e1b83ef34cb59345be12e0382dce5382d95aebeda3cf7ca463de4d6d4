import type { NamedBean } from './context/bean';
import { BeanStub } from './context/beanStub';
import type { BeanCollection } from './context/context';
import type { AgColumn } from './entities/agColumn';
import type { CellFocusedParams } from './events';
import type { HeaderCellCtrl } from './headerRendering/cells/column/headerCellCtrl';
import type { TabToNextHeaderParams } from './interfaces/iCallbackParams';
import type { CellPosition } from './interfaces/iCellPosition';
import type { WithoutGridCommon } from './interfaces/iCommon';
import type { HeaderPosition } from './interfaces/iHeaderPosition';
import type { RowPinnedType } from './interfaces/iRowNode';
export declare class FocusService extends BeanStub implements NamedBean {
    beanName: "focusSvc";
    private colModel;
    private visibleCols;
    private rowRenderer;
    private navigation?;
    private filterManager?;
    private overlays?;
    wireBeans(beans: BeanCollection): void;
    private focusedCell;
    private previousCellFocusParams;
    focusedHeader: HeaderPosition | null;
    /** the column that had focus before it moved into the advanced filter */
    private advFilterFocusColumn;
    /** If a cell was destroyed that previously had focus, focus needs restored when the cell reappears */
    private focusFallbackTimeout;
    private needsFocusRestored;
    postConstruct(): void;
    attemptToRecoverFocus(): void;
    private setFocusRecovered;
    /**
     * Specifies whether to take focus, as grid either already has focus, or lost it due
     * to a destroyed cell
     * @returns true if the grid should re-take focus, otherwise false
     */
    shouldTakeFocus(): boolean;
    onColumnEverythingChanged(): void;
    getFocusCellToUseAfterRefresh(): CellPosition | null;
    getFocusHeaderToUseAfterRefresh(): HeaderPosition | null;
    /**
     * Check for both cells and rows, as a row might be destroyed and the dom data removed before the cell if the
     * row is animating out.
     */
    doesRowOrCellHaveBrowserFocus(): boolean;
    private isDomDataPresentInHierarchy;
    getFocusedCell(): CellPosition | null;
    private getFocusEventParams;
    clearFocusedCell(): void;
    setFocusedCell(params: CellFocusedParams): void;
    isCellFocused(cellPosition: CellPosition): boolean;
    isHeaderWrapperFocused(headerCtrl: HeaderCellCtrl): boolean;
    focusHeaderPosition(params: {
        headerPosition: HeaderPosition | null;
        direction?: 'Before' | 'After' | null;
        fromTab?: boolean;
        allowUserOverride?: boolean;
        event?: KeyboardEvent;
        fromCell?: boolean;
        rowWithoutSpanValue?: number;
    }): boolean;
    focusHeaderPositionFromUserFunc(params: {
        userFunc: (params: WithoutGridCommon<TabToNextHeaderParams>) => boolean | HeaderPosition;
        headerPosition: HeaderPosition | null;
        direction?: 'Before' | 'After' | null;
        event?: KeyboardEvent;
    }): boolean;
    private getHeaderPositionFromUserFunc;
    private focusProvidedHeaderPosition;
    focusFirstHeader(): boolean;
    focusLastHeader(event?: KeyboardEvent): boolean;
    focusPreviousFromFirstCell(event?: KeyboardEvent): boolean;
    isAnyCellFocused(): boolean;
    isRowFocused(rowIndex: number, rowPinnedType: RowPinnedType): boolean;
    focusOverlay(backwards?: boolean): boolean;
    focusGridView(params: {
        column?: AgColumn;
        backwards?: boolean;
        canFocusOverlay?: boolean;
        event?: KeyboardEvent;
    }): boolean;
    private focusAdvancedFilter;
    focusNextFromAdvancedFilter(backwards?: boolean, forceFirstColumn?: boolean): boolean;
    clearAdvancedFilterColumn(): void;
}
