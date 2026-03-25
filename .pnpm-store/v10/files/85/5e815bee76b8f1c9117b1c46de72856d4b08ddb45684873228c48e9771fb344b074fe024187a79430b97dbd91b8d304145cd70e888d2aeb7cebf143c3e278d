import { BeanStub } from '../../context/beanStub';
import type { BeanCollection } from '../../context/context';
import type { AgColumn } from '../../entities/agColumn';
import type { CellCtrl } from './cellCtrl';
/**
 * Takes care of:
 *  #) Cell Width (including when doing cell spanning, which makes width cover many columns)
 *  #) Cell Height (when doing row span, otherwise we don't touch the height as it's just row height)
 *  #) Cell Left (the horizontal positioning of the cell, the vertical positioning is on the row)
 */
export declare class CellPositionFeature extends BeanStub {
    private readonly cellCtrl;
    private readonly column;
    private readonly rowNode;
    private eSetLeft;
    private eContent;
    private colsSpanning;
    private rowSpan;
    constructor(cellCtrl: CellCtrl, beans: BeanCollection);
    private setupRowSpan;
    init(): void;
    private refreshSpanHeight;
    private onNewColumnsLoaded;
    private onDisplayColumnsChanged;
    private setupColSpan;
    onWidthChanged(): void;
    private getCellWidth;
    getColSpanningList(): AgColumn[];
    onLeftChanged(): void;
    private getCellLeft;
    private modifyLeftForPrintLayout;
    private _legacyApplyRowSpan;
    destroy(): void;
}
