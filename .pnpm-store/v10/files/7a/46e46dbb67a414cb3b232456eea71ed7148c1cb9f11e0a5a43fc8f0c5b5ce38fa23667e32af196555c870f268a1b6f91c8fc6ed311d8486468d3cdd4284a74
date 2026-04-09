import type { IEventEmitter } from '../agStack/interfaces/iEventEmitter';
import type { AgColumn } from '../entities/agColumn';
import type { IAfterGuiAttachedParams } from '../interfaces/iAfterGuiAttachedParams';
import type { FilterAction } from '../interfaces/iFilter';
import { Component } from '../widgets/component';
import type { FilterDisplayWrapper } from './columnFilterService';
/** Used with filter handlers. This adds filter buttons. */
export declare class FilterWrapperComp extends Component {
    private readonly column;
    private readonly wrapper;
    private readonly eventParent;
    private readonly updateModel;
    private isGlobalButtons;
    private readonly enableGlobalButtonCheck?;
    private eButtons?;
    private params?;
    private hidePopup;
    private applyActive;
    constructor(column: AgColumn, wrapper: FilterDisplayWrapper, eventParent: IEventEmitter<'filterParamsChanged' | 'filterStateChanged' | 'filterAction' | 'filterGlobalButtons'>, updateModel: (column: AgColumn, action: FilterAction, additionalEventAttributes?: any) => void, isGlobalButtons: boolean, enableGlobalButtonCheck?: boolean | undefined);
    postConstruct(): void;
    afterGuiAttached(params?: IAfterGuiAttachedParams): void;
    private resetButtonsPanel;
    private close;
    private afterAction;
    private handleKeyDown;
    destroy(): void;
}
