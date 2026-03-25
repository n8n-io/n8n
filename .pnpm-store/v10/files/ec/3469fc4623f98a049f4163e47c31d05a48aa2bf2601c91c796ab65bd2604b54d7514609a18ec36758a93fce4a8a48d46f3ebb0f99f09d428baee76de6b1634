import { BeanStub } from '../context/beanStub';
import type { BeanCollection } from '../context/context';
import type { AgColumn } from '../entities/agColumn';
import type { AgColumnGroup } from '../entities/agColumnGroup';
import type { ColDef, ColGroupDef } from '../entities/colDef';
import type { RowNode } from '../entities/rowNode';
import type { GridOptionsService } from '../gridOptionsService';
import type { TooltipLocation } from './tooltipComponent';
export interface ITooltipCtrl {
    getTooltipValue?(): any;
    getGui(): HTMLElement;
    getLocation?(): TooltipLocation;
    getColumn?(): AgColumn | AgColumnGroup;
    getColDef?(): ColDef | ColGroupDef;
    getRowIndex?(): number;
    getRowNode?(): RowNode;
    getValueFormatted?(): string;
    getTooltipShowDelayOverride?(): number;
    getTooltipHideDelayOverride?(): number;
    shouldDisplayTooltip?(): boolean;
    /** Additional params to be passed to the tooltip */
    getAdditionalParams?(): Record<string, any>;
}
export declare function _isShowTooltipWhenTruncated(gos: GridOptionsService): boolean;
export declare function _getShouldDisplayTooltip(gos: GridOptionsService, getElement: () => HTMLElement | undefined): (() => boolean) | undefined;
export declare class TooltipFeature extends BeanStub {
    private readonly ctrl;
    private tooltip;
    private tooltipManager;
    private browserTooltips;
    constructor(ctrl: ITooltipCtrl, beans?: BeanCollection);
    postConstruct(): void;
    /**
     *
     * @param tooltip The tooltip value
     * @param allowEmptyString Set it to true to allow the title to be set to `''`. This is necessary
     * when the browser adds a default tooltip the element and the tooltip service will be displayed
     * next to a browser tooltip causing confusion.
     */
    private setBrowserTooltip;
    private updateTooltipText;
    private createTooltipFeatureIfNeeded;
    setTooltipAndRefresh(tooltip: any): void;
    refreshTooltip(clearWithEmptyString?: boolean): void;
    destroy(): void;
}
