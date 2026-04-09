import type { IComponent } from '../../agStack/interfaces/iComponent';
import type { IDragAndDropImageComponent, IDragAndDropImageParams } from '../../dragAndDrop/dragAndDropImageComponent';
import type { ColDef } from '../../entities/colDef';
import type { IFloatingFilterComp, IFloatingFilterParams } from '../../filter/floating/floatingFilter';
import type { IHeaderGroupComp, IHeaderGroupParams, IInnerHeaderGroupComponent } from '../../headerRendering/cells/columnGroup/headerGroupComp';
import type { IDateComp, IDateParams } from '../../interfaces/dateComponent';
import type { ICellEditorComp, ICellEditorParams } from '../../interfaces/iCellEditor';
import type { AgGridCommon } from '../../interfaces/iCommon';
import type { IFilterComp, IFilterDef, IFilterParams, SharedFilterParams, SharedFilterUi } from '../../interfaces/iFilter';
import type { IFrameworkOverrides } from '../../interfaces/iFrameworkOverrides';
import type { IHeaderComp, IHeaderParams, IInnerHeaderComponent } from '../../interfaces/iHeader';
import type { ILoadingCellRendererComp } from '../../interfaces/iLoadingCellRenderer';
import type { UserCompDetails } from '../../interfaces/iUserCompDetails';
import type { ICellRendererComp, ICellRendererParams } from '../../rendering/cellRenderers/iCellRenderer';
import type { ILoadingOverlayComp, ILoadingOverlayParams } from '../../rendering/overlays/loadingOverlayComponent';
import type { INoRowsOverlayComp, INoRowsOverlayParams } from '../../rendering/overlays/noRowsOverlayComponent';
import type { ITooltipComp, ITooltipParams } from '../../tooltip/tooltipComponent';
import type { UserComponentFactory } from './userComponentFactory';
export declare function _getDragAndDropImageCompDetails(userCompFactory: UserComponentFactory, params: IDragAndDropImageParams): UserCompDetails<IDragAndDropImageComponent> | undefined;
export declare function _getInnerCellRendererDetails<TDefinition = any>(userCompFactory: UserComponentFactory, def: TDefinition, params: ICellRendererParams): UserCompDetails<ICellRendererComp> | undefined;
export declare function _getHeaderCompDetails(userCompFactory: UserComponentFactory, colDef: ColDef, params: IHeaderParams): UserCompDetails<IHeaderComp> | undefined;
export declare function _getInnerHeaderCompDetails(userCompFactory: UserComponentFactory, headerCompParams: IHeaderParams, params: IHeaderParams): UserCompDetails<IInnerHeaderComponent> | undefined;
export declare function _getHeaderGroupCompDetails(userCompFactory: UserComponentFactory, params: IHeaderGroupParams): UserCompDetails<IHeaderGroupComp> | undefined;
export declare function _getInnerHeaderGroupCompDetails(userCompFactory: UserComponentFactory, headerGroupCompParams: IHeaderGroupParams, params: IHeaderGroupParams): UserCompDetails<IInnerHeaderGroupComponent> | undefined;
export declare function _getFullWidthCellRendererDetails(userCompFactory: UserComponentFactory, params: ICellRendererParams): UserCompDetails<ICellRendererComp> | undefined;
export declare function _getFullWidthLoadingCellRendererDetails(userCompFactory: UserComponentFactory, params: ICellRendererParams): UserCompDetails<ILoadingCellRendererComp> | undefined;
export declare function _getFullWidthGroupCellRendererDetails(userCompFactory: UserComponentFactory, params: ICellRendererParams): UserCompDetails<ICellRendererComp> | undefined;
export declare function _getFullWidthDetailCellRendererDetails(userCompFactory: UserComponentFactory, params: ICellRendererParams): UserCompDetails<ICellRendererComp> | undefined;
export declare function _getCellRendererDetails<TDefinition = ColDef, TParams extends AgGridCommon<any, any> = ICellRendererParams>(userCompFactory: UserComponentFactory, def: TDefinition, params: TParams): UserCompDetails<ICellRendererComp> | undefined;
export declare function _getEditorRendererDetails<TDefinition, TEditorParams extends AgGridCommon<any, any>>(userCompFactory: UserComponentFactory, def: TDefinition, params: TEditorParams): UserCompDetails | undefined;
export declare function _getLoadingCellRendererDetails(userCompFactory: UserComponentFactory, def: ColDef, params: ICellRendererParams): UserCompDetails<ILoadingCellRendererComp> | undefined;
export declare function _getCellEditorDetails(userCompFactory: UserComponentFactory, def: ColDef, params: ICellEditorParams): UserCompDetails<ICellEditorComp> | undefined;
/**
 * @param defaultFilter provided filters only
 */
export declare function _getFilterDetails<TFilter extends SharedFilterUi & IComponent<SharedFilterParams> = IFilterComp>(userCompFactory: UserComponentFactory, def: IFilterDef, params: SharedFilterParams, defaultFilter: string): UserCompDetails<TFilter> | undefined;
export declare function _getDateCompDetails(userCompFactory: UserComponentFactory, def: ColDef, params: IDateParams): UserCompDetails<IDateComp> | undefined;
export declare function _getLoadingOverlayCompDetails(userCompFactory: UserComponentFactory, params: ILoadingOverlayParams): UserCompDetails<ILoadingOverlayComp> | undefined;
export declare function _getNoRowsOverlayCompDetails(userCompFactory: UserComponentFactory, params: INoRowsOverlayParams): UserCompDetails<INoRowsOverlayComp> | undefined;
export declare function _getTooltipCompDetails(userCompFactory: UserComponentFactory, params: ITooltipParams): UserCompDetails<ITooltipComp> | undefined;
/**
 * @param defaultFloatingFilter provided floating filters only
 */
export declare function _getFloatingFilterCompDetails(userCompFactory: UserComponentFactory, def: IFilterDef, params: IFloatingFilterParams<any>, defaultFloatingFilter: string): UserCompDetails<IFloatingFilterComp> | undefined;
export declare function _getFilterCompKeys(frameworkOverrides: IFrameworkOverrides, def: IFilterDef): {
    compName?: string | undefined;
    jsComp: any;
    fwComp: any;
    paramsFromSelector: any;
    popupFromSelector?: boolean | undefined;
    popupPositionFromSelector?: "over" | "under" | undefined;
};
export declare function _mergeFilterParamsWithApplicationProvidedParams(userCompFactory: UserComponentFactory, defObject: IFilterDef, paramsFromGrid: IFilterParams): IFilterParams;
