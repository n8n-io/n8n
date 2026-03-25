import type { GridApi } from '../api/gridApi';
import type { AgColumn } from '../entities/agColumn';
import type { GridOptions, SelectAllMode } from '../entities/gridOptions';
import type { RowNode } from '../entities/rowNode';
import type { SelectionEventSourceType } from '../events';
import type { RowCtrl, RowGui } from '../rendering/row/rowCtrl';
import type { CheckboxSelectionComponent } from '../selection/checkboxSelectionComponent';
import type { SelectAllFeature } from '../selection/selectAllFeature';
import type { ChangedPath } from '../utils/changedPath';
import type { IRowNode } from './iRowNode';
import type { ServerSideRowGroupSelectionState, ServerSideRowSelectionState } from './selectionState';
export interface ISelectionService {
    getSelectionState(): string[] | ServerSideRowSelectionState | ServerSideRowGroupSelectionState | null;
    setSelectionState(state: string[] | ServerSideRowSelectionState | ServerSideRowGroupSelectionState | undefined, source: SelectionEventSourceType, clearSelection?: boolean): void;
    getSelectedNodes(): RowNode<any>[];
    getSelectedRows(): any[];
    getSelectionCount(): number;
    setNodesSelected(params: ISetNodesSelectedParams): number;
    filterFromSelection?(predicate: (node: RowNode) => boolean): void;
    /** Should only be called if groupSelects = 'descendants' or 'filteredDescendants' in CSRM */
    updateGroupsFromChildrenSelections?(source: SelectionEventSourceType, changedPath?: ChangedPath): boolean;
    syncInRowNode(rowNode: RowNode, oldNode?: RowNode): void;
    reset(source: SelectionEventSourceType): void;
    getBestCostNodeSelection(): RowNode[] | undefined;
    isEmpty(): boolean;
    /**
     * @param selectAll See `MultiRowSelectionOptions.selectAll`
     * @returns all nodes including unselectable nodes which are the target of this selection attempt
     */
    getSelectAllState(selectAll?: SelectAllMode): boolean | null;
    hasNodesToSelect(selectAll?: SelectAllMode): boolean;
    selectAllRowNodes(params: {
        source: SelectionEventSourceType;
        selectAll?: SelectAllMode;
    }): void;
    deselectAllRowNodes(params: {
        source: SelectionEventSourceType;
        selectAll?: SelectAllMode;
    }): void;
    createCheckboxSelectionComponent(): CheckboxSelectionComponent;
    createSelectAllFeature(column: AgColumn): SelectAllFeature | undefined;
    onRowCtrlSelected(rowCtrl: RowCtrl, hasFocusFunc: (gui: RowGui) => void, gui?: RowGui): void;
    announceAriaRowSelection(rowNode: RowNode): void;
    /** Called after grouping / treeData */
    updateSelectableAfterGrouping(changedPath: ChangedPath | undefined): void;
    updateRowSelectable(rowNode: RowNode, suppressSelectionUpdate?: boolean): boolean;
    selectRowNode(rowNode: RowNode, newValue?: boolean, e?: Event, source?: SelectionEventSourceType): boolean;
    createDaemonNode?(rowNode: RowNode): RowNode | undefined;
    handleSelectionEvent(event: MouseEvent | KeyboardEvent, rowNode: RowNode, source: SelectionEventSourceType): number;
    isCellCheckboxSelection(column: AgColumn, rowNode: IRowNode): boolean;
    refreshMasterNodeState(node: RowNode, e?: Event): void;
    setDetailSelectionState(masterNode: RowNode, option: GridOptions, detailApi: GridApi): void;
}
export interface ISetNodesSelectedParams {
    /** nodes to change selection of */
    nodes: readonly RowNode[];
    /** true or false, whatever you want to set selection to */
    newValue: boolean;
    /** whether to remove other selections after this selection is done */
    clearSelection?: boolean;
    /** true when action is NOT on this node, ie user clicked a group and this is the child of a group */
    suppressFinishActions?: boolean;
    /** event source, if from an event */
    source: SelectionEventSourceType;
    /** originating event */
    event?: Event;
}
