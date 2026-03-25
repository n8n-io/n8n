import { BeanStub } from '../../context/beanStub';
import type { AgColumn } from '../../entities/agColumn';
import type { AgColumnGroup } from '../../entities/agColumnGroup';
import type { ScrollPartner } from '../../gridBodyComp/gridBodyScrollFeature';
import type { ColumnPinnedType } from '../../interfaces/iColumn';
import type { AbstractHeaderCellCtrl } from '../cells/abstractCell/abstractHeaderCellCtrl';
import type { HeaderRowType } from '../row/headerRowComp';
import { HeaderRowCtrl } from '../row/headerRowCtrl';
export interface IHeaderRowContainerComp {
    setCenterWidth(width: string): void;
    setViewportScrollLeft(left: number): void;
    setPinnedContainerWidth(width: string): void;
    setDisplayed(displayed: boolean): void;
    setCtrls(ctrls: HeaderRowCtrl[]): void;
}
export declare class HeaderRowContainerCtrl extends BeanStub implements ScrollPartner {
    readonly pinned: ColumnPinnedType;
    comp: IHeaderRowContainerComp;
    hidden: boolean;
    private includeFloatingFilter;
    private filtersRowCtrl;
    private columnsRowCtrl;
    private groupsRowCtrls;
    eViewport: HTMLElement;
    constructor(pinned: ColumnPinnedType);
    setComp(comp: IHeaderRowContainerComp, eGui: HTMLElement): void;
    getAllCtrls(): HeaderRowCtrl[];
    refresh(keepColumns?: boolean): void;
    getHeaderCtrlForColumn(column: AgColumn | AgColumnGroup): AbstractHeaderCellCtrl | undefined;
    getHtmlElementForColumnHeader(column: AgColumn | AgColumnGroup): HTMLElement | null;
    getRowType(rowIndex: number): HeaderRowType | undefined;
    focusHeader(rowIndex: number, column: AgColumn | AgColumnGroup, event?: KeyboardEvent): boolean;
    getGroupRowCount(): number;
    getGroupRowCtrlAtIndex(index: number): HeaderRowCtrl;
    getRowCount(): number;
    setHorizontalScroll(offset: number): void;
    onScrollCallback(fn: () => void): void;
    destroy(): void;
    private setupDragAndDrop;
    private restoreFocusOnHeader;
    private setupCenterWidth;
}
