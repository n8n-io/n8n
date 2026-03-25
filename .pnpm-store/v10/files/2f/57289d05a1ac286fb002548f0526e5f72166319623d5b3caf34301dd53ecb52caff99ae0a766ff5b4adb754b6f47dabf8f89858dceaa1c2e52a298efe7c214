var W = Object.defineProperty;
var N = (r, d, e) => d in r ? W(r, d, { enumerable: !0, configurable: !0, writable: !0, value: e }) : r[d] = e;
var C = (r, d, e) => N(r, typeof d != "symbol" ? d + "" : d, e);
import { defineComponent as k, createVNode as U, render as T, toRaw as x, isRef as _, isReactive as j, isProxy as q, mergeModels as O, mergeDefaults as $, useTemplateRef as K, ref as g, toRefs as Q, watch as M, useModel as Y, getCurrentInstance as S, onMounted as J, markRaw as X, onUnmounted as Z, openBlock as ee, createElementBlock as ne } from "vue";
import { _error as H, BaseComponentWrapper as oe, _warn as de, VanillaFrameworkOverrides as te, _GET_ALL_GRID_OPTIONS as A, _processOnChange as ie, _registerModule as ae, RowApiModule as re, _combineAttributesAndGridOptions as le, _PUBLIC_EVENT_HANDLERS_MAP as ue, createGrid as se, ALWAYS_SYNC_GLOBAL_EVENTS as pe } from "ag-grid-community";
class v {
  static getComponentDefinition(d, e) {
    let n;
    return typeof d == "string" ? n = this.searchForComponentInstance(e, d) : n = { extends: k({ ...d }) }, n || H(114, { component: d }), n.extends ? (n.extends.setup && (n.setup = n.extends.setup), n.extends.props = this.addParamsToProps(n.extends.props)) : n.props = this.addParamsToProps(n.props), n;
  }
  static addParamsToProps(d) {
    return !d || Array.isArray(d) && d.indexOf("params") === -1 ? d = ["params", ...d || []] : typeof d == "object" && !d.params && (d.params = {
      type: Object
    }), d;
  }
  static createAndMountComponent(d, e, n, s) {
    const t = v.getComponentDefinition(d, n);
    if (!t)
      return;
    const { vNode: l, destroy: o, el: i } = this.mount(
      t,
      { params: Object.freeze(e) },
      n,
      s || {}
    );
    return {
      componentInstance: l.component.proxy,
      element: i,
      destroy: o
    };
  }
  static mount(d, e, n, s) {
    let t = U(d, e);
    t.appContext = { ...n.appContext, provides: s };
    let l = document.createDocumentFragment();
    return T(t, l), { vNode: t, destroy: () => {
      l && T(null, l), l = null, t = null;
    }, el: l };
  }
  static searchForComponentInstance(d, e, n = 10, s = !1) {
    let t = null, l = 0, o = d.parent;
    for (; !t && o && o.components && ++l < n; )
      o.components && o.components[e] && (t = o.components[e]), o = o.parent;
    for (l = 0, o = d.parent; !t && o && o.$options && ++l < n; ) {
      const i = o;
      i.$options && i.$options.components && i.$options.components[e] ? t = i.$options.components[e] : i[e] && (t = i[e]), o = o.parent;
    }
    for (l = 0, o = d.parent; !t && o && ++l < n; ) {
      if (o.exposed) {
        const i = o;
        i.exposed && i.exposed[e] ? t = i.exposed[e] : i[e] && (t = i[e]);
      }
      o = o.parent;
    }
    if (!t) {
      const i = d.appContext.components;
      i && i[e] && (t = i[e]);
    }
    return !t && !s ? (H(114, { component: e }), null) : t;
  }
}
class fe extends oe {
  constructor(e, n) {
    super();
    C(this, "parent");
    C(this, "provides");
    this.parent = e, this.provides = n;
  }
  createWrapper(e) {
    const n = this;
    class s extends ce {
      init(o) {
        super.init(o);
      }
      hasMethod(o) {
        var p, c;
        const i = t.getFrameworkComponentInstance();
        return i[o] ? !0 : ((p = i.$.exposed) == null ? void 0 : p[o]) != null || ((c = i.exposed) == null ? void 0 : c[o]) != null || i.$.setupState[o] != null;
      }
      callMethod(o, i) {
        var B, h;
        const p = this.getFrameworkComponentInstance(), c = t.getFrameworkComponentInstance();
        if (c[o])
          return c[o].apply(p, i);
        {
          const m = ((B = p.$.exposed) == null ? void 0 : B[o]) || ((h = p.exposed) == null ? void 0 : h[o]) || p.$.setupState[o];
          return m == null ? void 0 : m.apply(p, i);
        }
      }
      addMethod(o, i) {
        t[o] = i;
      }
      processMethod(o, i) {
        return o === "refresh" && (this.getFrameworkComponentInstance().params = i[0]), this.hasMethod(o) ? this.callMethod(o, i) : o === "refresh";
      }
      createComponent(o) {
        return n.createComponent(e, o);
      }
    }
    const t = new s();
    return t;
  }
  createComponent(e, n) {
    return v.createAndMountComponent(e, n, this.parent, this.provides);
  }
  createMethodProxy(e, n, s) {
    return function() {
      return e.hasMethod(n) ? e.callMethod(n, arguments) : (s && de(233, { methodName: n }), null);
    };
  }
  destroy() {
    this.parent = null;
  }
}
class ce {
  constructor() {
    C(this, "componentInstance");
    C(this, "element");
    C(this, "unmount");
  }
  getGui() {
    return this.element;
  }
  destroy() {
    this.getFrameworkComponentInstance() && typeof this.getFrameworkComponentInstance().destroy == "function" && this.getFrameworkComponentInstance().destroy(), this.unmount();
  }
  getFrameworkComponentInstance() {
    return this.componentInstance;
  }
  init(d) {
    const { componentInstance: e, element: n, destroy: s } = this.createComponent(d);
    this.componentInstance = e, this.unmount = s, this.element = n.firstElementChild ?? n;
  }
}
class ge extends te {
  constructor(e) {
    super("vue");
    C(this, "parent");
    this.parent = e;
  }
  /*
   * vue components are specified in the "components" part of the vue component - as such we need a way to determine
   * if a given component is within that context - this method provides this
   * Note: This is only really used/necessary with cellRendererSelectors
   */
  frameworkComponent(e, n) {
    let s = v.searchForComponentInstance(this.parent, e, 10, !0) ? e : null;
    if (!s && n && n[e]) {
      const t = n[e];
      s = v.searchForComponentInstance(this.parent, t, 10, !0) ? t : null;
    }
    return s;
  }
  isFrameworkComponent(e) {
    return typeof e == "object";
  }
}
function ye() {
  return {
    gridOptions: {},
    modules: [],
    // @START_DEFAULTS@
    statusBar: void 0,
    sideBar: void 0,
    suppressContextMenu: void 0,
    preventDefaultOnContextMenu: void 0,
    allowContextMenuWithControlKey: void 0,
    columnMenu: void 0,
    suppressMenuHide: void 0,
    enableBrowserTooltips: void 0,
    tooltipTrigger: void 0,
    tooltipShowDelay: void 0,
    tooltipHideDelay: void 0,
    tooltipMouseTrack: void 0,
    tooltipShowMode: void 0,
    tooltipInteraction: void 0,
    popupParent: void 0,
    copyHeadersToClipboard: void 0,
    copyGroupHeadersToClipboard: void 0,
    clipboardDelimiter: void 0,
    suppressCopyRowsToClipboard: void 0,
    suppressCopySingleCellRanges: void 0,
    suppressLastEmptyLineOnPaste: void 0,
    suppressClipboardPaste: void 0,
    suppressClipboardApi: void 0,
    suppressCutToClipboard: void 0,
    columnDefs: void 0,
    defaultColDef: void 0,
    defaultColGroupDef: void 0,
    columnTypes: void 0,
    dataTypeDefinitions: void 0,
    maintainColumnOrder: void 0,
    enableStrictPivotColumnOrder: void 0,
    suppressFieldDotNotation: void 0,
    headerHeight: void 0,
    groupHeaderHeight: void 0,
    floatingFiltersHeight: void 0,
    pivotHeaderHeight: void 0,
    pivotGroupHeaderHeight: void 0,
    hidePaddedHeaderRows: void 0,
    allowDragFromColumnsToolPanel: void 0,
    suppressMovableColumns: void 0,
    suppressColumnMoveAnimation: void 0,
    suppressMoveWhenColumnDragging: void 0,
    suppressDragLeaveHidesColumns: void 0,
    suppressGroupChangesColumnVisibility: void 0,
    suppressMakeColumnVisibleAfterUnGroup: void 0,
    suppressRowGroupHidesColumns: void 0,
    colResizeDefault: void 0,
    suppressAutoSize: void 0,
    autoSizePadding: void 0,
    skipHeaderOnAutoSize: void 0,
    autoSizeStrategy: void 0,
    components: void 0,
    editType: void 0,
    suppressStartEditOnTab: void 0,
    getFullRowEditValidationErrors: void 0,
    invalidEditValueMode: void 0,
    singleClickEdit: void 0,
    suppressClickEdit: void 0,
    readOnlyEdit: void 0,
    stopEditingWhenCellsLoseFocus: void 0,
    enterNavigatesVertically: void 0,
    enterNavigatesVerticallyAfterEdit: void 0,
    enableCellEditingOnBackspace: void 0,
    undoRedoCellEditing: void 0,
    undoRedoCellEditingLimit: void 0,
    defaultCsvExportParams: void 0,
    suppressCsvExport: void 0,
    defaultExcelExportParams: void 0,
    suppressExcelExport: void 0,
    excelStyles: void 0,
    findSearchValue: void 0,
    findOptions: void 0,
    quickFilterText: void 0,
    cacheQuickFilter: void 0,
    includeHiddenColumnsInQuickFilter: void 0,
    quickFilterParser: void 0,
    quickFilterMatcher: void 0,
    applyQuickFilterBeforePivotOrAgg: void 0,
    excludeChildrenWhenTreeDataFiltering: void 0,
    enableAdvancedFilter: void 0,
    alwaysPassFilter: void 0,
    includeHiddenColumnsInAdvancedFilter: void 0,
    advancedFilterParent: void 0,
    advancedFilterBuilderParams: void 0,
    advancedFilterParams: void 0,
    suppressAdvancedFilterEval: void 0,
    suppressSetFilterByDefault: void 0,
    enableFilterHandlers: void 0,
    filterHandlers: void 0,
    enableCharts: void 0,
    chartThemes: void 0,
    customChartThemes: void 0,
    chartThemeOverrides: void 0,
    chartToolPanelsDef: void 0,
    chartMenuItems: void 0,
    loadingCellRenderer: void 0,
    loadingCellRendererParams: void 0,
    loadingCellRendererSelector: void 0,
    localeText: void 0,
    masterDetail: void 0,
    keepDetailRows: void 0,
    keepDetailRowsCount: void 0,
    detailCellRenderer: void 0,
    detailCellRendererParams: void 0,
    detailRowHeight: void 0,
    detailRowAutoHeight: void 0,
    context: void 0,
    alignedGrids: void 0,
    tabIndex: void 0,
    rowBuffer: void 0,
    valueCache: void 0,
    valueCacheNeverExpires: void 0,
    enableCellExpressions: void 0,
    suppressTouch: void 0,
    suppressFocusAfterRefresh: void 0,
    suppressBrowserResizeObserver: void 0,
    suppressPropertyNamesCheck: void 0,
    suppressChangeDetection: void 0,
    debug: void 0,
    loading: void 0,
    overlayLoadingTemplate: void 0,
    loadingOverlayComponent: void 0,
    loadingOverlayComponentParams: void 0,
    suppressLoadingOverlay: void 0,
    overlayNoRowsTemplate: void 0,
    noRowsOverlayComponent: void 0,
    noRowsOverlayComponentParams: void 0,
    suppressNoRowsOverlay: void 0,
    pagination: void 0,
    paginationPageSize: void 0,
    paginationPageSizeSelector: void 0,
    paginationAutoPageSize: void 0,
    paginateChildRows: void 0,
    suppressPaginationPanel: void 0,
    pivotMode: void 0,
    pivotPanelShow: void 0,
    pivotMaxGeneratedColumns: void 0,
    pivotDefaultExpanded: void 0,
    pivotColumnGroupTotals: void 0,
    pivotRowTotals: void 0,
    pivotSuppressAutoColumn: void 0,
    suppressExpandablePivotGroups: void 0,
    functionsReadOnly: void 0,
    aggFuncs: void 0,
    suppressAggFuncInHeader: void 0,
    alwaysAggregateAtRootLevel: void 0,
    aggregateOnlyChangedColumns: void 0,
    suppressAggFilteredOnly: void 0,
    removePivotHeaderRowWhenSingleValueColumn: void 0,
    animateRows: void 0,
    cellFlashDuration: void 0,
    cellFadeDuration: void 0,
    allowShowChangeAfterFilter: void 0,
    domLayout: void 0,
    ensureDomOrder: void 0,
    enableCellSpan: void 0,
    enableRtl: void 0,
    suppressColumnVirtualisation: void 0,
    suppressMaxRenderedRowRestriction: void 0,
    suppressRowVirtualisation: void 0,
    rowDragManaged: void 0,
    rowDragInsertDelay: void 0,
    suppressRowDrag: void 0,
    suppressMoveWhenRowDragging: void 0,
    rowDragEntireRow: void 0,
    rowDragMultiRow: void 0,
    rowDragText: void 0,
    dragAndDropImageComponent: void 0,
    dragAndDropImageComponentParams: void 0,
    fullWidthCellRenderer: void 0,
    fullWidthCellRendererParams: void 0,
    embedFullWidthRows: void 0,
    groupDisplayType: void 0,
    groupDefaultExpanded: void 0,
    autoGroupColumnDef: void 0,
    groupMaintainOrder: void 0,
    groupSelectsChildren: void 0,
    groupLockGroupColumns: void 0,
    groupAggFiltering: void 0,
    groupTotalRow: void 0,
    grandTotalRow: void 0,
    suppressStickyTotalRow: void 0,
    groupSuppressBlankHeader: void 0,
    groupSelectsFiltered: void 0,
    showOpenedGroup: void 0,
    groupHideParentOfSingleChild: void 0,
    groupRemoveSingleChildren: void 0,
    groupRemoveLowestSingleChildren: void 0,
    groupHideOpenParents: void 0,
    groupAllowUnbalanced: void 0,
    rowGroupPanelShow: void 0,
    groupRowRenderer: void 0,
    groupRowRendererParams: void 0,
    treeData: void 0,
    treeDataChildrenField: void 0,
    treeDataParentIdField: void 0,
    rowGroupPanelSuppressSort: void 0,
    suppressGroupRowsSticky: void 0,
    pinnedTopRowData: void 0,
    pinnedBottomRowData: void 0,
    enableRowPinning: void 0,
    isRowPinnable: void 0,
    isRowPinned: void 0,
    rowModelType: void 0,
    rowData: void 0,
    asyncTransactionWaitMillis: void 0,
    suppressModelUpdateAfterUpdateTransaction: void 0,
    datasource: void 0,
    cacheOverflowSize: void 0,
    infiniteInitialRowCount: void 0,
    serverSideInitialRowCount: void 0,
    suppressServerSideFullWidthLoadingRow: void 0,
    cacheBlockSize: void 0,
    maxBlocksInCache: void 0,
    maxConcurrentDatasourceRequests: void 0,
    blockLoadDebounceMillis: void 0,
    purgeClosedRowNodes: void 0,
    serverSideDatasource: void 0,
    serverSideSortAllLevels: void 0,
    serverSideEnableClientSideSort: void 0,
    serverSideOnlyRefreshFilteredGroups: void 0,
    serverSidePivotResultFieldSeparator: void 0,
    viewportDatasource: void 0,
    viewportRowModelPageSize: void 0,
    viewportRowModelBufferSize: void 0,
    alwaysShowHorizontalScroll: void 0,
    alwaysShowVerticalScroll: void 0,
    debounceVerticalScrollbar: void 0,
    suppressHorizontalScroll: void 0,
    suppressScrollOnNewData: void 0,
    suppressScrollWhenPopupsAreOpen: void 0,
    suppressAnimationFrame: void 0,
    suppressMiddleClickScrolls: void 0,
    suppressPreventDefaultOnMouseWheel: void 0,
    scrollbarWidth: void 0,
    rowSelection: void 0,
    cellSelection: void 0,
    rowMultiSelectWithClick: void 0,
    suppressRowDeselection: void 0,
    suppressRowClickSelection: void 0,
    suppressCellFocus: void 0,
    suppressHeaderFocus: void 0,
    selectionColumnDef: void 0,
    rowNumbers: void 0,
    suppressMultiRangeSelection: void 0,
    enableCellTextSelection: void 0,
    enableRangeSelection: void 0,
    enableRangeHandle: void 0,
    enableFillHandle: void 0,
    fillHandleDirection: void 0,
    suppressClearOnFillReduction: void 0,
    sortingOrder: void 0,
    accentedSort: void 0,
    unSortIcon: void 0,
    suppressMultiSort: void 0,
    alwaysMultiSort: void 0,
    multiSortKey: void 0,
    suppressMaintainUnsortedOrder: void 0,
    icons: void 0,
    rowHeight: void 0,
    rowStyle: void 0,
    rowClass: void 0,
    rowClassRules: void 0,
    suppressRowHoverHighlight: void 0,
    suppressRowTransform: void 0,
    columnHoverHighlight: void 0,
    gridId: void 0,
    deltaSort: void 0,
    treeDataDisplayType: void 0,
    enableGroupEdit: void 0,
    initialState: void 0,
    theme: void 0,
    loadThemeGoogleFonts: void 0,
    themeCssLayer: void 0,
    styleNonce: void 0,
    themeStyleContainer: void 0,
    getContextMenuItems: void 0,
    getMainMenuItems: void 0,
    postProcessPopup: void 0,
    processUnpinnedColumns: void 0,
    processCellForClipboard: void 0,
    processHeaderForClipboard: void 0,
    processGroupHeaderForClipboard: void 0,
    processCellFromClipboard: void 0,
    sendToClipboard: void 0,
    processDataFromClipboard: void 0,
    isExternalFilterPresent: void 0,
    doesExternalFilterPass: void 0,
    getChartToolbarItems: void 0,
    createChartContainer: void 0,
    focusGridInnerElement: void 0,
    navigateToNextHeader: void 0,
    tabToNextHeader: void 0,
    navigateToNextCell: void 0,
    tabToNextCell: void 0,
    getLocaleText: void 0,
    getDocument: void 0,
    paginationNumberFormatter: void 0,
    getGroupRowAgg: void 0,
    isGroupOpenByDefault: void 0,
    initialGroupOrderComparator: void 0,
    processPivotResultColDef: void 0,
    processPivotResultColGroupDef: void 0,
    getDataPath: void 0,
    getChildCount: void 0,
    getServerSideGroupLevelParams: void 0,
    isServerSideGroupOpenByDefault: void 0,
    isApplyServerSideTransaction: void 0,
    isServerSideGroup: void 0,
    getServerSideGroupKey: void 0,
    getBusinessKeyForNode: void 0,
    getRowId: void 0,
    resetRowDataOnUpdate: void 0,
    processRowPostCreate: void 0,
    isRowSelectable: void 0,
    isRowMaster: void 0,
    fillOperation: void 0,
    postSortRows: void 0,
    getRowStyle: void 0,
    getRowClass: void 0,
    getRowHeight: void 0,
    isFullWidthRow: void 0,
    isRowValidDropPosition: void 0,
    // @END_DEFAULTS@
    // @START_EVENT_PROPS@
    "onColumn-everything-changed": void 0,
    "onNew-columns-loaded": void 0,
    "onColumn-pivot-mode-changed": void 0,
    "onPivot-max-columns-exceeded": void 0,
    "onColumn-row-group-changed": void 0,
    "onExpand-or-collapse-all": void 0,
    "onColumn-pivot-changed": void 0,
    "onGrid-columns-changed": void 0,
    "onColumn-value-changed": void 0,
    "onColumn-moved": void 0,
    "onColumn-visible": void 0,
    "onColumn-pinned": void 0,
    "onColumn-group-opened": void 0,
    "onColumn-resized": void 0,
    "onDisplayed-columns-changed": void 0,
    "onVirtual-columns-changed": void 0,
    "onColumn-header-mouse-over": void 0,
    "onColumn-header-mouse-leave": void 0,
    "onColumn-header-clicked": void 0,
    "onColumn-header-context-menu": void 0,
    "onAsync-transactions-flushed": void 0,
    "onRow-group-opened": void 0,
    "onRow-data-updated": void 0,
    "onPinned-row-data-changed": void 0,
    "onPinned-rows-changed": void 0,
    "onRange-selection-changed": void 0,
    "onCell-selection-changed": void 0,
    "onChart-created": void 0,
    "onChart-range-selection-changed": void 0,
    "onChart-options-changed": void 0,
    "onChart-destroyed": void 0,
    "onTool-panel-visible-changed": void 0,
    "onTool-panel-size-changed": void 0,
    "onModel-updated": void 0,
    "onCut-start": void 0,
    "onCut-end": void 0,
    "onPaste-start": void 0,
    "onPaste-end": void 0,
    "onFill-start": void 0,
    "onFill-end": void 0,
    "onCell-selection-delete-start": void 0,
    "onCell-selection-delete-end": void 0,
    "onRange-delete-start": void 0,
    "onRange-delete-end": void 0,
    "onUndo-started": void 0,
    "onUndo-ended": void 0,
    "onRedo-started": void 0,
    "onRedo-ended": void 0,
    "onCell-clicked": void 0,
    "onCell-double-clicked": void 0,
    "onCell-mouse-down": void 0,
    "onCell-context-menu": void 0,
    "onCell-value-changed": void 0,
    "onCell-edit-request": void 0,
    "onRow-value-changed": void 0,
    "onHeader-focused": void 0,
    "onCell-focused": void 0,
    "onRow-selected": void 0,
    "onSelection-changed": void 0,
    "onTooltip-show": void 0,
    "onTooltip-hide": void 0,
    "onCell-key-down": void 0,
    "onCell-mouse-over": void 0,
    "onCell-mouse-out": void 0,
    "onFilter-changed": void 0,
    "onFilter-modified": void 0,
    "onFilter-ui-changed": void 0,
    "onFilter-opened": void 0,
    "onFloating-filter-ui-changed": void 0,
    "onAdvanced-filter-builder-visible-changed": void 0,
    "onSort-changed": void 0,
    "onVirtual-row-removed": void 0,
    "onRow-clicked": void 0,
    "onRow-double-clicked": void 0,
    "onGrid-ready": void 0,
    "onGrid-pre-destroyed": void 0,
    "onGrid-size-changed": void 0,
    "onViewport-changed": void 0,
    "onFirst-data-rendered": void 0,
    "onDrag-started": void 0,
    "onDrag-stopped": void 0,
    "onDrag-cancelled": void 0,
    "onRow-editing-started": void 0,
    "onRow-editing-stopped": void 0,
    "onCell-editing-started": void 0,
    "onCell-editing-stopped": void 0,
    "onBody-scroll": void 0,
    "onBody-scroll-end": void 0,
    "onPagination-changed": void 0,
    "onComponent-state-changed": void 0,
    "onStore-refreshed": void 0,
    "onState-updated": void 0,
    "onColumn-menu-visible-changed": void 0,
    "onContext-menu-visible-changed": void 0,
    "onRow-drag-enter": void 0,
    "onRow-drag-move": void 0,
    "onRow-drag-leave": void 0,
    "onRow-drag-end": void 0,
    "onRow-drag-cancel": void 0,
    "onFind-changed": void 0,
    "onRow-resize-started": void 0,
    "onRow-resize-ended": void 0,
    "onColumns-reset": void 0,
    "onBulk-editing-started": void 0,
    "onBulk-editing-stopped": void 0,
    "onBatch-editing-started": void 0,
    "onBatch-editing-stopped": void 0
    // @END_EVENT_PROPS@
  };
}
const Ce = (r, d) => {
  let e;
  return () => {
    const n = function() {
      r();
    };
    window.clearTimeout(e), e = window.setTimeout(n, d);
  };
};
function me(r) {
  return r && r.constructor && r.constructor.toString().substring(0, 5) === "class";
}
function R(r) {
  const d = (e) => me(e) ? x(e) : Array.isArray(e) ? e.map((n) => d(n)) : _(e) || j(e) || q(e) ? d(x(e)) : e;
  return d(r);
}
const he = { ref: "root" }, Be = /* @__PURE__ */ k({
  __name: "AgGridVue",
  props: /* @__PURE__ */ O(/* @__PURE__ */ $({
    gridOptions: {},
    modules: {},
    statusBar: {},
    sideBar: { type: [Object, String, Array, Boolean, null] },
    suppressContextMenu: { type: Boolean },
    preventDefaultOnContextMenu: { type: Boolean },
    allowContextMenuWithControlKey: { type: Boolean },
    columnMenu: {},
    suppressMenuHide: { type: Boolean },
    enableBrowserTooltips: { type: Boolean },
    tooltipTrigger: {},
    tooltipShowDelay: {},
    tooltipHideDelay: {},
    tooltipMouseTrack: { type: Boolean },
    tooltipShowMode: {},
    tooltipInteraction: { type: Boolean },
    popupParent: {},
    copyHeadersToClipboard: { type: Boolean },
    copyGroupHeadersToClipboard: { type: Boolean },
    clipboardDelimiter: {},
    suppressCopyRowsToClipboard: { type: Boolean },
    suppressCopySingleCellRanges: { type: Boolean },
    suppressLastEmptyLineOnPaste: { type: Boolean },
    suppressClipboardPaste: { type: Boolean },
    suppressClipboardApi: { type: Boolean },
    suppressCutToClipboard: { type: Boolean },
    columnDefs: {},
    defaultColDef: {},
    defaultColGroupDef: {},
    columnTypes: {},
    dataTypeDefinitions: {},
    maintainColumnOrder: { type: Boolean },
    enableStrictPivotColumnOrder: { type: Boolean },
    suppressFieldDotNotation: { type: Boolean },
    headerHeight: {},
    groupHeaderHeight: {},
    floatingFiltersHeight: {},
    pivotHeaderHeight: {},
    pivotGroupHeaderHeight: {},
    hidePaddedHeaderRows: { type: Boolean },
    allowDragFromColumnsToolPanel: { type: Boolean },
    suppressMovableColumns: { type: Boolean },
    suppressColumnMoveAnimation: { type: Boolean },
    suppressMoveWhenColumnDragging: { type: Boolean },
    suppressDragLeaveHidesColumns: { type: Boolean },
    suppressGroupChangesColumnVisibility: { type: [Boolean, String] },
    suppressMakeColumnVisibleAfterUnGroup: { type: Boolean },
    suppressRowGroupHidesColumns: { type: Boolean },
    colResizeDefault: {},
    suppressAutoSize: { type: Boolean },
    autoSizePadding: {},
    skipHeaderOnAutoSize: { type: Boolean },
    autoSizeStrategy: {},
    components: {},
    editType: {},
    suppressStartEditOnTab: { type: Boolean },
    getFullRowEditValidationErrors: { type: Function },
    invalidEditValueMode: {},
    singleClickEdit: { type: Boolean },
    suppressClickEdit: { type: Boolean },
    readOnlyEdit: { type: Boolean },
    stopEditingWhenCellsLoseFocus: { type: Boolean },
    enterNavigatesVertically: { type: Boolean },
    enterNavigatesVerticallyAfterEdit: { type: Boolean },
    enableCellEditingOnBackspace: { type: Boolean },
    undoRedoCellEditing: { type: Boolean },
    undoRedoCellEditingLimit: {},
    defaultCsvExportParams: {},
    suppressCsvExport: { type: Boolean },
    defaultExcelExportParams: {},
    suppressExcelExport: { type: Boolean },
    excelStyles: {},
    findSearchValue: {},
    findOptions: {},
    quickFilterText: {},
    cacheQuickFilter: { type: Boolean },
    includeHiddenColumnsInQuickFilter: { type: Boolean },
    quickFilterParser: { type: Function },
    quickFilterMatcher: { type: Function },
    applyQuickFilterBeforePivotOrAgg: { type: Boolean },
    excludeChildrenWhenTreeDataFiltering: { type: Boolean },
    enableAdvancedFilter: { type: Boolean },
    alwaysPassFilter: { type: Function },
    includeHiddenColumnsInAdvancedFilter: { type: Boolean },
    advancedFilterParent: {},
    advancedFilterBuilderParams: {},
    advancedFilterParams: {},
    suppressAdvancedFilterEval: { type: Boolean },
    suppressSetFilterByDefault: { type: Boolean },
    enableFilterHandlers: { type: Boolean },
    filterHandlers: {},
    enableCharts: { type: Boolean },
    chartThemes: {},
    customChartThemes: {},
    chartThemeOverrides: {},
    chartToolPanelsDef: {},
    chartMenuItems: { type: [Array, Function] },
    loadingCellRenderer: {},
    loadingCellRendererParams: {},
    loadingCellRendererSelector: { type: Function },
    localeText: {},
    masterDetail: { type: Boolean },
    keepDetailRows: { type: Boolean },
    keepDetailRowsCount: {},
    detailCellRenderer: {},
    detailCellRendererParams: {},
    detailRowHeight: {},
    detailRowAutoHeight: { type: Boolean },
    context: {},
    alignedGrids: { type: [Array, Function] },
    tabIndex: {},
    rowBuffer: {},
    valueCache: { type: Boolean },
    valueCacheNeverExpires: { type: Boolean },
    enableCellExpressions: { type: Boolean },
    suppressTouch: { type: Boolean },
    suppressFocusAfterRefresh: { type: Boolean },
    suppressBrowserResizeObserver: { type: Boolean },
    suppressPropertyNamesCheck: { type: Boolean },
    suppressChangeDetection: { type: Boolean },
    debug: { type: Boolean },
    loading: { type: Boolean },
    overlayLoadingTemplate: {},
    loadingOverlayComponent: {},
    loadingOverlayComponentParams: {},
    suppressLoadingOverlay: { type: Boolean },
    overlayNoRowsTemplate: {},
    noRowsOverlayComponent: {},
    noRowsOverlayComponentParams: {},
    suppressNoRowsOverlay: { type: Boolean },
    pagination: { type: Boolean },
    paginationPageSize: {},
    paginationPageSizeSelector: { type: [Array, Boolean] },
    paginationAutoPageSize: { type: Boolean },
    paginateChildRows: { type: Boolean },
    suppressPaginationPanel: { type: Boolean },
    pivotMode: { type: Boolean },
    pivotPanelShow: {},
    pivotMaxGeneratedColumns: {},
    pivotDefaultExpanded: {},
    pivotColumnGroupTotals: {},
    pivotRowTotals: {},
    pivotSuppressAutoColumn: { type: Boolean },
    suppressExpandablePivotGroups: { type: Boolean },
    functionsReadOnly: { type: Boolean },
    aggFuncs: {},
    suppressAggFuncInHeader: { type: Boolean },
    alwaysAggregateAtRootLevel: { type: Boolean },
    aggregateOnlyChangedColumns: { type: Boolean },
    suppressAggFilteredOnly: { type: Boolean },
    removePivotHeaderRowWhenSingleValueColumn: { type: Boolean },
    animateRows: { type: Boolean },
    cellFlashDuration: {},
    cellFadeDuration: {},
    allowShowChangeAfterFilter: { type: Boolean },
    domLayout: {},
    ensureDomOrder: { type: Boolean },
    enableCellSpan: { type: Boolean },
    enableRtl: { type: Boolean },
    suppressColumnVirtualisation: { type: Boolean },
    suppressMaxRenderedRowRestriction: { type: Boolean },
    suppressRowVirtualisation: { type: Boolean },
    rowDragManaged: { type: Boolean },
    rowDragInsertDelay: {},
    suppressRowDrag: { type: Boolean },
    suppressMoveWhenRowDragging: { type: Boolean },
    rowDragEntireRow: { type: Boolean },
    rowDragMultiRow: { type: Boolean },
    rowDragText: { type: Function },
    dragAndDropImageComponent: {},
    dragAndDropImageComponentParams: {},
    fullWidthCellRenderer: {},
    fullWidthCellRendererParams: {},
    embedFullWidthRows: { type: Boolean },
    groupDisplayType: {},
    groupDefaultExpanded: {},
    autoGroupColumnDef: {},
    groupMaintainOrder: { type: Boolean },
    groupSelectsChildren: { type: Boolean },
    groupLockGroupColumns: {},
    groupAggFiltering: { type: [Boolean, Function] },
    groupTotalRow: { type: [String, Function] },
    grandTotalRow: {},
    suppressStickyTotalRow: { type: [Boolean, String] },
    groupSuppressBlankHeader: { type: Boolean },
    groupSelectsFiltered: { type: Boolean },
    showOpenedGroup: { type: Boolean },
    groupHideParentOfSingleChild: { type: [Boolean, String] },
    groupRemoveSingleChildren: { type: Boolean },
    groupRemoveLowestSingleChildren: { type: Boolean },
    groupHideOpenParents: { type: Boolean },
    groupAllowUnbalanced: { type: Boolean },
    rowGroupPanelShow: {},
    groupRowRenderer: {},
    groupRowRendererParams: {},
    treeData: { type: Boolean },
    treeDataChildrenField: {},
    treeDataParentIdField: {},
    rowGroupPanelSuppressSort: { type: Boolean },
    suppressGroupRowsSticky: { type: Boolean },
    pinnedTopRowData: {},
    pinnedBottomRowData: {},
    enableRowPinning: { type: [Boolean, String] },
    isRowPinnable: { type: Function },
    isRowPinned: { type: Function },
    rowModelType: {},
    rowData: {},
    asyncTransactionWaitMillis: {},
    suppressModelUpdateAfterUpdateTransaction: { type: Boolean },
    datasource: {},
    cacheOverflowSize: {},
    infiniteInitialRowCount: {},
    serverSideInitialRowCount: {},
    suppressServerSideFullWidthLoadingRow: { type: Boolean },
    cacheBlockSize: {},
    maxBlocksInCache: {},
    maxConcurrentDatasourceRequests: {},
    blockLoadDebounceMillis: {},
    purgeClosedRowNodes: { type: Boolean },
    serverSideDatasource: {},
    serverSideSortAllLevels: { type: Boolean },
    serverSideEnableClientSideSort: { type: Boolean },
    serverSideOnlyRefreshFilteredGroups: { type: Boolean },
    serverSidePivotResultFieldSeparator: {},
    viewportDatasource: {},
    viewportRowModelPageSize: {},
    viewportRowModelBufferSize: {},
    alwaysShowHorizontalScroll: { type: Boolean },
    alwaysShowVerticalScroll: { type: Boolean },
    debounceVerticalScrollbar: { type: Boolean },
    suppressHorizontalScroll: { type: Boolean },
    suppressScrollOnNewData: { type: Boolean },
    suppressScrollWhenPopupsAreOpen: { type: Boolean },
    suppressAnimationFrame: { type: Boolean },
    suppressMiddleClickScrolls: { type: Boolean },
    suppressPreventDefaultOnMouseWheel: { type: Boolean },
    scrollbarWidth: {},
    rowSelection: {},
    cellSelection: { type: [Boolean, Object] },
    rowMultiSelectWithClick: { type: Boolean },
    suppressRowDeselection: { type: Boolean },
    suppressRowClickSelection: { type: Boolean },
    suppressCellFocus: { type: Boolean },
    suppressHeaderFocus: { type: Boolean },
    selectionColumnDef: {},
    rowNumbers: { type: [Boolean, Object] },
    suppressMultiRangeSelection: { type: Boolean },
    enableCellTextSelection: { type: Boolean },
    enableRangeSelection: { type: Boolean },
    enableRangeHandle: { type: Boolean },
    enableFillHandle: { type: Boolean },
    fillHandleDirection: {},
    suppressClearOnFillReduction: { type: Boolean },
    sortingOrder: {},
    accentedSort: { type: Boolean },
    unSortIcon: { type: Boolean },
    suppressMultiSort: { type: Boolean },
    alwaysMultiSort: { type: Boolean },
    multiSortKey: {},
    suppressMaintainUnsortedOrder: { type: Boolean },
    icons: {},
    rowHeight: {},
    rowStyle: {},
    rowClass: {},
    rowClassRules: {},
    suppressRowHoverHighlight: { type: Boolean },
    suppressRowTransform: { type: Boolean },
    columnHoverHighlight: { type: Boolean },
    gridId: {},
    deltaSort: { type: Boolean },
    treeDataDisplayType: {},
    enableGroupEdit: { type: Boolean },
    initialState: {},
    theme: {},
    loadThemeGoogleFonts: { type: Boolean },
    themeCssLayer: {},
    styleNonce: {},
    themeStyleContainer: {},
    getContextMenuItems: { type: Function },
    getMainMenuItems: { type: Function },
    postProcessPopup: { type: Function },
    processUnpinnedColumns: { type: Function },
    processCellForClipboard: { type: Function },
    processHeaderForClipboard: { type: Function },
    processGroupHeaderForClipboard: { type: Function },
    processCellFromClipboard: { type: Function },
    sendToClipboard: { type: Function },
    processDataFromClipboard: { type: Function },
    isExternalFilterPresent: { type: Function },
    doesExternalFilterPass: { type: Function },
    getChartToolbarItems: { type: Function },
    createChartContainer: { type: Function },
    focusGridInnerElement: { type: Function },
    navigateToNextHeader: { type: Function },
    tabToNextHeader: { type: Function },
    navigateToNextCell: { type: Function },
    tabToNextCell: { type: Function },
    getLocaleText: { type: Function },
    getDocument: { type: Function },
    paginationNumberFormatter: { type: Function },
    getGroupRowAgg: { type: Function },
    isGroupOpenByDefault: { type: Function },
    initialGroupOrderComparator: { type: Function },
    processPivotResultColDef: { type: Function },
    processPivotResultColGroupDef: { type: Function },
    getDataPath: { type: Function },
    getChildCount: { type: Function },
    getServerSideGroupLevelParams: { type: Function },
    isServerSideGroupOpenByDefault: { type: Function },
    isApplyServerSideTransaction: { type: Function },
    isServerSideGroup: { type: Function },
    getServerSideGroupKey: { type: Function },
    getBusinessKeyForNode: { type: Function },
    getRowId: { type: Function },
    resetRowDataOnUpdate: { type: Boolean },
    processRowPostCreate: { type: Function },
    isRowSelectable: { type: Function },
    isRowMaster: { type: Function },
    fillOperation: { type: Function },
    postSortRows: { type: Function },
    getRowStyle: { type: Function },
    getRowClass: { type: Function },
    getRowHeight: { type: Function },
    isFullWidthRow: { type: Function },
    isRowValidDropPosition: {},
    "onTool-panel-visible-changed": {},
    "onTool-panel-size-changed": {},
    "onColumn-menu-visible-changed": {},
    "onContext-menu-visible-changed": {},
    "onCut-start": {},
    "onCut-end": {},
    "onPaste-start": {},
    "onPaste-end": {},
    "onColumn-visible": {},
    "onColumn-pinned": {},
    "onColumn-resized": {},
    "onColumn-moved": {},
    "onColumn-value-changed": {},
    "onColumn-pivot-mode-changed": {},
    "onColumn-pivot-changed": {},
    "onColumn-group-opened": {},
    "onNew-columns-loaded": {},
    "onGrid-columns-changed": {},
    "onDisplayed-columns-changed": {},
    "onVirtual-columns-changed": {},
    "onColumn-everything-changed": {},
    "onColumns-reset": {},
    "onColumn-header-mouse-over": {},
    "onColumn-header-mouse-leave": {},
    "onColumn-header-clicked": {},
    "onColumn-header-context-menu": {},
    "onComponent-state-changed": {},
    "onCell-value-changed": {},
    "onCell-edit-request": {},
    "onRow-value-changed": {},
    "onCell-editing-started": {},
    "onCell-editing-stopped": {},
    "onRow-editing-started": {},
    "onRow-editing-stopped": {},
    "onBulk-editing-started": {},
    "onBulk-editing-stopped": {},
    "onBatch-editing-started": {},
    "onBatch-editing-stopped": {},
    "onUndo-started": {},
    "onUndo-ended": {},
    "onRedo-started": {},
    "onRedo-ended": {},
    "onCell-selection-delete-start": {},
    "onCell-selection-delete-end": {},
    "onRange-delete-start": {},
    "onRange-delete-end": {},
    "onFill-start": {},
    "onFill-end": {},
    "onFilter-opened": {},
    "onFilter-changed": {},
    "onFilter-modified": {},
    "onFilter-ui-changed": {},
    "onFloating-filter-ui-changed": {},
    "onAdvanced-filter-builder-visible-changed": {},
    "onFind-changed": {},
    "onChart-created": {},
    "onChart-range-selection-changed": {},
    "onChart-options-changed": {},
    "onChart-destroyed": {},
    "onCell-key-down": {},
    "onGrid-ready": {},
    "onGrid-pre-destroyed": {},
    "onFirst-data-rendered": {},
    "onGrid-size-changed": {},
    "onModel-updated": {},
    "onVirtual-row-removed": {},
    "onViewport-changed": {},
    "onBody-scroll": {},
    "onBody-scroll-end": {},
    "onDrag-started": {},
    "onDrag-stopped": {},
    "onDrag-cancelled": {},
    "onState-updated": {},
    "onPagination-changed": {},
    "onRow-drag-enter": {},
    "onRow-drag-move": {},
    "onRow-drag-leave": {},
    "onRow-drag-end": {},
    "onRow-drag-cancel": {},
    "onRow-resize-started": {},
    "onRow-resize-ended": {},
    "onColumn-row-group-changed": {},
    "onRow-group-opened": {},
    "onExpand-or-collapse-all": {},
    "onPivot-max-columns-exceeded": {},
    "onPinned-row-data-changed": {},
    "onPinned-rows-changed": {},
    "onRow-data-updated": {},
    "onAsync-transactions-flushed": {},
    "onStore-refreshed": {},
    "onHeader-focused": {},
    "onCell-clicked": {},
    "onCell-double-clicked": {},
    "onCell-focused": {},
    "onCell-mouse-over": {},
    "onCell-mouse-out": {},
    "onCell-mouse-down": {},
    "onRow-clicked": {},
    "onRow-double-clicked": {},
    "onRow-selected": {},
    "onSelection-changed": {},
    "onCell-context-menu": {},
    "onRange-selection-changed": {},
    "onCell-selection-changed": {},
    "onTooltip-show": {},
    "onTooltip-hide": {},
    "onSort-changed": {}
  }, ye()), {
    modelValue: {},
    modelModifiers: {}
  }),
  emits: /* @__PURE__ */ O(["update:modelValue"], ["update:modelValue"]),
  setup(r, { expose: d, emit: e }) {
    const n = r, s = K("root"), t = g(void 0), l = g(!1), o = g(!1), i = g(!1), p = g({}), c = g(null), B = Q(n);
    A().filter((a) => a != "gridOptions").forEach((a) => {
      M(
        () => B[a],
        (u, f) => {
          (a === "rowData" && !w.value || a !== "rowData") && P(a, u), w.value = !1;
        },
        { deep: !0 }
      );
    });
    const h = /* @__PURE__ */ new Set(["rowDataUpdated", "cellValueChanged", "rowValueChanged"]), m = Y(r, "modelValue"), F = g(!1), w = g(!1), E = e;
    M(
      m,
      (a, u) => {
        l.value && (w.value || (F.value = !0, P("rowData", R(a), R(u))), w.value = !1);
      },
      { deep: !0 }
    );
    const G = Ce(() => {
      w.value = !0, E("update:modelValue", L());
    }, 10), D = S(), I = (a) => {
      var u, f;
      i.value && h.has(a) && (f = (u = D == null ? void 0 : D.vnode) == null ? void 0 : u.props) != null && f["onUpdate:modelValue"] && G();
    }, V = () => m.value || n.rowData || n.gridOptions.rowData, L = () => {
      const a = [];
      return t == null || t.value.forEachLeafNode((u) => {
        a.push(u.data);
      }), a;
    }, b = (a) => (u) => {
      if (o.value)
        return;
      u === "gridReady" && (i.value = !0);
      const f = pe.has(u);
      f && !a || !f && a || h.has(u) && (F.value || I(u), F.value = !1);
    }, P = (a, u, f) => {
      if (l.value) {
        let y = u.value || u;
        a === "rowData" && y != null && (y = R(y)), p.value[a] = y, c.value == null && (c.value = window.setTimeout(() => {
          c.value = null, ie(p.value, t.value), p.value = {};
        }, 0));
      }
    }, z = () => Object.create(S().provides);
    return J(() => {
      ae(re, void 0, !0);
      const a = new fe(S(), z()), u = {
        globalListener: b(),
        globalSyncListener: b(!0),
        frameworkOverrides: new ge(S()),
        providedBeanInstances: {
          frameworkCompWrapper: a
        },
        modules: n.modules
      }, f = X(
        le(R(n.gridOptions), n, [
          ...A(),
          // we could have replaced it with GRID_OPTIONS_VALIDATORS().allProperties,
          // but that prevents tree shaking of validation code in Vue
          ...Object.values(ue)
        ])
      ), y = V();
      y !== void 0 && (f.rowData = R(y)), t.value = se(s.value, f, u), l.value = !0;
    }), Z(() => {
      var a;
      l.value && ((a = t == null ? void 0 : t.value) == null || a.destroy(), o.value = !0);
    }), d({
      api: t
    }), (a, u) => (ee(), ne("div", he, null, 512));
  }
});
export {
  Be as AgGridVue
};
