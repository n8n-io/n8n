import type { GridApi } from '../api/gridApi';
import type { NamedBean } from '../context/bean';
import type { GridOptions, SelectAllMode } from '../entities/gridOptions';
import { RowNode } from '../entities/rowNode';
import type { SelectionEventSourceType } from '../events';
import type { ISelectionService, ISetNodesSelectedParams } from '../interfaces/iSelectionService';
import type { ServerSideRowGroupSelectionState, ServerSideRowSelectionState } from '../interfaces/selectionState';
import { ChangedPath } from '../utils/changedPath';
import { BaseSelectionService } from './baseSelectionService';
export declare class SelectionService extends BaseSelectionService implements NamedBean, ISelectionService {
    beanName: "selectionSvc";
    private selectedNodes;
    /** Only used to track detail grid selection state when master/detail is enabled */
    private readonly detailSelection;
    private groupSelectsDescendants;
    private groupSelectsFiltered;
    private mode?;
    private masterSelectsDetail;
    postConstruct(): void;
    destroy(): void;
    handleSelectionEvent(event: MouseEvent | KeyboardEvent, rowNode: RowNode, source: SelectionEventSourceType): number;
    setNodesSelected({ newValue, clearSelection, suppressFinishActions, nodes, event, source, keepDescendants, }: ISetNodesSelectedParams & {
        keepDescendants?: boolean;
    }): number;
    private selectRange;
    private selectChildren;
    getSelectedNodes(): RowNode[];
    getSelectedRows(): any[];
    getSelectionCount(): number;
    /**
     * This method is used by the CSRM to remove groups which are being disposed of,
     * events do not need fired in this case
     */
    filterFromSelection(predicate: (node: RowNode) => boolean): void;
    updateGroupsFromChildrenSelections(source: SelectionEventSourceType, changedPath?: ChangedPath): boolean;
    private clearOtherNodes;
    private onRowSelected;
    syncInRowNode(rowNode: RowNode, oldNode?: RowNode): void;
    createDaemonNode(rowNode: RowNode): RowNode | undefined;
    private syncInOldRowNode;
    private syncInNewRowNode;
    reset(source: SelectionEventSourceType): void;
    private resetNodes;
    getBestCostNodeSelection(): RowNode[] | undefined;
    isEmpty(): boolean;
    deselectAllRowNodes({ source, selectAll }: {
        source: SelectionEventSourceType;
        selectAll?: SelectAllMode;
    }): void;
    private getSelectedCounts;
    getSelectAllState(selectAll?: SelectAllMode): boolean | null;
    hasNodesToSelect(selectAll: SelectAllMode): boolean;
    /**
     * @param selectAll See `MultiRowSelectionOptions.selectAll`
     * @returns all nodes including unselectable nodes which are the target of this selection attempt
     */
    private getNodesToSelect;
    private forEachNodeOnPage;
    selectAllRowNodes(params: {
        source: SelectionEventSourceType;
        selectAll?: SelectAllMode;
    }): void;
    getSelectionState(): string[] | null;
    setSelectionState(state: string[] | ServerSideRowSelectionState | ServerSideRowGroupSelectionState | undefined, source: SelectionEventSourceType, clearSelection?: boolean): void;
    private canSelectAll;
    /**
     * Updates the selectable state for a node by invoking isRowSelectable callback.
     * If the node is not selectable, it will be deselected.
     *
     * Callers:
     *  - property isRowSelectable changed
     *  - after grouping / treeData via `updateSelectableAfterGrouping`
     */
    protected updateSelectable(changedPath?: ChangedPath): void;
    updateSelectableAfterGrouping(changedPath: ChangedPath | undefined): void;
    refreshMasterNodeState(node: RowNode, e?: Event): void;
    setDetailSelectionState(masterNode: RowNode, detailGridOptions: GridOptions, detailApi: GridApi): void;
    private dispatchSelectionChanged;
}
