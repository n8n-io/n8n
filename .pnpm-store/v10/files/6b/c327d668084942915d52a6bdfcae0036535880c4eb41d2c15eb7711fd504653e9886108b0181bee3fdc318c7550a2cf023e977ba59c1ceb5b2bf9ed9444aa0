import { BeanStub } from '../context/beanStub';
import type { BeanCollection } from '../context/context';
import type { AgColumn } from '../entities/agColumn';
import type { HeaderCellCtrl } from '../headerRendering/cells/column/headerCellCtrl';
export declare class SelectAllFeature extends BeanStub {
    private readonly column;
    private cbSelectAllVisible;
    private processingEventFromCheckbox;
    private headerCellCtrl;
    private cbSelectAll;
    constructor(column: AgColumn);
    onSpaceKeyDown(e: KeyboardEvent): void;
    getCheckboxGui(): HTMLElement;
    setComp(ctrl: HeaderCellCtrl): void;
    private onDisplayedColumnsChanged;
    private showOrHideSelectAll;
    private updateStateOfCheckbox;
    private refreshSelectAllLabel;
    private checkSelectionType;
    private checkRightRowModelType;
    private onCbSelectAll;
    /**
     * Checkbox is enabled when either the `headerCheckbox` option is enabled in the new selection API
     * or `headerCheckboxSelection` is enabled in the legacy API.
     */
    private isCheckboxSelection;
    private getSelectAllMode;
    destroy(): void;
}
export declare function isCheckboxSelection({ gos, selectionColSvc }: BeanCollection, column: AgColumn): boolean;
