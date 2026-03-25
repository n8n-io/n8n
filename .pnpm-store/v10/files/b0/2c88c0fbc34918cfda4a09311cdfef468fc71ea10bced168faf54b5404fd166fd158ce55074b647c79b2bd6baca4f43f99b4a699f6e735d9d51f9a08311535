import { BeanStub } from '../context/beanStub';
import type { BeanCollection } from '../context/context';
import type { AgColumn } from '../entities/agColumn';
import type { ColumnEventType } from '../events';
import type { IAggFuncService } from '../interfaces/iAggFuncService';
import type { ColumnExtractors, ColumnOrdering, ColumnProcessor, ColumnProcessors, IColsService } from '../interfaces/iColsService';
import type { ColumnChangedEventType } from './columnApi';
import { dispatchColumnChangedEvent } from './columnEventUtils';
import type { ColKey, ColumnModel, Maybe } from './columnModel';
import type { ColumnState, ColumnStateParams } from './columnStateUtils';
import type { VisibleColsService } from './visibleColsService';
export declare abstract class BaseColsService extends BeanStub implements IColsService {
    protected colModel: ColumnModel;
    protected aggFuncSvc?: IAggFuncService;
    protected visibleCols: VisibleColsService;
    protected dispatchColumnChangedEvent: typeof dispatchColumnChangedEvent;
    abstract eventName: ColumnChangedEventType;
    abstract columnProcessors: ColumnProcessors;
    abstract columnExtractors: ColumnExtractors;
    columnOrdering: ColumnOrdering;
    columns: AgColumn[];
    columnIndexMap: {
        [key: string]: number;
    };
    wireBeans(beans: BeanCollection): void;
    sortColumns(compareFn?: (a: AgColumn, b: AgColumn) => number): void;
    setColumns(colKeys: ColKey[] | undefined, source: ColumnEventType): void;
    addColumns(colKeys: ColKey[] | undefined, source: ColumnEventType): void;
    removeColumns(colKeys: ColKey[] | undefined, source: ColumnEventType): void;
    getColumnIndex(colId: string): number | undefined;
    protected updateIndexMap: () => void;
    protected setColList(colKeys: ColKey[] | undefined, masterList: AgColumn[], eventName: IColsService['eventName'], detectOrderChange: boolean, autoGroupsNeedBuilding: boolean, columnCallback: ColumnProcessor, source: ColumnEventType): void;
    protected updateColList(keys: Maybe<ColKey>[] | undefined, masterList: AgColumn[], actionIsAdd: boolean, autoGroupsNeedBuilding: boolean, columnCallback: ColumnProcessor, eventType: IColsService['eventName'], source: ColumnEventType): void;
    extractCols(source: ColumnEventType, oldProvidedCols?: AgColumn[]): AgColumn[];
    abstract syncColumnWithState(column: AgColumn, source: ColumnEventType, getValue: <U extends keyof ColumnStateParams, S extends keyof ColumnStateParams>(key1: U, key2?: S) => {
        value1: ColumnStateParams[U] | undefined;
        value2: ColumnStateParams[S] | undefined;
    }, rowIndex: {
        [key: string]: number;
    } | null): void;
    restoreColumnOrder(columnStateAccumulator: {
        [colId: string]: ColumnState;
    }, incomingColumnState: {
        [colId: string]: ColumnState;
    }): {
        [colId: string]: ColumnState;
    };
}
