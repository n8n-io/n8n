import type { AgColumn } from '../../entities/agColumn';
import type { RowContainerType } from '../../gridBodyComp/rowContainer/rowContainerCtrl';
import type { CellCtrl } from '../cell/cellCtrl';
import { RowCtrl } from '../row/rowCtrl';
export declare class SpannedRowCtrl extends RowCtrl {
    protected onRowIndexChanged(): void;
    protected getInitialRowClasses(_rowContainerType: RowContainerType): string[];
    protected getNewCellCtrl(col: AgColumn<any>): CellCtrl | undefined;
    protected isCorrectCtrlForSpan(cell: CellCtrl): boolean;
    /**
     * Below overrides are explicitly disabling styling and other unwanted behaviours for spannedRowCtrl
     */
    protected onRowHeightChanged(): void;
    protected refreshFirstAndLastRowStyles(): void;
    protected addHoverFunctionality(): void;
    resetHoveredStatus(): void;
}
