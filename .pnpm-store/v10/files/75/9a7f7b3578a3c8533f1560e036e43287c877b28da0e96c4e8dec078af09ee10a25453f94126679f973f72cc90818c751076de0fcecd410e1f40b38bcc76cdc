import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { BeanCollection } from '../context/context';
import type { AgColumn } from '../entities/agColumn';
import type { ColDef, ColGroupDef } from '../entities/colDef';
export declare function _deepCloneDefinition<T>(object: T, keysToSkip?: string[]): T | undefined;
export declare class ColumnDefFactory extends BeanStub implements NamedBean {
    beanName: "colDefFactory";
    private rowGroupColsSvc?;
    private pivotColsSvc?;
    wireBeans(beans: BeanCollection): void;
    getColumnDefs(colDefColsList: AgColumn[], showingPivotResult: boolean, lastOrder: AgColumn[] | null, colsList: AgColumn[]): (ColDef | ColGroupDef)[] | undefined;
    private buildColumnDefs;
    private createDefFromGroup;
    private createDefFromColumn;
}
