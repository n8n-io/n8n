import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { BeanCollection } from '../context/context';
import type { CellClassParams, ColDef } from '../entities/colDef';
import type { CellCtrl } from '../rendering/cell/cellCtrl';
import { CellCustomStyleFeature } from './cellCustomStyleFeature';
export declare class CellStyleService extends BeanStub implements NamedBean {
    beanName: "cellStyles";
    processAllCellClasses(colDef: ColDef, params: CellClassParams, onApplicableClass: (className: string) => void, onNotApplicableClass?: (className: string) => void): void;
    getStaticCellClasses(colDef: ColDef, params: CellClassParams): string[];
    createCellCustomStyleFeature(ctrl: CellCtrl, beans: BeanCollection): CellCustomStyleFeature;
    private processStaticCellClasses;
}
