import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { BeanCollection } from '../context/context';
import type { ExportParams } from '../interfaces/exportParams';
import type { GridSerializingSession } from './iGridSerializer';
export declare class GridSerializer extends BeanStub implements NamedBean {
    beanName: "gridSerializer";
    private visibleCols;
    private colModel;
    private rowModel;
    private pinnedRowModel?;
    wireBeans(beans: BeanCollection): void;
    serialize<T>(gridSerializingSession: GridSerializingSession<T>, params?: ExportParams<T>): string;
    private processRow;
    private appendContent;
    private prependContent;
    private prepareSession;
    private exportColumnGroups;
    private exportHeaders;
    private processPinnedTopRows;
    private processRows;
    private replicateSortedOrder;
    private processPinnedBottomRows;
    private getColumnsToExport;
    private recursivelyAddHeaderGroups;
    private doAddHeaderHeader;
}
