import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { AgColumn } from '../entities/agColumn';
import type { ColumnEventType } from '../events';
export declare class ColumnFlexService extends BeanStub implements NamedBean {
    beanName: "colFlex";
    private flexViewportWidth;
    private columnsHidden;
    refreshFlexedColumns(params?: {
        resizingCols?: AgColumn[];
        skipSetLeft?: boolean;
        viewportWidth?: number;
        source?: ColumnEventType;
        fireResizedEvent?: boolean;
        updateBodyWidths?: boolean;
    }): AgColumn[];
    private revealColumns;
    initCol(column: AgColumn): void;
    setColFlex(column: AgColumn, flex: number | null): void;
}
