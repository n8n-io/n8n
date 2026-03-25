import type { BeanCollection, BeanName } from '../context/context';
import type { GenericBean } from '../context/genericBean';
import type { ICellComp } from '../rendering/cell/cellCtrl';
export interface ICellStyleFeature extends GenericBean<BeanName, BeanCollection> {
    setComp(comp: ICellComp): void;
    applyCellStyles?(): void;
    applyCellClassRules?(): void;
    applyUserStyles?(): void;
    applyClassesFromColDef?(): void;
}
