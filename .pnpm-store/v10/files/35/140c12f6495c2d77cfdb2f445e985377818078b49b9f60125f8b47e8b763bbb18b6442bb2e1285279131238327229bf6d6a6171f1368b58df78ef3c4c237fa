import type { AgPromise } from '../../agStack/utils/promise';
import type { GridOptions } from '../../entities/gridOptions';
import type { LayoutView, UpdateLayoutClassesParams } from '../../styling/layoutFeature';
import type { ComponentSelector } from '../../widgets/component';
import { Component } from '../../widgets/component';
import type { IOverlayComp } from './overlayComponent';
export declare class OverlayWrapperComponent extends Component implements LayoutView {
    private readonly eOverlayWrapper;
    private activePromise;
    private activeOverlay;
    private updateListenerDestroyFunc;
    private activeCssClass;
    private elToFocusAfter;
    constructor();
    private handleKeyDown;
    updateLayoutClasses(cssClass: string, params: UpdateLayoutClassesParams): void;
    postConstruct(): void;
    private setWrapperTypeClass;
    showOverlay(overlayComponentPromise: AgPromise<IOverlayComp> | null, overlayWrapperCssClass: string, exclusive: boolean, gridOption?: keyof GridOptions): void;
    updateOverlayWrapperPaddingTop(padding: number): void;
    private destroyActiveOverlay;
    hideOverlay(): void;
    private isGridFocused;
    destroy(): void;
}
export declare const OverlayWrapperSelector: ComponentSelector;
