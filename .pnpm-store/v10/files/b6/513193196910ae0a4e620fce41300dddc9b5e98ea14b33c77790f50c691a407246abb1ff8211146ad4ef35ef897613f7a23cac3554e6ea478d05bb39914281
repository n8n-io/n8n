import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { RowNode } from '../entities/rowNode';
export declare class ValueCache extends BeanStub implements NamedBean {
    beanName: "valueCache";
    private cacheVersion;
    private active;
    private neverExpires;
    postConstruct(): void;
    onDataChanged(): void;
    expire(): void;
    setValue(rowNode: RowNode, colId: string, value: any): any;
    getValue(rowNode: RowNode, colId: string): any;
}
