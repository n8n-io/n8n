import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { BeanCollection } from '../context/context';
import type { GridOptions } from '../entities/gridOptions';
import type { RowNode } from '../entities/rowNode';
import type { ClientSideRowModelStage } from '../interfaces/iClientSideRowModel';
import type { IRowNodeStage, StageExecuteParams } from '../interfaces/iRowNodeStage';
export declare function updateRowNodeAfterFilter(rowNode: RowNode): void;
export declare class FilterStage extends BeanStub implements IRowNodeStage, NamedBean {
    beanName: "filterStage";
    readonly step: ClientSideRowModelStage;
    readonly refreshProps: (keyof GridOptions<any>)[];
    private filterManager?;
    wireBeans(beans: BeanCollection): void;
    execute(params: StageExecuteParams): void;
    private filter;
    private filterNodes;
    private doingTreeDataFiltering;
}
