import type { ClassImp } from '../agStack/interfaces/iContext';
import type { GridApi } from '../api/gridApi';
import type { ApiFunction, ApiFunctionName } from '../api/iApiFunction';
import type { ComponentMeta, DynamicBeanName, SingletonBean, UserComponentName } from '../context/context';
import type { IconName, IconValue } from '../utils/icon';
import type { ComponentSelector } from '../widgets/component';
import type { RowModelType } from './iRowModel';
type ModuleValidationValidResult = {
    isValid: true;
};
type ModuleValidationInvalidResult = {
    isValid: false;
    message: string;
};
export type ModuleValidationResult = ModuleValidationValidResult | ModuleValidationInvalidResult;
/** A Module contains all the code related to this feature to enable tree shaking when this module is not used. */
export interface Module {
    moduleName: ModuleName;
    version: string;
    enterprise?: boolean;
    /**
     * Validation run when registering the module
     *
     * @returns Whether the module is valid or not. If not, a message explaining why it is not valid
     */
    validate?: () => ModuleValidationResult;
    /** singleton beans which are created once on grid init */
    beans?: SingletonBean[];
    /** beans which can have many instances, and can be created/destroyed at any time */
    dynamicBeans?: Partial<Record<DynamicBeanName, ClassImp>>;
    /** components which can be overridden by the user (e.g. cell renderers). These are the default grid provided versions */
    userComponents?: Partial<Record<UserComponentName, ComponentMeta>>;
    /** selectors for grid components that can be defined in templates and created by AG stack */
    selectors?: ComponentSelector[];
    /**
     * icon mappings
     * *** IMPORTANT NOTE! ***
     * If you change the icons, copy/paste the new content into the docs page custom-icons
     */
    icons?: Partial<Record<IconName, IconValue>>;
    rowModels?: RowModelType[];
    dependsOn?: Module[];
    css?: string[];
}
/** Used to define a module that contains api functions. */
export type _ModuleWithApi<TGridApi extends Readonly<Partial<GridApi>>> = Omit<Module, 'rowModels'> & {
    apiFunctions?: {
        [K in ApiFunctionName & keyof TGridApi]: ApiFunction<K>;
    };
};
/** Used to define a module that does not contain api functions. */
export type _ModuleWithoutApi = Module & {
    apiFunctions?: never;
};
type InternalModuleName = 'Aggregation' | 'AnimationFrame' | 'Aria' | 'AutoWidth' | 'CellRendererFunction' | 'ChangeDetection' | 'CheckboxCellRenderer' | 'ClientSideRowModelFilter' | 'ClientSideRowModelHierarchy' | 'ColumnDelayRender' | 'ColumnFilter' | 'ColumnFlex' | 'ColumnGroupHeaderComp' | 'ColumnGroup' | 'ColumnHeaderComp' | 'ColumnMove' | 'ColumnResize' | 'CommunityCore' | 'CsrmSsrmSharedApi' | 'RowModelSharedApi' | 'DataType' | 'Drag' | 'EditCore' | 'EnterpriseCore' | 'Expression' | 'FilterCore' | 'FilterValue' | 'FindCore' | 'GroupCellRenderer' | 'GroupColumn' | 'GroupHierarchy' | 'HorizontalResize' | 'InfiniteRowModelCore' | 'KeyboardNavigation' | 'LoadingCellRenderer' | 'MenuCore' | 'MenuItem' | 'Overlay' | 'PinnedColumn' | 'Popup' | 'QuickFilterCore' | 'SharedAggregation' | 'SharedDragAndDrop' | 'SharedExport' | 'SharedMasterDetail' | 'SharedMenu' | 'SharedPivot' | 'SharedRowGrouping' | 'SharedRowSelection' | 'SharedTreeData' | 'SideBarShared' | 'SkeletonCellRenderer' | 'Sort' | 'SsrmInfiniteSharedApi' | 'StickyRow' | 'Touch' | 'Testing';
export type CommunityModuleName = 'AlignedGrids' | 'AllCommunity' | 'CellApi' | 'CellStyle' | 'CheckboxEditor' | 'ClientSideRowModelApi' | 'ClientSideRowModel' | 'ColumnApi' | 'ColumnAutoSize' | 'ColumnHover' | 'CsvExport' | 'CustomEditor' | 'CustomFilter' | 'DateEditor' | 'DateFilter' | 'DragAndDrop' | 'EventApi' | 'ExternalFilter' | 'GridState' | 'HighlightChanges' | 'InfiniteRowModel' | 'LargeTextEditor' | 'Locale' | 'NumberEditor' | 'NumberFilter' | 'Pagination' | 'PinnedRow' | 'QuickFilter' | 'RenderApi' | 'RowApi' | 'RowAutoHeight' | 'RowDrag' | 'RowSelection' | 'RowStyle' | 'ScrollApi' | 'SelectEditor' | 'TextEditor' | 'TextFilter' | 'Tooltip' | 'UndoRedoEdit' | 'Validation' | 'ValueCache' | 'CellSpan';
export type EnterpriseModuleName = 'AdvancedFilter' | 'AiToolkit' | 'AllEnterprise' | 'BatchEdit' | 'CellSelection' | 'Clipboard' | 'ColumnMenu' | 'ColumnsToolPanel' | 'ContextMenu' | 'ExcelExport' | 'FiltersToolPanel' | 'Find' | 'GridCharts' | 'IntegratedCharts' | 'GroupFilter' | 'MasterDetail' | 'Menu' | 'MultiFilter' | 'NewFiltersToolPanel' | 'Pivot' | 'RangeSelection' | 'RichSelect' | 'RowNumbers' | 'RowGrouping' | 'RowGroupingPanel' | 'ServerSideRowModelApi' | 'ServerSideRowModel' | 'SetFilter' | 'SideBar' | 'Sparklines' | 'StatusBar' | 'TreeData' | 'ViewportRowModel';
/** The names of all publicly available AG Grid modules */
export type AgModuleName = 'AiToolkitModule' | 'AlignedGridsModule' | 'AllCommunityModule' | 'CellApiModule' | 'CellStyleModule' | 'CheckboxEditorModule' | 'ClientSideRowModelApiModule' | 'ClientSideRowModelModule' | 'ColumnApiModule' | 'ColumnAutoSizeModule' | 'ColumnHoverModule' | 'CsvExportModule' | 'CustomEditorModule' | 'CustomFilterModule' | 'DateEditorModule' | 'DateFilterModule' | 'DragAndDropModule' | 'EventApiModule' | 'ExternalFilterModule' | 'GridStateModule' | 'HighlightChangesModule' | 'InfiniteRowModelModule' | 'LargeTextEditorModule' | 'LocaleModule' | 'NumberEditorModule' | 'NumberFilterModule' | 'PaginationModule' | 'PinnedRowModule' | 'QuickFilterModule' | 'RenderApiModule' | 'RowApiModule' | 'RowAutoHeightModule' | 'RowDragModule' | 'RowSelectionModule' | 'RowStyleModule' | 'ScrollApiModule' | 'SelectEditorModule' | 'TextEditorModule' | 'TextFilterModule' | 'TooltipModule' | 'UndoRedoEditModule' | 'ValidationModule' | 'ValueCacheModule' | 'CellSpanModule' | 'AdvancedFilterModule' | 'AllEnterpriseModule' | 'BatchEditModule' | 'CellSelectionModule' | 'ClipboardModule' | 'ColumnMenuModule' | 'ColumnsToolPanelModule' | 'ContextMenuModule' | 'ExcelExportModule' | 'FiltersToolPanelModule' | 'FindModule' | 'GridChartsModule' | 'IntegratedChartsModule' | 'GroupFilterModule' | 'MasterDetailModule' | 'MenuModule' | 'MultiFilterModule' | 'NewFiltersToolPanelModule' | 'PivotModule' | 'RangeSelectionModule' | 'RichSelectModule' | 'RowNumbersModule' | 'RowGroupingModule' | 'RowGroupingPanelModule' | 'ServerSideRowModelApiModule' | 'ServerSideRowModelModule' | 'SetFilterModule' | 'SideBarModule' | 'SparklinesModule' | 'StatusBarModule' | 'TreeDataModule' | 'ViewportRowModelModule';
/** INTERNAL: All public and internal module names */
export type ModuleName = InternalModuleName | CommunityModuleName | EnterpriseModuleName;
/** These are the internal modules that we have mappings for to convert into exported modules */
export type ResolvableModuleName = Extract<InternalModuleName, 'EditCore' | 'MenuCore' | 'EnterpriseCore' | 'ColumnHeaderComp' | 'ColumnFilter' | 'ColumnGroupHeaderComp' | 'SharedDragAndDrop' | 'GroupCellRenderer' | 'MenuItem' | 'CommunityCore' | 'LoadingCellRenderer' | 'Sort' | 'SharedRowSelection' | 'KeyboardNavigation' | 'SharedMenu' | 'ColumnMove' | 'ColumnResize' | 'FilterCore' | 'CsrmSsrmSharedApi' | 'RowModelSharedApi' | 'SsrmInfiniteSharedApi' | 'SharedMasterDetail' | 'SharedRowGrouping' | 'SharedAggregation' | 'SharedPivot' | 'ColumnGroup' | 'Overlay' | 'PinnedColumn' | 'ClientSideRowModelHierarchy' | 'SkeletonCellRenderer' | 'CheckboxCellRenderer' | 'SharedTreeData'>;
/** These are the types that we can display validations for */
export type ValidationModuleName = CommunityModuleName | EnterpriseModuleName | ResolvableModuleName;
export {};
