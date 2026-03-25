import { BeanStub } from '../../context/beanStub';
import type { ColumnPinnedType } from '../../interfaces/iColumn';
import type { RowCtrl } from '../../rendering/row/rowCtrl';
import type { RowRenderer } from '../../rendering/rowRenderer';
import type { SpannedRowRenderer } from '../../rendering/spanning/spannedRowRenderer';
import type { ScrollPartner } from '../gridBodyScrollFeature';
import { ViewportSizeFeature } from '../viewportSizeFeature';
export type RowContainerName = 'left' | 'right' | 'center' | 'fullWidth' | 'topLeft' | 'topRight' | 'topCenter' | 'topFullWidth' | 'stickyTopLeft' | 'stickyTopRight' | 'stickyTopCenter' | 'stickyTopFullWidth' | 'stickyBottomLeft' | 'stickyBottomRight' | 'stickyBottomCenter' | 'stickyBottomFullWidth' | 'bottomLeft' | 'bottomRight' | 'bottomCenter' | 'bottomFullWidth';
export type RowContainerType = 'left' | 'right' | 'center' | 'fullWidth';
type GetRowCtrls = (renderer: RowRenderer) => RowCtrl[];
type GetSpannedRowCtrls = (renderer: SpannedRowRenderer) => RowCtrl[];
export type RowContainerOptions = {
    type: RowContainerType;
    name: string;
    container?: `ag-${string}`;
    pinnedType?: ColumnPinnedType;
    fullWidth?: boolean;
    getRowCtrls: GetRowCtrls;
    getSpannedRowCtrls?: GetSpannedRowCtrls;
};
export declare function _getRowViewportClass(name: RowContainerName): `ag-${string}-viewport`;
export declare function _getRowContainerClass(name: RowContainerName): `ag-${string}`;
export declare function _getRowSpanContainerClass(name: RowContainerName): `ag-${string}-spanned-cells-container`;
export declare function _getRowContainerOptions(name: RowContainerName): RowContainerOptions;
export interface IRowContainerComp {
    setViewportHeight(height: string): void;
    setHorizontalScroll(offset: number): void;
    setRowCtrls(params: {
        rowCtrls: RowCtrl[];
        useFlushSync?: boolean;
    }): void;
    setSpannedRowCtrls(rowCtrls: RowCtrl[], useFlushSync: boolean): void;
    setDomOrder(domOrder: boolean): void;
    setContainerWidth(width: string): void;
    setOffsetTop(offset: string): void;
}
export declare class RowContainerCtrl extends BeanStub implements ScrollPartner {
    private readonly name;
    private readonly options;
    private comp;
    eContainer: HTMLElement;
    private eSpannedContainer;
    eViewport: HTMLElement;
    private enableRtl;
    viewportSizeFeature: ViewportSizeFeature | undefined;
    private pinnedWidthFeature;
    private visible;
    private EMPTY_CTRLS;
    constructor(name: RowContainerName);
    postConstruct(): void;
    private onStickyTopOffsetChanged;
    private registerWithCtrlsService;
    private forContainers;
    setComp(view: IRowContainerComp, eContainer: HTMLElement, eSpannedContainer: HTMLElement | undefined, eViewport: HTMLElement): void;
    onScrollCallback(fn: () => void): void;
    private addListeners;
    private listenOnDomOrder;
    onDisplayedColumnsChanged(): void;
    private addPreventScrollWhileDragging;
    onHorizontalViewportChanged(afterScroll?: boolean): void;
    hasHorizontalScrollGap(): boolean;
    hasVerticalScrollGap(): boolean;
    getCenterWidth(): number;
    getCenterViewportScrollLeft(): number;
    registerViewportResizeListener(listener: () => void): void;
    isViewportInTheDOMTree(): boolean;
    getViewportScrollLeft(): number;
    isHorizontalScrollShowing(): boolean;
    setHorizontalScroll(offset: number): void;
    getHScrollPosition(): {
        left: number;
        right: number;
    };
    setCenterViewportScrollLeft(value: number): void;
    private isContainerVisible;
    private onPinnedWidthChanged;
    private onDisplayedRowsChanged;
}
export {};
