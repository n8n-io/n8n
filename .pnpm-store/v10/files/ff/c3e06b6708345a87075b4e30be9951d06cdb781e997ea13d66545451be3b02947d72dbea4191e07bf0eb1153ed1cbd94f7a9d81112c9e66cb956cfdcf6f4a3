import type { DynamicBeanName, UserComponentName } from '../../context/context';
import type { Column } from '../../interfaces/iColumn';
import type { CommunityModuleName, EnterpriseModuleName, ValidationModuleName } from '../../interfaces/iModule';
import type { RowModelType } from '../../interfaces/iRowModel';
import type { RowNodeEventType, RowPinnedType } from '../../interfaces/iRowNode';
export declare const NoModulesRegisteredError: () => "No AG Grid modules are registered! It is recommended to start with all Community features via the AllCommunityModule:\n                    \n    import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';\n    \n    ModuleRegistry.registerModules([ AllCommunityModule ]);\n    ";
export declare function missingRowModelTypeError({ moduleName, rowModelType, }: {
    moduleName: CommunityModuleName | EnterpriseModuleName;
    rowModelType: RowModelType;
}): string;
/**
 * NOTES on setting console messages:
 * 1. The message is a function that returns either a string or an array of any type.
 * 2. Returning an array enables the console to log actual objects / numbers / booleans nicely as this will be spread to the underlying console call instead of being cast to a string.
 * 3. Each entry should be followed by as const so that the IDE hover shows the actual message to aid devs
 */
