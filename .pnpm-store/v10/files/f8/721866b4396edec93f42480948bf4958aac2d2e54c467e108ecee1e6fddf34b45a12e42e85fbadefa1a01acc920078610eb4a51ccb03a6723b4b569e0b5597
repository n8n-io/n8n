import type { NamedBean } from '../../context/bean';
import { BeanStub } from '../../context/beanStub';
import type { ComponentSelector } from '../../widgets/component';
import { OverlayWrapperComponent } from './overlayWrapperComponent';
export declare class OverlayService extends BeanStub implements NamedBean {
    beanName: "overlays";
    private isClientSide;
    private isServerSide;
    private state;
    private showInitialOverlay;
    private exclusive?;
    private wrapperPadding;
    eWrapper: OverlayWrapperComponent | undefined;
    postConstruct(): void;
    setOverlayWrapperComp(overlayWrapperComp: OverlayWrapperComponent | undefined): void;
    /** Returns true if the overlay is visible. */
    isVisible(): boolean;
    /** Returns true if the overlay is visible and is exclusive (popup over the grid) */
    isExclusive(): boolean;
    showLoadingOverlay(): void;
    showNoRowsOverlay(): void;
    hideOverlay(): void;
    getOverlayWrapperSelector(): ComponentSelector;
    getOverlayWrapperCompClass(): typeof OverlayWrapperComponent;
    private updateOverlayVisibility;
    private doShowLoadingOverlay;
    private doShowNoRowsOverlay;
    private doHideOverlay;
    private showOverlay;
    private updateExclusive;
    private refreshWrapperPadding;
}
