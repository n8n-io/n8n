import { BeanStub } from '../context/beanStub';
import type { AgColumn } from '../entities/agColumn';
import type { IsRowSelectable } from '../entities/gridOptions';
import type { RowNode } from '../entities/rowNode';
import type { SelectionEventSourceType } from '../events';
import type { IRowNode } from '../interfaces/iRowNode';
import type { ISetNodesSelectedParams } from '../interfaces/iSelectionService';
import type { RowCtrl, RowGui } from '../rendering/row/rowCtrl';
import type { ChangedPath } from '../utils/changedPath';
import { CheckboxSelectionComponent } from './checkboxSelectionComponent';
import { RowRangeSelectionContext } from './rowRangeSelectionContext';
import { SelectAllFeature } from './selectAllFeature';
export declare abstract class BaseSelectionService extends BeanStub {
    protected isRowSelectable?: IsRowSelectable;
    protected selectionCtx: RowRangeSelectionContext;
    postConstruct(): void;
    destroy(): void;
    createCheckboxSelectionComponent(): CheckboxSelectionComponent;
    createSelectAllFeature(column: AgColumn): SelectAllFeature | undefined;
    protected isMultiSelect(): boolean;
    onRowCtrlSelected(rowCtrl: RowCtrl, hasFocusFunc: (gui: RowGui) => void, gui?: RowGui): void;
    announceAriaRowSelection(rowNode: RowNode): void;
    updateGroupsFromChildrenSelections?(source: SelectionEventSourceType, changedPath?: ChangedPath): boolean;
    abstract setNodesSelected(params: ISetNodesSelectedParams): number;
    protected abstract updateSelectable(changedPath?: ChangedPath): void;
    protected isRowSelectionBlocked(rowNode: RowNode): boolean;
    updateRowSelectable(rowNode: RowNode, suppressSelectionUpdate?: boolean): boolean;
    protected setRowSelectable(rowNode: RowNode, newVal: boolean, suppressSelectionUpdate?: boolean): void;
    protected calculateSelectedFromChildren(rowNode: RowNode): boolean | undefined | null;
    selectRowNode(rowNode: RowNode, newValue?: boolean, e?: Event, source?: SelectionEventSourceType): boolean;
    isCellCheckboxSelection(column: AgColumn, rowNode: IRowNode): boolean;
    protected inferNodeSelections(node: RowNode, shiftKey: boolean, metaKey: boolean, source: SelectionEventSourceType): null | NodeSelection;
}
interface SingleNodeSelection {
    node: RowNode;
    newValue: boolean;
    clearSelection: boolean;
    keepDescendants?: boolean;
    checkFilteredNodes?: boolean;
}
interface MultiNodeSelection {
    select: readonly RowNode[];
    deselect: readonly RowNode[];
    reset: boolean;
}
type NodeSelection = SingleNodeSelection | MultiNodeSelection;
export {};
