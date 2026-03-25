import type { ColKey } from '../columns/columnModel';
import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { AgColumn } from '../entities/agColumn';
import type { AgColumnGroup } from '../entities/agColumnGroup';
import type { ColumnEventType } from '../events';
import { SetPinnedWidthFeature } from '../gridBodyComp/rowContainer/setPinnedWidthFeature';
import type { HeaderRowContainerCtrl } from '../headerRendering/rowContainer/headerRowContainerCtrl';
import type { ColumnPinnedType } from '../interfaces/iColumn';
export declare class PinnedColumnService extends BeanStub implements NamedBean {
    beanName: "pinnedCols";
    private gridBodyCtrl;
    leftWidth: number;
    rightWidth: number;
    postConstruct(): void;
    private checkContainerWidths;
    keepPinnedColumnsNarrowerThanViewport(): void;
    createPinnedWidthFeature(isLeft: boolean, ...elements: (HTMLElement | undefined)[]): SetPinnedWidthFeature;
    setColsPinned(keys: ColKey[], pinned: ColumnPinnedType, source: ColumnEventType): void;
    initCol(column: AgColumn): void;
    setColPinned(column: AgColumn, pinned: ColumnPinnedType): void;
    setupHeaderPinnedWidth(ctrl: HeaderRowContainerCtrl): void;
    getHeaderResizeDiff(diff: number, column: AgColumn | AgColumnGroup): number;
    private getPinnedColumnsOverflowingViewport;
}
