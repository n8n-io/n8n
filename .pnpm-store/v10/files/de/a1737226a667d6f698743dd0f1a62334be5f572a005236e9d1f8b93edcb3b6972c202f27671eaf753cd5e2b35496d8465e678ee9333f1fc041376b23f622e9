import { BeanStub } from '../context/beanStub';
import type { AgColumn } from '../entities/agColumn';
import type { IHeaderResizeFeature } from '../headerRendering/cells/abstractCell/abstractHeaderCellCtrl';
import type { HeaderCellCtrl, IHeaderCellComp } from '../headerRendering/cells/column/headerCellCtrl';
import type { ColumnPinnedType } from '../interfaces/iColumn';
export declare class ResizeFeature extends BeanStub implements IHeaderResizeFeature {
    private pinned;
    private column;
    private eResize;
    private comp;
    private ctrl;
    private lastResizeAmount;
    private resizeStartWidth;
    private resizeWithShiftKey;
    constructor(pinned: ColumnPinnedType, column: AgColumn, eResize: HTMLElement, comp: IHeaderCellComp, ctrl: HeaderCellCtrl);
    postConstruct(): void;
    private onResizing;
    private onResizeStart;
    toggleColumnResizing(resizing: boolean): void;
    private normaliseResizeAmount;
}
