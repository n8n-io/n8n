export interface ITooltipFeature {
    setTooltipAndRefresh(tooltip: any): void;
    refreshTooltip(clearWithEmptyString?: boolean): void;
    attemptToShowTooltip(): void;
    attemptToHideTooltip(): void;
    destroy(): void;
}
export interface TooltipCtrl<TLocation extends string, TParams> {
    getTooltipValue?(): any;
    getGui(): HTMLElement;
    getLocation?(): TLocation | 'UNKNOWN';
    getTooltipShowDelayOverride?(): number;
    getTooltipHideDelayOverride?(): number;
    shouldDisplayTooltip?(): boolean;
    /** Additional params to be passed to the tooltip */
    getAdditionalParams?(): TParams;
}
