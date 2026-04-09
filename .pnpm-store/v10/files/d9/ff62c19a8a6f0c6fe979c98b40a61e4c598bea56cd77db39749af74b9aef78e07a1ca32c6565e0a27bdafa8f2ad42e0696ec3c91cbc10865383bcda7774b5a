import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { AgColumn } from '../entities/agColumn';
import type { AgColumnGroup } from '../entities/agColumnGroup';
import type { ColKey } from '../entities/colDef';
import type { ColumnEventType } from '../events';
import type { HeaderCellCtrl, IHeaderCellComp } from '../headerRendering/cells/column/headerCellCtrl';
import type { IHeaderGroupCellComp } from '../headerRendering/cells/columnGroup/headerGroupCellCtrl';
import type { ColumnPinnedType } from '../interfaces/iColumn';
import { GroupResizeFeature } from './groupResizeFeature';
import { ResizeFeature } from './resizeFeature';
export interface ColumnResizeSet {
    columns: AgColumn[];
    ratios: number[];
    width: number;
}
export declare class ColumnResizeService extends BeanStub implements NamedBean {
    beanName: "colResize";
    setColumnWidths(columnWidths: {
        key: ColKey;
        newWidth: number;
    }[], shiftKey: boolean, // @takeFromAdjacent - if user has 'shift' pressed, then pixels are taken from adjacent column
    finished: boolean, // @finished - ends up in the event, tells the user if more events are to come
    source: ColumnEventType): void;
    resizeColumnSets(params: {
        resizeSets: ColumnResizeSet[];
        finished: boolean;
        source: ColumnEventType;
    }): void;
    resizeHeader(column: AgColumn, delta: number, shiftKey: boolean): void;
    createResizeFeature(pinned: ColumnPinnedType, column: AgColumn, eResize: HTMLElement, comp: IHeaderCellComp, ctrl: HeaderCellCtrl): ResizeFeature;
    createGroupResizeFeature(comp: IHeaderGroupCellComp, eResize: HTMLElement, pinned: ColumnPinnedType, columnGroup: AgColumnGroup): GroupResizeFeature;
}
