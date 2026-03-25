import type { NamedBean } from '../../context/bean';
import { BeanStub } from '../../context/beanStub';
import type { CellPosition } from '../../interfaces/iCellPosition';
import type { RowPinnedType } from '../../interfaces/iRowNode';
import type { CellCtrl } from '../cell/cellCtrl';
import type { RowCtrl } from '../row/rowCtrl';
export declare class SpannedRowRenderer extends BeanStub<'spannedRowsUpdated'> implements NamedBean {
    beanName: "spannedRowRenderer";
    postConstruct(): void;
    private topCtrls;
    private bottomCtrls;
    private centerCtrls;
    private createAllCtrls;
    /**
     * When displayed rows or cols change, the spanned cell ctrls need to update
     */
    createCtrls(ctrlsKey: 'top' | 'bottom' | 'center'): void;
    private getAllRelevantRowControls;
    getCellByPosition(cellPosition: CellPosition): CellCtrl | undefined;
    getCtrls(container: 'top' | 'bottom' | 'center'): RowCtrl[];
    private destroyRowCtrls;
    destroy(): void;
}
export declare const _normalisePinnedValue: (pinned: RowPinnedType) => 'top' | 'bottom' | 'center';
