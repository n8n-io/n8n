import type { TooltipCtrl } from '../agStack/interfaces/iTooltip';
import type { AgTooltipFeature } from '../agStack/tooltip/agTooltipFeature';
import type { BeanCollection } from '../context/context';
import type { AgColumn } from '../entities/agColumn';
import type { AgColumnGroup } from '../entities/agColumnGroup';
import type { ColDef, ColGroupDef } from '../entities/colDef';
import type { RowNode } from '../entities/rowNode';
import type { AgEventTypeParams } from '../events';
import type { GridOptionsWithDefaults } from '../gridOptionsDefault';
import type { GridOptionsService } from '../gridOptionsService';
import type { AgGridCommon } from '../interfaces/iCommon';
import type { ITooltipParams, TooltipLocation } from './tooltipComponent';
export interface ITooltipCtrlParams {
    column?: AgColumn | AgColumnGroup;
    colDef?: ColDef | ColGroupDef;
    rowIndex?: number;
    node?: RowNode;
    data?: any;
    valueFormatted?: string;
}
export interface ITooltipCtrl extends TooltipCtrl<TooltipLocation, ITooltipCtrlParams> {
}
export declare function _isShowTooltipWhenTruncated(gos: GridOptionsService): boolean;
export declare function _getShouldDisplayTooltip(gos: GridOptionsService, getElement: () => HTMLElement | undefined): (() => boolean) | undefined;
export type TooltipFeature = AgTooltipFeature<BeanCollection, GridOptionsWithDefaults, AgEventTypeParams, AgGridCommon<any, any>, GridOptionsService, ITooltipParams, ITooltipCtrlParams, TooltipLocation>;
