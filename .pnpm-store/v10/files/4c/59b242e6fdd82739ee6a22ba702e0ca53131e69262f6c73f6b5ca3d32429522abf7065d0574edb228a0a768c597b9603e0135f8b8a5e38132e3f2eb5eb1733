import type { NamedBean } from '../../context/bean';
import { BeanStub } from '../../context/beanStub';
import type { CellPosition } from '../../interfaces/iCellPosition';
import type { CellCtrl } from '../cell/cellCtrl';
import type { RowCtrl } from '../row/rowCtrl';
type SpannedRowContainerType = 'top' | 'bottom' | 'center';
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
    createCtrls(ctrlsKey: SpannedRowContainerType): void;
    private getAllRelevantRowControls;
    getCellByPosition(cellPosition: CellPosition): CellCtrl | undefined;
    getCtrls(container: 'top' | 'bottom' | 'center'): RowCtrl[];
    private destroyRowCtrls;
    private getCtrlsMap;
    private setCtrlsMap;
    destroy(): void;
}
export {};
