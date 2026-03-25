import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { RowStyle } from '../entities/gridOptions';
import type { RowNode } from '../entities/rowNode';
export declare function calculateRowLevel(rowNode: RowNode): number;
export declare class RowStyleService extends BeanStub implements NamedBean {
    beanName: "rowStyleSvc";
    processClassesFromGridOptions(classes: string[], rowNode: RowNode): void;
    preProcessRowClassRules(classes: string[], rowNode: RowNode): void;
    processRowClassRules(rowNode: RowNode, onApplicableClass: (className: string) => void, onNotApplicableClass?: (className: string) => void): void;
    processStylesFromGridOptions(rowNode: RowNode): RowStyle | undefined;
}
