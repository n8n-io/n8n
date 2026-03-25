import type { ColumnGroup } from '../../../interfaces/iColumn';
import type { AgGridCommon } from '../../../interfaces/iCommon';
import type { IComponent } from '../../../interfaces/iComponent';
import { Component } from '../../../widgets/component';
export interface IHeaderGroupParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** The column group the header is for. */
    columnGroup: ColumnGroup;
    /**
     * The text label to render.
     * If the column is using a headerValueGetter, the displayName will take this into account.
     */
    displayName: string;
    /** Opens / closes the column group */
    setExpanded: (expanded: boolean) => void;
    /**
     * Sets a tooltip to the main element of this component.
     * @param value The value to be displayed by the tooltip
     * @param shouldDisplayTooltip A function returning a boolean that allows the tooltip to be displayed conditionally. This option does not work when `enableBrowserTooltips={true}`.
     */
    setTooltip: (value: string, shouldDisplayTooltip?: () => boolean) => void;
    /**
     * Callback to request the grid to show the column menu.
     * Pass in an html element to have the
     * grid position the menu over the element.
     * If provided, the grid will call `onClosedCallback` when the menu is closed.
     * Note that this only works with the new column menu.
     */
    showColumnMenu: (source: HTMLElement, onClosedCallback?: () => void) => void;
    /**
     * Callback to request the grid to show the column menu.
     * Similar to `showColumnMenu`, but will position the menu next to the provided `mouseEvent`.
     * If provided, the grid will call `onClosedCallback` when the menu is closed.
     * Note that this only works with the new column menu.
     */
    showColumnMenuAfterMouseClick: (mouseEvent: MouseEvent | Touch, onClosedCallback?: () => void) => void;
    /** The component to use for inside the header group (replaces the text value and leaves the remainder of the Grid's original component). */
    innerHeaderGroupComponent?: any;
    /** Additional params to customise to the `innerHeaderGroupComponent`. */
    innerHeaderGroupComponentParams?: any;
    /**
     * The header the grid provides.
     * The custom group header component is a child of the grid provided header.
     * The grid's header component is what contains the grid managed functionality such as resizing, keyboard navigation etc.
     * This is provided should you want to make changes to this cell,
     * eg add ARIA tags, or add keyboard event listener (as focus goes here when navigating to the header).
     */
    eGridHeader: HTMLElement;
}
export interface IHeaderGroup {
}
export interface IHeaderGroupComp extends IHeaderGroup, IComponent<IHeaderGroupParams> {
}
export interface IInnerHeaderGroupComponent<TData = any, TContext = any, TParams extends Readonly<IHeaderGroupParams<TData, TContext>> = IHeaderGroupParams<TData, TContext>> extends IComponent<TParams>, IHeaderGroup {
}
export declare class HeaderGroupComp extends Component implements IHeaderGroupComp {
    params: IHeaderGroupParams;
    private readonly agOpened;
    private readonly agClosed;
    private readonly agLabel;
    private innerHeaderGroupComponent;
    private isLoadingInnerComponent;
    constructor();
    init(params: IHeaderGroupParams): void;
    private checkWarnings;
    private workOutInnerHeaderGroupComponent;
    private setupExpandIcons;
    private addTouchAndClickListeners;
    private updateIconVisibility;
    private addInIcon;
    private addGroupExpandIcon;
    private setupLabel;
    destroy(): void;
}
