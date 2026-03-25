import type { AgColumn } from '../entities/agColumn';
import type { ComponentSelector } from '../widgets/component';
import { Component } from '../widgets/component';
export declare class SortIndicatorComp extends Component {
    private eSortOrder?;
    private eSortAsc?;
    private eSortDesc?;
    private eSortMixed?;
    private eSortNone?;
    private column;
    private suppressOrder;
    constructor(skipTemplate?: boolean);
    attachCustomElements(eSortOrder: HTMLElement | undefined, eSortAsc: HTMLElement | undefined, eSortDesc: HTMLElement | undefined, eSortMixed: HTMLElement | undefined, eSortNone: HTMLElement | undefined): void;
    setupSort(column: AgColumn, suppressOrder?: boolean): void;
    private addInIcon;
    private onSortChanged;
    private updateIcons;
    private setupMultiSortIndicator;
    private updateMultiSortIndicator;
    private updateSortOrder;
}
export declare const SortIndicatorSelector: ComponentSelector;
