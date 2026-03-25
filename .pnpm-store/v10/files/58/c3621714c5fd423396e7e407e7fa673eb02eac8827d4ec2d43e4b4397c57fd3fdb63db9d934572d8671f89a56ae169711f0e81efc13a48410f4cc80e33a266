import type { ColDef, ColGroupDef } from '../entities/colDef';
import type { ColumnToolPanelState } from './gridState';
import type { IToolPanel } from './iToolPanel';
export interface IColumnToolPanel extends IToolPanel {
    expandColumnGroups(groupIds?: string[]): void;
    collapseColumnGroups(groupIds?: string[]): void;
    setColumnLayout(colDefs: (ColDef | ColGroupDef)[]): void;
    syncLayoutWithGrid(): void;
    setPivotModeSectionVisible(visible: boolean): void;
    setRowGroupsSectionVisible(visible: boolean): void;
    setValuesSectionVisible(visible: boolean): void;
    setPivotSectionVisible(visible: boolean): void;
    getState(): ColumnToolPanelState;
}
