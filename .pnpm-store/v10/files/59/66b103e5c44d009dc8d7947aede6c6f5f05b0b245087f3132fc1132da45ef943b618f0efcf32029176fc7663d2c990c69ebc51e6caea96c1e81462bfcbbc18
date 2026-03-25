import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { AgColumn } from '../entities/agColumn';
import type { AgColumnGroup } from '../entities/agColumnGroup';
import type { AgProvidedColumnGroup } from '../entities/agProvidedColumnGroup';
import type { HeaderLocation } from '../entities/colDef';
export declare class ColumnNameService extends BeanStub implements NamedBean {
    beanName: "colNames";
    getDisplayNameForColumn(column: AgColumn | null, location: HeaderLocation, includeAggFunc?: boolean): string | null;
    getDisplayNameForProvidedColumnGroup(columnGroup: AgColumnGroup | null, providedColumnGroup: AgProvidedColumnGroup | null, location: HeaderLocation): string | null;
    getDisplayNameForColumnGroup(columnGroup: AgColumnGroup, location: HeaderLocation): string | null;
    private getHeaderName;
}
