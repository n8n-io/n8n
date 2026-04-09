import { BeanStub } from '../../context/beanStub';
import type { BeanCollection } from '../../context/context';
import type { ICellStyleFeature } from '../../interfaces/iCellStyleFeature';
import type { CellCtrl, ICellComp } from '../../rendering/cell/cellCtrl';
export declare class CellEditStyleFeature extends BeanStub implements ICellStyleFeature {
    private readonly cellCtrl;
    private cellComp;
    private readonly editSvc?;
    private readonly editModelSvc?;
    constructor(cellCtrl: CellCtrl, beans: BeanCollection);
    setComp(comp: ICellComp): void;
    applyCellStyles(): void;
    private applyBatchingStyle;
}
