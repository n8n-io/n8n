import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { GridOptions } from '../entities/gridOptions';
import type { RowNode } from '../entities/rowNode';
import type { ClientSideRowModelStage } from '../interfaces/iClientSideRowModel';
import type { IRowNodeStage, StageExecuteParams } from '../interfaces/iRowNodeStage';
export declare function updateRowNodeAfterSort(rowNode: RowNode): void;
export declare class SortStage extends BeanStub implements NamedBean, IRowNodeStage {
    beanName: "sortStage";
    refreshProps: Set<keyof GridOptions<any>>;
    step: ClientSideRowModelStage;
    execute(params: StageExecuteParams): void;
    private sort;
}
