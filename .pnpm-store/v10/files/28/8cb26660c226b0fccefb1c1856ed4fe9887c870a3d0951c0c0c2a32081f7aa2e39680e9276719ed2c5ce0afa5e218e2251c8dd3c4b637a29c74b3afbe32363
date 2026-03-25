import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { BeanName } from '../context/context';
import type { AgColumn } from '../entities/agColumn';
import type { ValueGetterFunc } from '../entities/colDef';
import type { IRowNode } from '../interfaces/iRowNode';
export declare class FilterValueService extends BeanStub implements NamedBean {
    beanName: BeanName;
    getValue(column: AgColumn, rowNode?: IRowNode | null, filterValueGetterOverride?: string | ValueGetterFunc): any;
    private executeFilterValueGetter;
}
