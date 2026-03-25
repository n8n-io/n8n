import { BeanStub } from '../../context/beanStub';
import type { BeanCollection } from '../../context/context';
import type { RowNode } from '../../entities/rowNode';
import type { RowCtrl } from '../row/rowCtrl';
import type { SpannedCellCtrl } from '../spanning/spannedCellCtrl';
import type { CellCtrl } from './cellCtrl';
export declare class CellKeyboardListenerFeature extends BeanStub {
    private readonly cellCtrl;
    private readonly rowNode;
    private readonly rowCtrl;
    private eGui;
    constructor(cellCtrl: CellCtrl | SpannedCellCtrl, beans: BeanCollection, rowNode: RowNode, rowCtrl: RowCtrl);
    init(): void;
    onKeyDown(event: KeyboardEvent): void;
    private onNavigationKeyDown;
    private onShiftRangeSelect;
    private onTabKeyDown;
    private onBackspaceOrDeleteKeyDown;
    private onEnterKeyDown;
    isCtrlEnter(e: KeyboardEvent): boolean;
    private onF2KeyDown;
    private onEscapeKeyDown;
    processCharacter(event: KeyboardEvent): void;
    private onSpaceKeyDown;
}
