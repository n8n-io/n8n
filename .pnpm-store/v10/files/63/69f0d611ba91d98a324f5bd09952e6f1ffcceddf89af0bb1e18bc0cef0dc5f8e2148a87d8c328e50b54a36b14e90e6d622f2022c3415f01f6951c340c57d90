import type { AgColumn } from '../entities/agColumn';
import type { CheckboxSelectionCallback } from '../entities/colDef';
import type { RowNode } from '../entities/rowNode';
import type { GroupCheckboxSelectionCallback } from '../interfaces/groupCellRenderer';
import { Component } from '../widgets/component';
export declare class CheckboxSelectionComponent extends Component {
    private readonly eCheckbox;
    private rowNode;
    private column;
    private overrides?;
    constructor();
    postConstruct(): void;
    private onDataChanged;
    private onSelectableChanged;
    private onSelectionChanged;
    init(params: {
        rowNode: RowNode;
        column?: AgColumn;
        overrides?: {
            isVisible: boolean | CheckboxSelectionCallback | GroupCheckboxSelectionCallback | undefined;
            callbackParams: any;
            removeHidden: boolean;
        };
    }): void;
    private showOrHideSelect;
    private getIsVisible;
}
