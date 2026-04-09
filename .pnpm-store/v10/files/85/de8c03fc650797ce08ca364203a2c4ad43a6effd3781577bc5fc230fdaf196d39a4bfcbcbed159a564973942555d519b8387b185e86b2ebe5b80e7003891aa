import type { IComponent } from '../agStack/interfaces/iComponent';
import { BaseTooltipStateManager } from '../agStack/tooltip/baseTooltipStateManager';
import type { BeanCollection } from '../context/context';
import type { AgEventTypeParams } from '../events';
import type { GridOptionsWithDefaults } from '../gridOptionsDefault';
import type { GridOptionsService } from '../gridOptionsService';
import type { AgGridCommon } from '../interfaces/iCommon';
import type { ITooltipParams, TooltipLocation } from './tooltipComponent';
import type { ITooltipCtrlParams } from './tooltipFeature';
export declare class TooltipStateManager extends BaseTooltipStateManager<BeanCollection, GridOptionsWithDefaults, AgEventTypeParams, AgGridCommon<any, any>, GridOptionsService, ITooltipParams, ITooltipCtrlParams, TooltipLocation> {
    private onColumnMovedEventCallback;
    protected createTooltipComp(params: ITooltipParams<any, any, any>, callback: (comp: IComponent<ITooltipParams<any, any, any>>) => void): void;
    protected setEventHandlers(listener: () => void): void;
    protected clearEventHandlers(): void;
}
