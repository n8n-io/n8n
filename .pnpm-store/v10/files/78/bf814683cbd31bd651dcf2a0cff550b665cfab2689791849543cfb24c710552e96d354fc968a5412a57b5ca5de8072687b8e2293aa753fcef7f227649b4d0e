import type { IHeaderComp, IHeaderParams } from '../../../interfaces/iHeader';
import { Component } from '../../../widgets/component';
export declare class HeaderComp extends Component implements IHeaderComp {
    private readonly eFilter?;
    eFilterButton?: HTMLElement;
    private eSortIndicator?;
    eMenu?: HTMLElement;
    private readonly eLabel?;
    private readonly eText?;
    /**
     * Selectors for custom headers templates, i.e when the ag-sort-indicator is not present.
     */
    private readonly eSortOrder?;
    private readonly eSortAsc?;
    private readonly eSortDesc?;
    private readonly eSortMixed?;
    private readonly eSortNone?;
    params: IHeaderParams;
    private currentDisplayName;
    private currentTemplate;
    private currentShowMenu;
    private currentSuppressMenuHide;
    private currentSort;
    private innerHeaderComponent;
    private isLoadingInnerComponent;
    refresh(params: IHeaderParams): boolean;
    private workOutTemplate;
    init(params: IHeaderParams): void;
    private workOutInnerHeaderComponent;
    private setDisplayName;
    private addInIcon;
    private workOutShowMenu;
    shouldSuppressMenuHide(): boolean;
    private setMenu;
    private toggleMenuAlwaysShow;
    private showColumnMenu;
    onMenuKeyboardShortcut(isFilterShortcut: boolean): boolean;
    private setupSort;
    private setupFilterIcon;
    private setupFilterButton;
    private configureFilter;
    private onFilterChangedButton;
    getAnchorElementForMenu(isFilter?: boolean): HTMLElement;
    destroy(): void;
}