export declare const AG_GRID_ERRORS: {
    1: () => "`rowData` must be an array";
    2: ({ nodeId }: {
        nodeId: string | undefined;
    }) => `Duplicate node id '${string}' detected from getRowId callback, this could cause issues in your grid.`;
    3: () => "Calling gridApi.resetRowHeights() makes no sense when using Auto Row Height.";
    4: ({ id }: {
        id: string;
    }) => `Could not find row id=${string}, data item was not found for this id`;
    5: ({ data }: {
        data: any;
    }) => readonly ["Could not find data item as object was not found.", any, " Consider using getRowId to help the Grid find matching row data"];
    6: () => "'groupHideOpenParents' only works when specifying specific columns for 'colDef.showRowGroup'";
    7: () => "Pivoting is not supported with aligned grids as it may produce different columns in each grid.";
    8: ({ key }: {
        key: string;
    }) => `Unknown key for navigation ${string}`;
    9: ({ variable }: {
        variable: {
            cssName: string;
            defaultValue: number;
        };
    }) => `No value for ${string}. This usually means that the grid has been initialised before styles have been loaded. The default value of ${number} will be used and updated when styles load.`;
    10: ({ eventType }: {
        eventType: RowNodeEventType;
    }) => string;
    11: () => "No gridOptions provided to createGrid";
    12: ({ colKey }: {
        colKey: string | Column;
    }) => readonly ["column ", string | Column<any>, " not found"];
    13: () => "Could not find rowIndex, this means tasks are being executed on a rowNode that has been removed from the grid.";
    14: ({ groupPrefix }: {
        groupPrefix: string;
    }) => `Row IDs cannot start with ${string}, this is a reserved prefix for AG Grid's row grouping feature.`;
    15: ({ expression }: {
        expression: any;
    }) => readonly ["value should be either a string or a function", any];
    16: ({ expression, params, e }: {
        expression: string;
        params: any;
        e: any;
    }) => readonly ["Processing of the expression failed", "Expression = ", string, "Params = ", any, "Exception = ", any];
    17: () => "you need either field or valueSetter set on colDef for editing to work";
    18: () => "alignedGrids contains an undefined option.";
    19: () => "alignedGrids - No api found on the linked grid.";
    20: () => "You may want to configure via a callback to avoid setup race conditions:\n                     \"alignedGrids: () => [linkedGrid]\"";
    21: () => "pivoting is not supported with aligned grids. You can only use one of these features at a time in a grid.";
    22: ({ key }: {
        key: string;
    }) => `${string} is an initial property and cannot be updated.`;
    23: () => "The return of `getRowHeight` cannot be zero. If the intention is to hide rows, use a filter instead.";
    24: () => "row height must be a number if not using standard row model";
    25: ({ id }: {
        id: any;
    }) => readonly ["The getRowId callback must return a string. The ID ", any, " is being cast to a string."];
    26: ({ fnName, preDestroyLink }: {
        fnName: string;
        preDestroyLink: string;
    }) => `Grid API function ${string}() cannot be called as the grid has been destroyed.\n Either clear local references to the grid api, when it is destroyed, or check gridApi.isDestroyed() to avoid calling methods against a destroyed grid.\n To run logic when the grid is about to be destroyed use the gridPreDestroy event. See: ${string}`;
    27: ({ fnName, module }: {
        fnName: string;
        module: string;
    }) => `API function '${string}' not registered to module '${string}'`;
    28: () => "setRowCount cannot be used while using row grouping.";
    29: () => "tried to call sizeColumnsToFit() but the grid is coming back with zero width, maybe the grid is not visible yet on the screen?";
    30: ({ toIndex }: {
        toIndex: number;
    }) => readonly ["tried to insert columns in invalid location, toIndex = ", number, "remember that you should not count the moving columns when calculating the new index"];
    31: () => "infinite loop in resizeColumnSets";
    32: () => "applyColumnState() - the state attribute should be an array, however an array was not found. Please provide an array of items (one for each col you want to change) for state.";
    33: () => "stateItem.aggFunc must be a string. if using your own aggregation functions, register the functions first before using them in get/set state. This is because it is intended for the column state to be stored and retrieved as simple JSON.";
    34: ({ key }: {
        key: string;
    }) => `the column type '${string}' is a default column type and cannot be overridden.`;
    35: () => "Column type definitions 'columnTypes' with a 'type' attribute are not supported because a column type cannot refer to another column type. Only column definitions 'columnDefs' can use the 'type' attribute to refer to a column type.";
    36: ({ t }: {
        t: string;
    }) => string;
    37: () => "Changing the column pinning status is not allowed with domLayout='print'";
    38: ({ iconName }: {
        iconName: string;
    }) => `provided icon '${string}' needs to be a string or a function`;
    39: () => "Applying column order broke a group where columns should be married together. Applying new order has been discarded.";
    40: ({ e, method }: {
        e: any;
        method: string;
    }) => `${any}\n${string}`;
    41: () => "Browser did not allow document.execCommand('copy'). Ensure 'api.copySelectedRowsToClipboard() is invoked via a user event, i.e. button click, otherwise the browser will prevent it for security reasons.";
    42: () => "Browser does not support document.execCommand('copy') for clipboard operations";
    43: ({ iconName }: {
        iconName: string;
    }) => `As of v33, icon '${string}' is deprecated. Use the icon CSS name instead.`;
    44: () => "Data type definition hierarchies (via the \"extendsDataType\" property) cannot contain circular references.";
    45: ({ parentCellDataType }: {
        parentCellDataType: string;
    }) => `The data type definition ${string} does not exist.`;
    46: () => "The \"baseDataType\" property of a data type definition must match that of its parent.";
    47: ({ cellDataType }: {
        cellDataType: string;
    }) => `Missing data type definition - "${string}"`;
    48: ({ property }: {
        property: string;
    }) => `Cell data type is "object" but no Value ${string} has been provided. Please either provide an object data type definition with a Value ${string}, or set "colDef.value${string}"`;
    49: ({ methodName }: {
        methodName: string;
    }) => `Framework component is missing the method ${string}()`;
    50: ({ compName }: {
        compName: string | undefined;
    }) => `Could not find component ${string}, did you forget to configure this component?`;
    51: () => "Export cancelled. Export is not allowed as per your configuration.";
    52: () => "There is no `window` associated with the current `document`";
    53: () => "unknown value type during csv conversion";
    54: () => "Could not find document body, it is needed for drag and drop and context menu.";
    55: () => "addRowDropZone - A container target needs to be provided";
    56: () => "addRowDropZone - target already exists in the list of DropZones. Use `removeRowDropZone` before adding it again.";
    57: () => "unable to show popup filter, filter instantiation failed";
    58: () => "no values found for select cellEditor";
    59: () => "cannot select pinned rows";
    60: () => "cannot select node until it has finished loading";
    61: () => "since version v32.2.0, rowNode.isFullWidthCell() has been deprecated. Instead check `rowNode.detail` followed by the user provided `isFullWidthRow` grid option.";
    62: ({ colId }: {
        colId: string;
    }) => `setFilterModel() - no column found for colId: ${string}`;
    63: ({ colId }: {
        colId: string;
    }) => `setFilterModel() - unable to fully apply model, filtering disabled for colId: ${string}`;
    64: ({ colId }: {
        colId: string;
    }) => `setFilterModel() - unable to fully apply model, unable to create filter for colId: ${string}`;
    65: () => "filter missing setModel method, which is needed for setFilterModel";
    66: () => "filter API missing getModel method, which is needed for getFilterModel";
    67: () => "Filter is missing isFilterActive() method";
    68: () => "Column Filter API methods have been disabled as Advanced Filters are enabled.";
    69: ({ guiFromFilter }: {
        guiFromFilter: any;
    }) => `getGui method from filter returned ${any}; it should be a DOM element.`;
    70: ({ newFilter }: {
        newFilter: any;
    }) => "Grid option quickFilterText only supports string inputs, received: string" | "Grid option quickFilterText only supports string inputs, received: number" | "Grid option quickFilterText only supports string inputs, received: bigint" | "Grid option quickFilterText only supports string inputs, received: boolean" | "Grid option quickFilterText only supports string inputs, received: symbol" | "Grid option quickFilterText only supports string inputs, received: undefined" | "Grid option quickFilterText only supports string inputs, received: object" | "Grid option quickFilterText only supports string inputs, received: function";
    71: () => "debounceMs is ignored when apply button is present";
    72: ({ keys }: {
        keys: string[];
    }) => readonly ["ignoring FilterOptionDef as it doesn't contain one of ", string[]];
    73: () => "invalid FilterOptionDef supplied as it doesn't contain a 'displayKey'";
    74: () => "no filter options for filter";
    75: () => "Unknown button type specified";
    76: ({ filterModelType }: {
        filterModelType: any;
    }) => readonly ["Unexpected type of filter \"", any, "\", it looks like the filter was configured with incorrect Filter Options"];
    77: () => "Filter model is missing 'conditions'";
    78: () => "Filter Model contains more conditions than \"filterParams.maxNumConditions\". Additional conditions have been ignored.";
    79: () => "\"filterParams.maxNumConditions\" must be greater than or equal to zero.";
    80: () => "\"filterParams.numAlwaysVisibleConditions\" must be greater than or equal to zero.";
    81: () => "\"filterParams.numAlwaysVisibleConditions\" cannot be greater than \"filterParams.maxNumConditions\".";
    82: ({ param }: {
        param: any;
    }) => `DateFilter ${any} is not a number`;
    83: () => "DateFilter minValidYear should be <= maxValidYear";
    84: () => "DateFilter minValidDate should be <= maxValidDate";
    85: () => "DateFilter should not have both minValidDate and minValidYear parameters set at the same time! minValidYear will be ignored.";
    86: () => "DateFilter should not have both maxValidDate and maxValidYear parameters set at the same time! maxValidYear will be ignored.";
    87: () => "DateFilter parameter minValidDate should always be lower than or equal to parameter maxValidDate.";
    88: ({ index }: {
        index: number;
    }) => `Invalid row index for ensureIndexVisible: ${number}`;
    89: () => "A template was provided for Header Group Comp - templates are only supported for Header Comps (not groups)";
    90: () => "datasource is missing getRows method";
    91: () => "Filter is missing method doesFilterPass";
    92: () => "AnimationFrameService called but animation frames are off";
    93: () => "cannot add multiple ranges when `cellSelection.suppressMultiRanges = true`";
    94: ({ paginationPageSizeOption, pageSizeSet, pageSizesSet, pageSizeOptions, }: {
        paginationPageSizeOption: number;
        pageSizeSet: boolean;
        pageSizesSet: any;
        pageSizeOptions: any[];
    }) => `'paginationPageSize=${number}', but ${number} is not included in paginationPageSizeSelector=[${string}].` | `'paginationPageSize=${number}', but ${number} is not included in the default paginationPageSizeSelector=[${string}].` | `'paginationPageSize=${number}' (default value), but ${number} is not included in paginationPageSizeSelector=[${string}].` | `'paginationPageSize=${number}' (default value), but ${number} is not included in the default paginationPageSizeSelector=[${string}].`;
    95: ({ paginationPageSizeOption, paginationPageSizeSelector, }: {
        paginationPageSizeOption: number;
        paginationPageSizeSelector: string;
    }) => `Either set '${string}' to an array that includes ${number} or to 'false' to disable the page size selector.`;
    96: ({ id, data }: {
        id: string;
        data: any;
    }) => readonly ["Duplicate ID", string, "found for pinned row with data", any, "When `getRowId` is defined, it must return unique IDs for all pinned rows. Use the `rowPinned` parameter."];
    97: ({ colId }: {
        colId: string;
    }) => `cellEditor for column ${string} is missing getGui() method`;
    98: () => "popup cellEditor does not work with fullRowEdit - you cannot use them both - either turn off fullRowEdit, or stop using popup editors.";
    99: () => "Since v32, `api.hideOverlay()` does not hide the loading overlay when `loading=true`. Set `loading=false` instead.";
    101: ({ propertyName, componentName, agGridDefaults, jsComps, }: {
        propertyName: string;
        componentName: string;
        agGridDefaults: {
            agDragAndDropImage?: any;
            agColumnHeader?: any;
            agColumnGroupHeader?: any;
            agSortIndicator?: any;
            agAnimateShowChangeCellRenderer?: any;
            agAnimateSlideCellRenderer?: any;
            agLoadingCellRenderer?: any;
            agSkeletonCellRenderer?: any;
            agCheckboxCellRenderer?: any;
            agLoadingOverlay?: any;
            agNoRowsOverlay?: any;
            agTooltipComponent?: any;
            agReadOnlyFloatingFilter?: any;
            agTextColumnFilter?: any;
            agNumberColumnFilter?: any;
            agDateColumnFilter?: any;
            agDateInput?: any;
            agTextColumnFloatingFilter?: any;
            agNumberColumnFloatingFilter?: any;
            agDateColumnFloatingFilter?: any;
            agMultiColumnFilter?: any;
            agMultiColumnFloatingFilter?: any;
            agGroupColumnFilter?: any;
            agGroupColumnFloatingFilter?: any;
            agSetColumnFilter?: any;
            agSetColumnFloatingFilter?: any;
            agCellEditor?: any;
            agSelectCellEditor?: any;
            agTextCellEditor?: any;
            agNumberCellEditor?: any;
            agDateCellEditor?: any;
            agDateStringCellEditor?: any;
            agCheckboxCellEditor?: any;
            agLargeTextCellEditor?: any;
            agRichSelect?: any;
            agRichSelectCellEditor?: any;
            agMenuItem?: any;
            agColumnsToolPanel?: any;
            agFiltersToolPanel?: any;
            agNewFiltersToolPanel?: any;
            agGroupRowRenderer?: any;
            agGroupCellRenderer?: any;
            agDetailCellRenderer?: any;
            agSparklineCellRenderer?: any;
            agAggregationComponent?: any;
            agSelectedRowCountComponent?: any;
            agTotalRowCountComponent?: any;
            agFilteredRowCountComponent?: any;
            agTotalAndFilteredRowCountComponent?: any;
            agFindCellRenderer?: any;
        };
        jsComps: {
            [key: string]: any;
        };
    }) => string[];
    102: () => "selectAll: 'filtered' only works when gridOptions.rowModelType='clientSide'";
    103: () => "Invalid selection state. When using client-side row model, the state must conform to `string[]`.";
    104: ({ value, param }: {
        value: number;
        param: string;
    }) => `Numeric value ${number} passed to ${string} param will be interpreted as ${number} seconds. If this is intentional use "${number}s" to silence this warning.`;
    105: ({ e }: {
        e: any;
    }) => readonly ["chart rendering failed", any];
    106: () => `Theming API and Legacy Themes are both used in the same page. A Theming API theme has been provided to the 'theme' grid option, but the file (ag-grid.css) is also included and will cause styling issues. Remove ag-grid.css from the page. See the migration guide: ${string}/theming-migration/`;
    107: ({ key, value }: {
        key: string;
        value: unknown;
    }) => `Invalid value for theme param ${string} - ${string}`;
    108: ({ e }: {
        e: any;
    }) => readonly ["chart update failed", any];
    109: ({ inputValue, allSuggestions }: {
        inputValue: string;
        allSuggestions: string[];
    }) => string;
    110: () => "groupHideOpenParents only works when specifying specific columns for colDef.showRowGroup";
    111: () => "Invalid selection state. When `groupSelects` is enabled, the state must conform to `IServerSideGroupSelectionState`.";
    113: () => "Set Filter cannot initialise because you are using a row model that does not contain all rows in the browser. Either use a different filter type, or configure Set Filter such that you provide it with values";
    114: ({ component }: {
        component: string;
    }) => `Could not find component with name of ${string}. Is it in Vue.components?`;
    116: () => "Invalid selection state. The state must conform to `IServerSideSelectionState`.";
    117: () => "selectAll must be of boolean type.";
    118: () => "Infinite scrolling must be enabled in order to set the row count.";
    119: () => string;
    120: () => string;
    121: () => "a column you are grouping or pivoting by has objects as values. If you want to group by complex objects then either a) use a colDef.keyCreator (see AG Grid docs) or b) to toString() on the object to return a key";
    122: () => "could not find the document, document is empty";
    123: () => "Advanced Filter is only supported with the Client-Side Row Model or Server-Side Row Model.";
    124: () => "No active charts to update.";
    125: ({ chartId }: {
        chartId: string;
    }) => `Unable to update chart. No active chart found with ID: ${string}.`;
    126: () => "unable to restore chart as no chart model is provided";
    127: ({ allRange }: {
        allRange?: boolean | undefined;
    }) => "unable to create chart as there are no columns in the grid." | "unable to create chart as no range is selected.";
    128: ({ feature }: {
        feature: string;
    }) => `${string} is only available if using 'multiRow' selection mode.`;
    129: ({ feature, rowModel }: {
        feature: string;
        rowModel: string;
    }) => `${string} is only available if using 'clientSide' or 'serverSide' rowModelType, you are using ${string}.`;
    130: () => "cannot multi select unless selection mode is \"multiRow\"";
    132: () => "Row selection features are not available unless `rowSelection` is enabled.";
    133: ({ iconName }: {
        iconName: string;
    }) => `icon '${string}' function should return back a string or a dom object`;
    134: ({ iconName }: {
        iconName: string;
    }) => `Did not find icon '${string}'`;
    135: () => "Data type of the new value does not match the cell data type of the column";
    136: () => "Unable to update chart as the 'type' is missing. It must be either 'rangeChartUpdate', 'pivotChartUpdate', or 'crossFilterChartUpdate'.";
    137: ({ type, currentChartType }: {
        type: string;
        currentChartType: string;
    }) => `Unable to update chart as a '${string}' update type is not permitted on a ${string}.`;
    138: ({ chartType }: {
        chartType: string;
    }) => `invalid chart type supplied: ${string}`;
    139: ({ customThemeName }: {
        customThemeName: string;
    }) => `a custom chart theme with the name ${string} has been supplied but not added to the 'chartThemes' list`;
    140: ({ name }: {
        name: string;
    }) => `no stock theme exists with the name '${string}' and no custom chart theme with that name was supplied to 'customChartThemes'`;
    141: () => "cross filtering with row grouping is not supported.";
    142: () => "cross filtering is only supported in the client side row model.";
    143: ({ panel }: {
        panel: string | undefined;
    }) => `'${string}' is not a valid Chart Tool Panel name`;
    144: ({ type }: {
        type: string;
    }) => `Invalid charts data panel group name supplied: '${string}'`;
    145: ({ group }: {
        group: string;
    }) => `As of v32, only one charts customize panel group can be expanded at a time. '${string}' will not be expanded.`;
    146: ({ comp }: {
        comp: string;
    }) => `Unable to instantiate component '${string}' as its module hasn't been loaded. Add 'ValidationModule' to see which module is required.`;
    147: ({ group }: {
        group: string;
    }) => `Invalid charts customize panel group name supplied: '${string}'`;
    148: ({ group }: {
        group: string;
    }) => `invalid chartGroupsDef config '${string}'`;
    149: ({ group, chartType }: {
        group: string;
        chartType: string;
    }) => `invalid chartGroupsDef config '${string}.${string}'`;
    150: () => "'seriesChartTypes' are required when the 'customCombo' chart type is specified.";
    151: ({ chartType }: {
        chartType: string;
    }) => `invalid chartType '${string}' supplied in 'seriesChartTypes', converting to 'line' instead.`;
    152: ({ colId }: {
        colId: string;
    }) => `no 'seriesChartType' found for colId = '${string}', defaulting to 'line'.`;
    153: ({ chartDataType }: {
        chartDataType: string;
    }) => `unexpected chartDataType value '${string}' supplied, instead use 'category', 'series' or 'excluded'`;
    154: ({ colId }: {
        colId: string;
    }) => `cross filtering requires a 'agSetColumnFilter' or 'agMultiColumnFilter' to be defined on the column with id: ${string}`;
    155: ({ option }: {
        option: string;
    }) => `'${string}' is not a valid Chart Toolbar Option`;
    156: ({ panel }: {
        panel: string;
    }) => `Invalid panel in chartToolPanelsDef.panels: '${string}'`;
    157: ({ unrecognisedGroupIds }: {
        unrecognisedGroupIds: string[];
    }) => readonly ["unable to find group(s) for supplied groupIds:", string[]];
    158: () => "can not expand a column item that does not represent a column group header";
    159: () => "Invalid params supplied to createExcelFileForExcel() - `ExcelExportParams.data` is empty.";
    160: () => "Export cancelled. Export is not allowed as per your configuration.";
    161: () => "The Excel Exporter is currently on Multi Sheet mode. End that operation by calling 'api.getMultipleSheetAsExcel()' or 'api.exportMultipleSheetsAsExcel()'";
    162: ({ id, dataType }: {
        id: string;
        dataType: string;
    }) => `Unrecognized data type for excel export [${string}.dataType=${string}]`;
    163: ({ featureName }: {
        featureName: string;
    }) => `Excel table export does not work with ${string}. The exported Excel file will not contain any Excel tables.\n Please turn off ${string} to enable Excel table exports.`;
    164: () => "Unable to add data table to Excel sheet: A table already exists.";
    165: () => "Unable to add data table to Excel sheet: Missing required parameters.";
    166: ({ unrecognisedGroupIds }: {
        unrecognisedGroupIds: string[];
    }) => readonly ["unable to find groups for these supplied groupIds:", string[]];
    167: ({ unrecognisedColIds }: {
        unrecognisedColIds: string[];
    }) => readonly ["unable to find columns for these supplied colIds:", string[]];
    168: () => "detailCellRendererParams.template should be function or string";
    169: () => "Reference to eDetailGrid was missing from the details template. Please add data-ref=\"eDetailGrid\" to the template.";
    170: ({ providedStrategy }: {
        providedStrategy: string;
    }) => `invalid cellRendererParams.refreshStrategy = ${string} supplied, defaulting to refreshStrategy = 'rows'.`;
    171: () => "could not find detail grid options for master detail, please set gridOptions.detailCellRendererParams.detailGridOptions";
    172: () => "could not find getDetailRowData for master / detail, please set gridOptions.detailCellRendererParams.getDetailRowData";
    173: ({ group }: {
        group: string;
    }) => `invalid chartGroupsDef config '${string}'`;
    174: ({ group, chartType }: {
        group: string;
        chartType: string;
    }) => `invalid chartGroupsDef config '${string}.${string}'`;
    175: ({ menuTabName, itemsToConsider }: {
        menuTabName: string;
        itemsToConsider: string[];
    }) => readonly [`Trying to render an invalid menu item '${string}'. Check that your 'menuTabs' contains one of `, string[]];
    176: ({ key }: {
        key: string;
    }) => `unknown menu item type ${string}`;
    177: () => "valid values for cellSelection.handle.direction are 'x', 'y' and 'xy'. Default to 'xy'.";
    178: ({ colId }: {
        colId: string;
    }) => `column ${string} is not visible`;
    179: () => "totalValueGetter should be either a function or a string (expression)";
    180: () => "agRichSelectCellEditor requires cellEditorParams.values to be set";
    181: () => "agRichSelectCellEditor cannot have `multiSelect` and `allowTyping` set to `true`. AllowTyping has been turned off.";
    182: () => "you cannot mix groupDisplayType = \"multipleColumns\" with treeData, only one column can be used to display groups when doing tree data";
    183: () => "Group Column Filter only works on group columns. Please use a different filter.";
    184: ({ parentGroupData, childNodeData }: {
        parentGroupData: any;
        childNodeData: any;
    }) => readonly ["duplicate group keys for row data, keys should be unique", readonly [any, any]];
    185: ({ data }: {
        data: any;
    }) => readonly ["getDataPath() should not return an empty path", readonly [any]];
    186: ({ rowId, rowData, duplicateRowsData, }: {
        rowId: string | undefined;
        rowData: any;
        duplicateRowsData: any[];
    }) => readonly ["duplicate group keys for row data, keys should be unique", string | undefined, any, ...any[]];
    187: ({ rowId, firstData, secondData }: {
        rowId: string;
        firstData: any;
        secondData: any;
    }) => readonly [`Duplicate node id ${string}. Row IDs are provided via the getRowId() callback. Please modify the getRowId() callback code to provide unique row id values.`, "first instance", any, "second instance", any];
    188: (props?: {
        feature?: string;
    }) => `getRowId callback must be provided for Server Side Row Model ${string} to work correctly.`;
    189: ({ startRow }: {
        startRow: number;
    }) => `invalid value ${number} for startRow, the value should be >= 0`;
    190: ({ rowGroupId, data }: {
        rowGroupId: string | undefined;
        data: any;
    }) => readonly ["null and undefined values are not allowed for server side row model keys", string, "data is ", any];
    194: ({ method }: {
        method: string;
    }) => `calling gridApi.${string}() is only possible when using rowModelType=\`clientSide\`.`;
    195: ({ justCurrentPage }: {
        justCurrentPage: boolean | undefined;
    }) => "selecting just filtered only works when gridOptions.rowModelType='clientSide'" | "selecting just current page only works when gridOptions.rowModelType='clientSide'";
    196: ({ key }: {
        key: string;
    }) => `Provided ids must be of string type. Invalid id provided: ${string}`;
    197: () => "`toggledNodes` must be an array of string ids.";
    199: () => "getSelectedNodes and getSelectedRows functions cannot be used with select all functionality with the server-side row model. Use `api.getServerSideSelectionState()` instead.";
    200: ({ reasonOrId, moduleName, gridScoped, gridId, rowModelType, additionalText, isUmd, }: {
        reasonOrId: string | keyof MissingModuleErrors;
        moduleName: ValidationModuleName | ValidationModuleName[];
        gridScoped: boolean;
        gridId: string;
        rowModelType: RowModelType;
        additionalText?: string | undefined;
        isUmd?: boolean | undefined;
    }) => string;
    201: ({ rowModelType }: {
        rowModelType: string;
    }) => string;
    202: () => "`getSelectedNodes` and `getSelectedRows` functions cannot be used with `groupSelectsChildren` and the server-side row model. Use `api.getServerSideSelectionState()` instead.";
    203: () => "Server Side Row Model does not support Dynamic Row Height and Cache Purging. Either a) remove getRowHeight() callback or b) remove maxBlocksInCache property. Purging has been disabled.";
    204: () => "Server Side Row Model does not support Auto Row Height and Cache Purging. Either a) remove colDef.autoHeight or b) remove maxBlocksInCache property. Purging has been disabled.";
    205: ({ duplicateIdText }: {
        duplicateIdText: string;
    }) => `Unable to display rows as duplicate row ids (${string}) were returned by the getRowId callback. Please modify the getRowId callback to provide unique ids.`;
    206: () => "getRowId callback must be implemented for transactions to work. Transaction was ignored.";
    207: () => "The Set Filter Parameter \"defaultToNothingSelected\" value was ignored because it does not work when \"excelMode\" is used.";
    208: () => "Set Filter Value Formatter must return string values. Please ensure the Set Filter Value Formatter returns string values for complex objects.";
    209: () => `Set Filter Key Creator is returning null for provided values and provided values are primitives. Please provide complex objects. See ${string}/filter-set-filter-list/#filter-value-types`;
    210: () => "Set Filter has a Key Creator, but provided values are primitives. Did you mean to provide complex objects?";
    211: () => "property treeList=true for Set Filter params, but you did not provide a treeListPathGetter or values of type Date.";
    212: () => "please review all your toolPanel components, it seems like at least one of them doesn't have an id";
    213: () => "Advanced Filter does not work with Filters Tool Panel. Filters Tool Panel has been disabled.";
    214: ({ key }: {
        key: string;
    }) => `unable to lookup Tool Panel as invalid key supplied: ${string}`;
    215: ({ key, defaultByKey }: {
        key: string;
        defaultByKey: object;
    }) => `the key ${string} is not a valid key for specifying a tool panel, valid keys are: ${string}`;
    216: ({ name }: {
        name: string;
    }) => `Missing component for '${string}'`;
    217: ({ invalidColIds }: {
        invalidColIds: any[];
    }) => readonly ["unable to find grid columns for the supplied colDef(s):", any[]];
    218: ({ property, defaultOffset }: {
        property: string;
        defaultOffset: number | undefined;
    }) => `${string} must be a number, the value you provided is not a valid number. Using the default of undefinedpx.` | `${string} must be a number, the value you provided is not a valid number. Using the default of ${number}px.`;
    219: ({ property }: {
        property: string;
    }) => `Property ${string} does not exist on the target object.`;
    220: ({ lineDash }: {
        lineDash: string;
    }) => `'${string}' is not a valid 'lineDash' option.`;
    221: () => "agAggregationComponent should only be used with the client and server side row model.";
    222: () => "agFilteredRowCountComponent should only be used with the client side row model.";
    223: () => "agSelectedRowCountComponent should only be used with the client and server side row model.";
    224: () => "agTotalAndFilteredRowCountComponent should only be used with the client side row model.";
    225: () => "agTotalRowCountComponent should only be used with the client side row model.";
    226: () => "viewport is missing init method.";
    227: () => "menu item icon must be DOM node or string";
    228: ({ menuItemOrString }: {
        menuItemOrString: string;
    }) => `unrecognised menu item ${string}`;
    229: ({ index }: {
        index: number;
    }) => readonly ["invalid row index for ensureIndexVisible: ", number];
    230: () => "detailCellRendererParams.template is not supported by AG Grid React. To change the template, provide a Custom Detail Cell Renderer. See https://www.ag-grid.com/react-data-grid/master-detail-custom-detail/";
    231: () => "As of v32, using custom components with `reactiveCustomComponents = false` is deprecated.";
    232: () => "Using both rowData and v-model. rowData will be ignored.";
    233: ({ methodName }: {
        methodName: string;
    }) => `Framework component is missing the method ${string}()`;
    234: () => "Group Column Filter does not work with the colDef property \"field\". This property will be ignored.";
    235: () => "Group Column Filter does not work with the colDef property \"filterValueGetter\". This property will be ignored.";
    236: () => "Group Column Filter does not work with the colDef property \"filterParams\". This property will be ignored.";
    237: () => "Group Column Filter does not work with Tree Data enabled. Please disable Tree Data, or use a different filter.";
    238: () => "setRowCount can only accept a positive row count.";
    239: () => "Theming API and CSS File Themes are both used in the same page. In v33 we released the Theming API as the new default method of styling the grid. See the migration docs https://www.ag-grid.com/react-data-grid/theming-migration/. Because no value was provided to the `theme` grid option it defaulted to themeQuartz. But the file (ag-grid.css) is also included and will cause styling issues. Either pass the string \"legacy\" to the theme grid option to use v32 style themes, or remove ag-grid.css from the page to use Theming API.";
    240: ({ theme }: {
        theme: any;
    }) => `theme grid option must be a Theming API theme object or the string "legacy", received: ${any}`;
    243: () => "Failed to deserialize state - each provided state object must be an object.";
    244: () => "Failed to deserialize state - `selectAllChildren` must be a boolean value or undefined.";
    245: () => "Failed to deserialize state - `toggledNodes` must be an array.";
    246: () => "Failed to deserialize state - Every `toggledNode` requires an associated string id.";
    247: () => "Row selection state could not be parsed due to invalid data. Ensure all child state has toggledNodes or does not conform with the parent rule. \nPlease rebuild the selection state and reapply it.";
    248: () => "SetFloatingFilter expects SetFilter as its parent";
    249: () => "Must supply a Value Formatter in Set Filter params when using a Key Creator";
    250: () => "Must supply a Key Creator in Set Filter params when `treeList = true` on a group column, and Tree Data or Row Grouping is enabled.";
    251: ({ chartType }: {
        chartType: string;
    }) => `AG Grid: Unable to create chart as an invalid chartType = '${string}' was supplied.`;
    252: () => "cannot get grid to draw rows when it is in the middle of drawing rows. \nYour code probably called a grid API method while the grid was in the render stage. \nTo overcome this, put the API call into a timeout, e.g. instead of api.redrawRows(), call setTimeout(function() { api.redrawRows(); }, 0). \nTo see what part of your code that caused the refresh check this stacktrace.";
    253: ({ version }: {
        version: string;
    }) => readonly ["Illegal version string: ", string];
    254: () => "Cannot create chart: no chart themes available.";
    255: ({ point }: {
        point: number;
    }) => `Lone surrogate U+${string} is not a scalar value`;
    256: () => "Unable to initialise. See validation error, or load ValidationModule if missing.";
    257: () => "IntegratedChartsModule must be initialised with an AG Charts module. One of 'AgChartsCommunityModule' / 'AgChartsEnterpriseModule'.\n\nimport { AgChartsEnterpriseModule } from 'ag-charts-enterprise';\nimport { ModuleRegistry } from 'ag-grid-community';\nimport { IntegratedChartsModule } from 'ag-grid-enterprise';\n    \nModuleRegistry.registerModules([IntegratedChartsModule.with(AgChartsEnterpriseModule)]);\n    " | "IntegratedChartsModule must be initialised with an AG Charts module. One of 'AgChartsCommunityModule' / 'AgChartsEnterpriseModule'.\n\nimport { AgChartsEnterpriseModule } from 'ag-charts-enterprise';\nimport { ModuleRegistry } from 'ag-grid-community';\nimport { IntegratedChartsModule } from 'ag-grid-enterprise';\n    \nModuleRegistry.registerModules([SparklinesModule.with(AgChartsEnterpriseModule)]);\n    " | "IntegratedChartsModule must be initialised with an AG Charts module. One of 'AgChartsCommunityModule' / 'AgChartsEnterpriseModule'.\n\nimport { AgChartsEnterpriseModule } from 'ag-charts-enterprise';\nimport { ModuleRegistry } from 'ag-grid-community';\nimport { SparklinesModule } from 'ag-grid-enterprise';\n    \nModuleRegistry.registerModules([IntegratedChartsModule.with(AgChartsEnterpriseModule)]);\n    " | "IntegratedChartsModule must be initialised with an AG Charts module. One of 'AgChartsCommunityModule' / 'AgChartsEnterpriseModule'.\n\nimport { AgChartsEnterpriseModule } from 'ag-charts-enterprise';\nimport { ModuleRegistry } from 'ag-grid-community';\nimport { SparklinesModule } from 'ag-grid-enterprise';\n    \nModuleRegistry.registerModules([SparklinesModule.with(AgChartsEnterpriseModule)]);\n    " | "SparklinesModule must be initialised with an AG Charts module. One of 'AgChartsCommunityModule' / 'AgChartsEnterpriseModule'.\n\nimport { AgChartsEnterpriseModule } from 'ag-charts-enterprise';\nimport { ModuleRegistry } from 'ag-grid-community';\nimport { IntegratedChartsModule } from 'ag-grid-enterprise';\n    \nModuleRegistry.registerModules([IntegratedChartsModule.with(AgChartsEnterpriseModule)]);\n    " | "SparklinesModule must be initialised with an AG Charts module. One of 'AgChartsCommunityModule' / 'AgChartsEnterpriseModule'.\n\nimport { AgChartsEnterpriseModule } from 'ag-charts-enterprise';\nimport { ModuleRegistry } from 'ag-grid-community';\nimport { IntegratedChartsModule } from 'ag-grid-enterprise';\n    \nModuleRegistry.registerModules([SparklinesModule.with(AgChartsEnterpriseModule)]);\n    " | "SparklinesModule must be initialised with an AG Charts module. One of 'AgChartsCommunityModule' / 'AgChartsEnterpriseModule'.\n\nimport { AgChartsEnterpriseModule } from 'ag-charts-enterprise';\nimport { ModuleRegistry } from 'ag-grid-community';\nimport { SparklinesModule } from 'ag-grid-enterprise';\n    \nModuleRegistry.registerModules([IntegratedChartsModule.with(AgChartsEnterpriseModule)]);\n    " | "SparklinesModule must be initialised with an AG Charts module. One of 'AgChartsCommunityModule' / 'AgChartsEnterpriseModule'.\n\nimport { AgChartsEnterpriseModule } from 'ag-charts-enterprise';\nimport { ModuleRegistry } from 'ag-grid-community';\nimport { SparklinesModule } from 'ag-grid-enterprise';\n    \nModuleRegistry.registerModules([SparklinesModule.with(AgChartsEnterpriseModule)]);\n    ";
    258: () => "IntegratedChartsModule must be initialised with an AG Charts module. One of 'AgChartsCommunityModule' / 'AgChartsEnterpriseModule'.\n\nimport { AgChartsEnterpriseModule } from 'ag-charts-enterprise';\nimport { ModuleRegistry } from 'ag-grid-community';\nimport { IntegratedChartsModule } from 'ag-grid-enterprise';\n    \nModuleRegistry.registerModules([IntegratedChartsModule.with(AgChartsEnterpriseModule)]);\n    " | "IntegratedChartsModule must be initialised with an AG Charts module. One of 'AgChartsCommunityModule' / 'AgChartsEnterpriseModule'.\n\nimport { AgChartsEnterpriseModule } from 'ag-charts-enterprise';\nimport { ModuleRegistry } from 'ag-grid-community';\nimport { IntegratedChartsModule } from 'ag-grid-enterprise';\n    \nModuleRegistry.registerModules([SparklinesModule.with(AgChartsEnterpriseModule)]);\n    " | "IntegratedChartsModule must be initialised with an AG Charts module. One of 'AgChartsCommunityModule' / 'AgChartsEnterpriseModule'.\n\nimport { AgChartsEnterpriseModule } from 'ag-charts-enterprise';\nimport { ModuleRegistry } from 'ag-grid-community';\nimport { SparklinesModule } from 'ag-grid-enterprise';\n    \nModuleRegistry.registerModules([IntegratedChartsModule.with(AgChartsEnterpriseModule)]);\n    " | "IntegratedChartsModule must be initialised with an AG Charts module. One of 'AgChartsCommunityModule' / 'AgChartsEnterpriseModule'.\n\nimport { AgChartsEnterpriseModule } from 'ag-charts-enterprise';\nimport { ModuleRegistry } from 'ag-grid-community';\nimport { SparklinesModule } from 'ag-grid-enterprise';\n    \nModuleRegistry.registerModules([SparklinesModule.with(AgChartsEnterpriseModule)]);\n    " | "SparklinesModule must be initialised with an AG Charts module. One of 'AgChartsCommunityModule' / 'AgChartsEnterpriseModule'.\n\nimport { AgChartsEnterpriseModule } from 'ag-charts-enterprise';\nimport { ModuleRegistry } from 'ag-grid-community';\nimport { IntegratedChartsModule } from 'ag-grid-enterprise';\n    \nModuleRegistry.registerModules([IntegratedChartsModule.with(AgChartsEnterpriseModule)]);\n    " | "SparklinesModule must be initialised with an AG Charts module. One of 'AgChartsCommunityModule' / 'AgChartsEnterpriseModule'.\n\nimport { AgChartsEnterpriseModule } from 'ag-charts-enterprise';\nimport { ModuleRegistry } from 'ag-grid-community';\nimport { IntegratedChartsModule } from 'ag-grid-enterprise';\n    \nModuleRegistry.registerModules([SparklinesModule.with(AgChartsEnterpriseModule)]);\n    " | "SparklinesModule must be initialised with an AG Charts module. One of 'AgChartsCommunityModule' / 'AgChartsEnterpriseModule'.\n\nimport { AgChartsEnterpriseModule } from 'ag-charts-enterprise';\nimport { ModuleRegistry } from 'ag-grid-community';\nimport { SparklinesModule } from 'ag-grid-enterprise';\n    \nModuleRegistry.registerModules([IntegratedChartsModule.with(AgChartsEnterpriseModule)]);\n    " | "SparklinesModule must be initialised with an AG Charts module. One of 'AgChartsCommunityModule' / 'AgChartsEnterpriseModule'.\n\nimport { AgChartsEnterpriseModule } from 'ag-charts-enterprise';\nimport { ModuleRegistry } from 'ag-grid-community';\nimport { SparklinesModule } from 'ag-grid-enterprise';\n    \nModuleRegistry.registerModules([SparklinesModule.with(AgChartsEnterpriseModule)]);\n    ";
    259: ({ part }: {
        part: any;
    }) => `the argument to theme.withPart must be a Theming API part object, received: ${any}`;
    260: ({ propName, compName, gridScoped, gridId, rowModelType, }: {
        propName: string;
        compName: string;
        gridScoped: boolean;
        gridId: string;
        rowModelType: RowModelType;
    }) => string;
    261: () => "As of v33, `column.isHovered()` is deprecated. Use `api.isColumnHovered(column)` instead.";
    262: () => "As of v33, icon key \"smallDown\" is deprecated. Use \"advancedFilterBuilderSelect\" for Advanced Filter Builder dropdown, \"selectOpen\" for Select cell editor and dropdowns (e.g. Integrated Charts menu), \"richSelectOpen\" for Rich Select cell editor.";
    263: () => "As of v33, icon key \"smallLeft\" is deprecated. Use \"panelDelimiterRtl\" for Row Group Panel / Pivot Panel, \"subMenuOpenRtl\" for sub-menus.";
    264: () => "As of v33, icon key \"smallRight\" is deprecated. Use \"panelDelimiter\" for Row Group Panel / Pivot Panel, \"subMenuOpen\" for sub-menus.";
    265: ({ colId }: {
        colId: string;
    }) => `Unable to infer chart data type for column '${string}' if first data entry is null. Please specify "chartDataType", or a "cellDataType" in the column definition. For more information, see ${string}/integrated-charts-range-chart#coldefchartdatatype .`;
    266: () => "As of v33.1, using \"keyCreator\" with the Rich Select Editor has been deprecated. It now requires the \"formatValue\" callback to convert complex data to strings.";
    267: () => "Detail grids can not use a different theme to the master grid, the `theme` detail grid option will be ignored.";
    268: () => "Transactions aren't supported with tree data when using treeDataChildrenField";
    269: () => "When `masterSelects: 'detail'`, detail grids must be configured with multi-row selection";
    270: ({ id, parentId }: {
        id: string;
        parentId: string;
    }) => `Cycle detected for row with id='${string}' and parent id='${string}'. Resetting the parent for row with id='${string}' and showing it as a root-level node.`;
    271: ({ id, parentId }: {
        id: string;
        parentId: string;
    }) => `Parent row not found for row with id='${string}' and parent id='${string}'. Showing row with id='${string}' as a root-level node.`;
    272: () => "No AG Grid modules are registered! It is recommended to start with all Community features via the AllCommunityModule:\n                    \n    import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';\n    \n    ModuleRegistry.registerModules([ AllCommunityModule ]);\n    ";
    273: ({ providedId, usedId }: {
        providedId: string;
        usedId: string;
    }) => `Provided column id '${string}' was already in use, ensure all column and group ids are unique. Using '${string}' instead.`;
    274: ({ prop }: {
        prop: string;
    }) => string;
    275: typeof missingRowModelTypeError;
    276: () => "Row Numbers Row Resizer cannot be used when Grid Columns have `autoHeight` enabled.";
    277: ({ colId }: {
        colId: string;
    }) => `'enableFilterHandlers' is set to true, but column '${string}' does not have 'filter.doesFilterPass' or 'filter.handler' set.`;
    278: ({ colId }: {
        colId: string;
    }) => `Unable to create filter handler for column '${string}'`;
    279: (_: {
        name: DynamicBeanName;
    }) => void;
    280: ({ colId }: {
        colId: string;
    }) => `'name' must be provided for custom filter components for column '${string}`;
    281: ({ colId }: {
        colId: string;
    }) => `Filter for column '${string}' does not have 'filterParams.buttons', but the new Filters Tool Panel has buttons configured. Either configure buttons for the filter, or disable buttons on the Filters Tool Panel.`;
    282: () => "New filter tool panel requires `enableFilterHandlers: true`.";
    283: () => "As of v34, use the same method on the filter handler (`api.getColumnFilterHandler(colKey)`) instead.";
    284: () => "As of v34, filters are active when they have a model. Use `api.getColumnFilterModel()` instead.";
    285: () => "As of v34, use (`api.getColumnFilterModel()`) instead.";
    286: () => "As of v34, use (`api.setColumnFilterModel()`) instead.";
    287: () => "`api.doFilterAction()` requires `enableFilterHandlers = true";
    288: () => "`api.getColumnFilterModel(key, true)` requires `enableFilterHandlers = true";
    289: ({ rowModelType }: {
        rowModelType: string;
    }) => `Row Model '${string}' is not supported with Batch Editing`;
    290: ({ rowIndex, rowPinned }: {
        rowIndex: number;
        rowPinned: RowPinnedType;
    }) => `Row with index '${number}' and pinned state 'undefined' not found` | `Row with index '${number}' and pinned state 'null' not found` | `Row with index '${number}' and pinned state 'top' not found` | `Row with index '${number}' and pinned state 'bottom' not found`;
    291: () => "License Key being set multiple times with different values. This can result in an incorrect license key being used,";
    292: ({ colId }: {
        colId: string;
    }) => `The Multi Filter for column '${string}' has buttons configured against the child filters. When 'enableFilterHandlers=true', buttons must instead be provided against the parent Multi Filter params. The child filter buttons will be ignored.`;
};
export type ErrorMap = typeof AG_GRID_ERRORS;
export type ErrorId = keyof ErrorMap;
type ErrorValue<TId extends ErrorId | null> = TId extends ErrorId ? ErrorMap[TId] : never;
export type GetErrorParams<TId extends ErrorId> = ErrorValue<TId> extends (params: infer P) => any ? (P extends Record<string, any> ? P : undefined) : never;
export declare function getError<TId extends ErrorId, TParams extends GetErrorParams<TId>>(errorId: TId, args: TParams): any[];
declare const MISSING_MODULE_REASONS: {
    readonly 1: "Charting Aggregation";
    readonly 2: "pivotResultFields";
    readonly 3: "setTooltip";
};
export type MissingModuleErrors = typeof MISSING_MODULE_REASONS;
export {};
