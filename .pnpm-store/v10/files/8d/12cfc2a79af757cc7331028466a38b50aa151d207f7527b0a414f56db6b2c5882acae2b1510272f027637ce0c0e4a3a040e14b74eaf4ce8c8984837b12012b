import type { CellFocusedEvent } from '../../events';
import type { EditValue } from '../../interfaces/iEditModelService';
import type { EditPosition, EditRowPosition, StartEditWithPositionParams } from '../../interfaces/iEditService';
import type { CellCtrl } from '../../rendering/cell/cellCtrl';
import type { EditValidationAction, EditValidationResult } from './baseEditStrategy';
import { BaseEditStrategy } from './baseEditStrategy';
export declare class FullRowEditStrategy extends BaseEditStrategy {
    beanName: "dragSvc" | "environment" | "eventSvc" | "iconSvc" | "localeSvc" | "popupSvc" | "gos" | "registry" | "context" | "frameworkOverrides" | "eRootDiv" | "dragAndDrop" | "advFilterExpSvc" | "advSettingsMenuFactory" | "agChartsExports" | "chartCrossFilterSvc" | "chartMenuItemMapper" | "chartMenuListFactory" | "chartMenuSvc" | "chartTranslation" | "colChooserFactory" | "colMenuFactory" | "colToolPanelFactory" | "enterpriseChartProxyFactory" | "lazyBlockLoadingSvc" | "menuItemMapper" | "menuUtils" | "ssrmBlockUtils" | "ssrmExpandListener" | "ssrmFilterListener" | "ssrmListenerUtils" | "ssrmNodeManager" | "ssrmSortSvc" | "ssrmStoreFactory" | "ssrmStoreUtils" | "statusBarSvc" | "testIdSvc" | "sideBar" | "valueCache" | "pagination" | "advancedFilter" | "groupFilter" | "quickFilter" | "gridOptions" | "validation" | "rowModel" | "selectionSvc" | "colModel" | "valueSvc" | "editSvc" | "rowChildrenSvc" | "sortSvc" | "pageBoundsListener" | "rowRenderer" | "colViewport" | "colNames" | "visibleCols" | "colMoves" | "colFlex" | "colResize" | "headerNavigation" | "navigation" | "colAnimation" | "focusSvc" | "cellStyles" | "colHover" | "userCompFactory" | "animationFrameSvc" | "colFilter" | "filterManager" | "rowContainerHeight" | "rowStyleSvc" | "ctrlsSvc" | "syncSvc" | "ariaAnnounce" | "rangeSvc" | "gridApi" | "eGridDiv" | "pivotResultCols" | "autoColSvc" | "selectionColSvc" | "rowNumbersSvc" | "colDefFactory" | "colAutosize" | "rowGroupColsSvc" | "valueColsSvc" | "pivotColsSvc" | "showRowGroupCols" | "showRowGroupColValueSvc" | "dataTypeSvc" | "globalListener" | "globalSyncListener" | "stateSvc" | "overlays" | "pinnedRowModel" | "menuSvc" | "apiEventSvc" | "undoRedo" | "rowNodeBlockLoader" | "csvCreator" | "excelCreator" | "clipboardSvc" | "cellNavigation" | "scrollVisibleSvc" | "pinnedCols" | "expressionSvc" | "autoWidthCalc" | "agCompUtils" | "frameworkCompWrapper" | "horizontalResizeSvc" | "filterMenuFactory" | "enterpriseMenuFactory" | "contextMenuSvc" | "editModelSvc" | "alignedGridsSvc" | "paginationAutoPageSizeSvc" | "pageBounds" | "apiFunctionSvc" | "gridDestroySvc" | "expansionSvc" | "ssrmTxnManager" | "aggFuncSvc" | "filterStage" | "sortStage" | "flattenStage" | "groupStage" | "aggStage" | "pivotStage" | "filterAggStage" | "rowNodeSorter" | "pivotColDefSvc" | "chartSvc" | "aggColNameSvc" | "renderStatus" | "rowDropHighlightSvc" | "rowDragSvc" | "stickyRowSvc" | "filterValueSvc" | "cellFlashSvc" | "masterDetailSvc" | "tooltipSvc" | "colGroupSvc" | "rowAutoHeight" | "footerSvc" | "touchSvc" | "rowSpanSvc" | "spannedRowRenderer" | "findSvc" | "multiFilter" | "filterPanelSvc" | "selectableFilter" | "colDelayRenderSvc" | "gridSerializer" | "licenseManager" | "changeDetectionSvc" | "groupHierarchyColSvc" | undefined;
    private rowNode?;
    private readonly startedRows;
    shouldStop(position?: EditPosition, event?: KeyboardEvent | MouseEvent | null | undefined, _source?: 'api' | 'ui'): boolean | null;
    midBatchInputsAllowed({ rowNode }: EditPosition): boolean;
    clearEdits(position: EditPosition): void;
    start(params: StartEditWithPositionParams): void;
    protected processValidationResults(results: EditValidationResult<Required<EditPosition> & EditValue>): EditValidationAction;
    stop(cancel?: boolean, event?: Event | null): boolean;
    onCellFocusChanged(event: CellFocusedEvent<any, any>): void;
    cleanupEditors(position?: EditRowPosition, includeEditing?: boolean): void;
    moveToNextEditingCell(prevCell: CellCtrl, backwards: boolean, event?: KeyboardEvent, source?: 'api' | 'ui', preventNavigation?: boolean): boolean | null;
    private restoreEditors;
    destroy(): void;
}
