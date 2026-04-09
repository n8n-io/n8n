import type { AgEvent } from '../agStack/interfaces/agEvent';
import type { BuildEventTypeMap, SelectionEventSourceType } from '../events';
import type { Column } from '../interfaces/iColumn';
export type RowNodeEventType = 'rowSelected' | 'rowPinned' | 'selectableChanged' | 'displayedChanged' | 'dataChanged' | 'cellChanged' | 'masterChanged' | 'heightChanged' | 'topChanged' | 'groupChanged' | 'allChildrenCountChanged' | 'firstChildChanged' | 'lastChildChanged' | 'childIndexChanged' | 'rowIndexChanged' | 'expandedChanged' | 'hasChildrenChanged' | 'uiLevelChanged' | 'rowHighlightChanged' | 'mouseEnter' | 'mouseLeave' | 'draggingChanged';
type RowNodeEventTypeMap<TData = any> = BuildEventTypeMap<RowNodeEventType, {
    rowSelected: RowNodeSelectedEvent<TData>;
    rowPinned: RowNodePinnedEvent<TData>;
    selectableChanged: SelectableChangedEvent<TData>;
    displayedChanged: DisplayedChangedEvent<TData>;
    dataChanged: DataChangedEvent<TData>;
    cellChanged: CellChangedEvent<TData>;
    masterChanged: MasterChangedEvent<TData>;
    heightChanged: HeightChangedEvent<TData>;
    topChanged: TopChangedEvent<TData>;
    groupChanged: GroupChangedEvent<TData>;
    allChildrenCountChanged: AllChildrenCountChangedEvent<TData>;
    firstChildChanged: FirstChildChangedEvent<TData>;
    lastChildChanged: LastChildChangedEvent<TData>;
    childIndexChanged: ChildIndexChangedEvent<TData>;
    rowIndexChanged: RowIndexChangedEvent<TData>;
    expandedChanged: ExpandedChangedEvent<TData>;
    hasChildrenChanged: HasChildrenChangedEvent<TData>;
    uiLevelChanged: UiLevelChangedEvent<TData>;
    rowHighlightChanged: RowHighlightChangedEvent<TData>;
    mouseEnter: MouseEnterEvent<TData>;
    mouseLeave: MouseLeaveEvent<TData>;
    draggingChanged: DraggingChangedEvent<TData>;
}>;
export type AgRowNodeEventListener<TEventType extends keyof RowNodeEventTypeMap<TData>, TData = any> = (params: RowNodeEventTypeMap<TData>[TEventType]) => void;
export interface RowNodeEvent<T extends RowNodeEventType, TData = any> extends AgEvent<T> {
    node: IRowNode<TData>;
}
export interface RowNodeSelectedEvent<TData = any> extends RowNodeEvent<'rowSelected', TData> {
}
export interface RowNodePinnedEvent<TData = any> extends RowNodeEvent<'rowPinned', TData> {
}
export interface MouseEnterEvent<TData = any> extends RowNodeEvent<'mouseEnter', TData> {
}
export interface MouseLeaveEvent<TData = any> extends RowNodeEvent<'mouseLeave', TData> {
}
export interface HeightChangedEvent<TData = any> extends RowNodeEvent<'heightChanged', TData> {
}
export interface RowIndexChangedEvent<TData = any> extends RowNodeEvent<'rowIndexChanged', TData> {
}
export interface TopChangedEvent<TData = any> extends RowNodeEvent<'topChanged', TData> {
}
export interface ExpandedChangedEvent<TData = any> extends RowNodeEvent<'expandedChanged', TData> {
}
/** @deprecated v33 Use the `modelUpdated` event instead and calculate whether the first child has changed. */
export interface FirstChildChangedEvent<TData = any> extends RowNodeEvent<'firstChildChanged', TData> {
}
/** @deprecated v33 Use the `modelUpdated` event instead and calculate whether the last child has changed. */
export interface LastChildChangedEvent<TData = any> extends RowNodeEvent<'lastChildChanged', TData> {
}
/** @deprecated v33 Use the `modelUpdated` event instead and calculate whether the child index has changed. */
export interface ChildIndexChangedEvent<TData = any> extends RowNodeEvent<'childIndexChanged', TData> {
}
export interface AllChildrenCountChangedEvent<TData = any> extends RowNodeEvent<'allChildrenCountChanged', TData> {
}
export interface UiLevelChangedEvent<TData = any> extends RowNodeEvent<'uiLevelChanged', TData> {
}
export interface DataChangedEvent<TData = any> extends RowNodeEvent<'dataChanged', TData> {
    oldData: TData | undefined;
    newData: TData | undefined;
    update: boolean;
}
export interface CellChangedEvent<TData = any> extends RowNodeEvent<'cellChanged', TData> {
    column: Column;
    newValue: TData | undefined;
    oldValue: TData | undefined;
}
export interface SelectableChangedEvent<TData = any> extends RowNodeEvent<'selectableChanged', TData> {
}
export interface DisplayedChangedEvent<TData = any> extends RowNodeEvent<'displayedChanged', TData> {
}
export interface MasterChangedEvent<TData = any> extends RowNodeEvent<'masterChanged', TData> {
}
export interface GroupChangedEvent<TData = any> extends RowNodeEvent<'groupChanged', TData> {
}
export interface HasChildrenChangedEvent<TData = any> extends RowNodeEvent<'hasChildrenChanged', TData> {
}
export interface RowHighlightChangedEvent<TData = any> extends RowNodeEvent<'rowHighlightChanged', TData> {
}
export interface DraggingChangedEvent<TData = any> extends RowNodeEvent<'draggingChanged', TData> {
}
export type RowPinnedType = 'top' | 'bottom' | null | undefined;
export interface VerticalScrollPosition {
    top: number;
    bottom: number;
}
interface BaseRowNode<TData = any> {
    /** Unique ID for the node. Either provided by the application, or generated by the grid if not. */
    id: string | undefined;
    /**
     * The data as provided by the application.
     * Can be `undefined` when using row grouping or during grid initialisation.
     */
    data: TData | undefined;
    /**
     * This is `true` if it has a rowIndex assigned, otherwise `false`.
     */
    displayed: boolean;
    /** Either `'top'` or `'bottom'` if row pinned, otherwise `undefined` or `null`. */
    rowPinned: RowPinnedType;
    /** Is this row selectable. */
    selectable: boolean;
    /** The height, in pixels, of this row. */
    rowHeight: number | null | undefined;
    /** The row top position in pixels. */
    rowTop: number | null;
    /**
     * `true` if this node has children.
     * - In case of grouping, this is `true` for group nodes. Group nodes are generated and do not have a data field.
     * - In case of treeData, this is `true` for any kind of node that have children. Filler nodes or user provided nodes with children.
     */
    group: boolean | undefined;
    /** @deprecated v33 Use `rowNode.parent?.childrenAfterSort?.[0] === rowNode` instead. */
    firstChild: boolean;
    /** @deprecated v33 Use `!!rowNode.parent?.childrenAfterSort && (rowNode.parent.childrenAfterSort[rowNode.parent.childrenAfterSort.length - 1] === rowNode)` instead. */
    lastChild: boolean;
    /** @deprecated v33 Use `rowNode.parent?.childrenAfterSort?.findIndex(r => r === rowNode)` instead. */
    childIndex: number;
    /** How many levels this node is from the top when grouping. */
    level: number;
    /** How many levels this node is from the top when grouping in the UI (only different to `parent` when `groupHideParentOfSingleChild=true`).*/
    uiLevel: number;
    /** The parent node to this node, or empty if top level. */
    parent: IRowNode<TData> | null;
    /** Used by server-side row model. `true` if this row node is a stub. A stub is a placeholder row with loading icon while waiting from row to be loaded. */
    stub: boolean | undefined;
    /** Used by server side row model, `true` if this row node failed a load. */
    failedLoad: boolean | undefined;
    /**
     * The index of the row in the source rowData array including any updates via transactions.
     * It does not change when sorting, filtering, grouping, pivoting or any other UI related operations.
     * If this is a filler node (a visual row created by AG Grid in tree data or grouping) the value is set to `-1`.
     */
    readonly sourceRowIndex: number;
    /** The current row index. If the row is filtered out or in a collapsed group, this value is set to `null`. */
    rowIndex: number | null;
    /** If using quick filter, stores a string representation of the row for searching against. */
    quickFilterAggregateText: string | null;
    /** `true` if this row is a master row, part of master / detail (ie row can be expanded to show detail). */
    master: boolean;
    /** `true` if this row is a detail row, part of master / detail (ie child row of an expanded master row). */
    detail: boolean | undefined;
}
interface GroupRowNode<TData = any> {
    /** The field we are grouping on from our row data. */
    field: string | null;
    /** The key value for this group. */
    key: string | null;
    /** If using row grouping, contains the group values for this group. */
    groupData: {
        [key: string]: any | null;
    } | null;
    /** If using row grouping and aggregation, contains the aggregation data. */
    aggData: any;
    /** The row group column used for this group. */
    rowGroupColumn: Column | null;
    /**
     * If doing in-memory (client-side) grouping, this is the index of the group column this cell is for.
     * This is always the same as the level, unless we are collapsing groups, i.e. `groupHideParentOfSingleChild=true`.
     */
    rowGroupIndex: number | null;
    /** `true` if group is expanded, otherwise `false`. */
    expanded: boolean;
    /** `true` if this node is a group and the group is the bottom level in the tree. */
    leafGroup: boolean | undefined;
    /**
     * All the row nodes that have user provided data below this node. Can be null if empty.
     * This excludes:
     * - filler nodes when using treeData and getDataPath
     * - group nodes when using grouping
     * - footer nodes
     */
    allLeafChildren: IRowNode<TData>[] | null;
    /** Number of children and grand children. */
    allChildrenCount: number | null;
    /** Children of this group. If multi levels of grouping, shows only immediate children. */
    childrenAfterGroup: IRowNode<TData>[] | null;
    /** Sorted children of this group. */
    childrenAfterSort: IRowNode<TData>[] | null;
    /** Filtered children of this group. */
    childrenAfterFilter: IRowNode<TData>[] | null;
    /** `true` if row is a footer. Footers have `group = true` and `footer = true`. */
    footer: boolean | undefined;
    /** If using footers, reference to the footer node for this group. */
    sibling: IRowNode<TData>;
}
export interface IRowNode<TData = any> extends BaseRowNode<TData>, GroupRowNode<TData> {
    /**
     * Select (or deselect) the node.
     * @param newValue -`true` for selection, `false` for deselection.
     * @param clearSelection - If selecting, then passing `true` selects the node exclusively (i.e. NOT do multi select). If doing deselection, `clearSelection` has no impact. Default: `false`
     * @param source - Source property that appears in the `selectionChanged` event. Default: `'api'`
     */
    setSelected(newValue: boolean, clearSelection?: boolean, source?: SelectionEventSourceType): void;
    /** Returns:
     * - `true` if node is selected.
     * - `false` if the node isn't selected.
     * - `undefined` if it's partially selected (a group where not all descendants are selected, and `groupSelects` is `'descendants'` or `'filteredDescendants'`).
     */
    isSelected(): boolean | undefined;
    /**
     * Returns:
     * - `true` if node is either pinned to the `top` or `bottom`.
     * - `false` if the node isn't pinned.
     */
    isRowPinned(): boolean;
    /** Returns:
     * - `true` if the node can be expanded, i.e it is a group or master row.
     * - `false` if the node cannot be expanded.
     */
    isExpandable(): boolean;
    /**
     * Set the expanded state of this rowNode.
     * @param expanded - `true` to expand, `false` to collapse.
     * @param sourceEvent - Optional event that gets passed to the `rowGroupOpened` event.
     * @param forceSync - By default rows are expanded asynchronously for best performance. Set to `true` if you need to interact with the expanded row immediately after this function.
     */
    setExpanded(expanded: boolean, sourceEvent?: MouseEvent | KeyboardEvent, forceSync?: boolean): void;
    /**
     * @deprecated v32.2.0 Check `node.detail` then user provided callback `isFullWidthRow` instead.
     *
     * Returns:
     * - `true` if the node is a full width cell.
     * - `false` if the node is not a full width cell.
     */
    isFullWidthCell(): boolean;
    /**
     * Returns:
     * - `true` if the node is currently hovered.
     * - `false` if the node is not hovered.
     */
    isHovered(): boolean;
    /** Add an event listener. */
    addEventListener<T extends RowNodeEventType>(eventType: T, userListener: AgRowNodeEventListener<T>): void;
    /** Remove event listener. */
    removeEventListener<T extends RowNodeEventType>(eventType: T, userListener: AgRowNodeEventListener<T>): void;
    /**
     * The first time `quickFilter` runs, the grid creates a one-off string representation of the row.
     * This string is then used for the quick filter instead of hitting each column separately.
     * When you edit, using grid editing, this string gets cleared down.
     * However, if you edit without using grid editing, you need to clear this string down for the row to be updated with the new values.
     * Otherwise, new values would not work with the `quickFilter`.
     */
    resetQuickFilterAggregateText(): void;
    /** Perform a depth-first search of this node and its children. */
    depthFirstSearch(callback: (rowNode: IRowNode<TData>) => void): void;
    /**
     * Sets the row height.
     * Call if you want to change the height initially assigned to the row.
     * After calling, you must call `api.onRowHeightChanged()` so the grid knows it needs to work out the placement of the rows.
     * @param rowHeight new height of the row
     * @param estimated is this an estimated height. Default: `false`
     */
    setRowHeight(rowHeight: number | undefined | null, estimated?: boolean): void;
    /**
     * Replaces the data on the `rowNode`. When this method is called, the grid refreshes the entire rendered row if it is displayed.
     */
    setData(data: TData): void;
    /**
     * Updates the data on the `rowNode`. When this method is called, the grid refreshes the entire rendered row if it is displayed.
     */
    updateData(data: TData): void;
    /**
     * Replaces the value on the `rowNode` for the specified column. When complete,
     * the grid refreshes the rendered cell on the required row only.
     * **Note**: This method only fires `onCellEditRequest` when the Grid is in **Read Only** mode.
     * **Note**: This method defers to EditModule if available and batches the edit when `fullRow` or `batchEdit` is enabled.
     *
     * @param colKey The column where the value should be updated
     * @param newValue The new value
     * @param eventSource The source of the event
     * @returns `true` if the value was changed, otherwise `false`.
     */
    setDataValue(colKey: string | Column, newValue: any, eventSource?: string): boolean;
    /**
     * Returns the route of the row node. If the Row Node does not have a key (i.e it's a leaf row inside a row group) returns undefined
     */
    getRoute(): string[] | undefined;
}
export {};
