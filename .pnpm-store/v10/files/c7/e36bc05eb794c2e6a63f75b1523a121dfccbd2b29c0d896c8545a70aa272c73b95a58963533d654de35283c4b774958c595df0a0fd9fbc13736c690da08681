import type { BasePopupPositionParams } from '../agStack/interfaces/iPopup';
import { BasePopupService } from '../agStack/popup/basePopupService';
import type { NamedBean } from '../context/bean';
import type { BeanCollection } from '../context/context';
import type { AgColumn } from '../entities/agColumn';
import type { AgEventTypeParams } from '../events';
import type { GridOptionsWithDefaults } from '../gridOptionsDefault';
import type { GridOptionsService } from '../gridOptionsService';
import type { AgGridCommon } from '../interfaces/iCommon';
import type { PopupPositionParams } from '../interfaces/iPopupPositionParams';
import type { IRowNode } from '../interfaces/iRowNode';
export declare class PopupService extends BasePopupService<BeanCollection, GridOptionsWithDefaults, AgEventTypeParams, AgGridCommon<any, any>, GridOptionsService, PopupPositionParams> implements NamedBean {
    private gridCtrl;
    postConstruct(): void;
    protected getDefaultPopupParent(): HTMLElement;
    positionPopupForMenu(params: {
        eventSource: HTMLElement;
        ePopup: HTMLElement;
        column: AgColumn | null;
        rowNode: IRowNode | null;
        event?: MouseEvent | KeyboardEvent;
    }): void;
    callPostProcessPopup(params: Omit<PopupPositionParams, keyof BasePopupPositionParams>, type: string, ePopup: HTMLElement, eventSource?: HTMLElement | null, mouseEvent?: MouseEvent | Touch | null): void;
    getActivePopups(): HTMLElement[];
    private handleThemeChange;
    hasAnchoredPopup(): boolean;
    protected isStopPropagation(event: Event): boolean;
}
