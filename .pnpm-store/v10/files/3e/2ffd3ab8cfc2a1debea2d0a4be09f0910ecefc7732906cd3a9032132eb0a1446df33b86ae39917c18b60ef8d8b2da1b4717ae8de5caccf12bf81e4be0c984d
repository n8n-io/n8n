import type { IMenuActionParams } from './iCallbackParams';
import type { AgGridCommon } from './iCommon';
import type { IComponent } from './iComponent';
export interface MenuItemLeafDef<TData = any, TContext = any> {
    /** Name of the menu item. */
    name: string;
    /** Set to `true` to display the menu item as disabled. */
    disabled?: boolean;
    /**
     * Shortcut text displayed inside menu item.
     * Setting this doesn’t actually create a keyboard shortcut binding.
     */
    shortcut?: string;
    /** Function that gets executed when item is chosen. */
    action?: (params: IMenuActionParams<TData, TContext>) => void;
    /** Set to true to provide a check beside the option. */
    checked?: boolean;
    /** The icon to display, either a DOM element or HTML string. */
    icon?: Element | string;
    /** CSS classes to apply to the menu item. */
    cssClasses?: string[];
    /** Tooltip text to be displayed for the menu item. */
    tooltip?: string;
    /**
     * If `true`, will keep the menu open when the item is selected.
     * Note that if this item has a sub menu,
     * it will always remain open regardless of this property.
     */
    suppressCloseOnSelect?: boolean;
}
export interface MenuItemDef<TData = any, TContext = any> extends MenuItemLeafDef<TData, TContext> {
    /**
     * If this item is a sub menu, contains a list of menu item definitions */
    subMenu?: (MenuItemDef<TData, TContext> | string)[];
    /**
     * The aria role for the subMenu
     * @default 'menu'
     */
    subMenuRole?: 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
    /**
     * Provide a custom menu item component.
     * See [Menu Item Component](https://www.ag-grid.com/javascript-data-grid/component-menu-item/#implementing-a-menu-item-component) for framework specific implementation details.
     */
    menuItem?: any;
    /**
     * Parameters to be passed to the custom menu item component specified in `menuItem`.
     */
    menuItemParams?: any;
}
export interface IMenuConfigParams {
    /**
     * Suppress the grid-provided tooltip on hover.
     */
    suppressTooltip?: boolean;
    /**
     * Suppress handling of click events. If `true`, the component will need to implement its own click event handler.
     * The grid will no longer handle performing the action and opening the sub menu (if appropriate).
     */
    suppressClick?: boolean;
    /** Suppress handling of mouse down events. */
    suppressMouseDown?: boolean;
    /**
     * Suppress handling of mouseenter and mouseleave events, If `true`,
     * The grid will no longer update the active status of the menu item or open sub menus.
     */
    suppressMouseOver?: boolean;
    /**
     * Suppress handling of keyboard events to select the current item. If `true`,
     * the grid will not select the menu item on Enter or Space.
     */
    suppressKeyboardSelect?: boolean;
    /**
     * Suppress setting tabindex on the root element. If `true`,
     * will need to set tabindex elsewhere for keyboard navigation to work.
     */
    suppressTabIndex?: boolean;
    /**
     * Suppress setting Aria properties on the root element.
     */
    suppressAria?: boolean;
    /**
     * Suppress setting CSS classes on the root element. If `true` and
     * mixing custom menu item components with grid-provided ones,
     * will need to style with table display rules, as well as adding active and disabled styling.
     */
    suppressRootStyles?: boolean;
    /**
     * Suppress focusing the root element when made active. If `true`,
     * will need to handle keyboard navigation.
     */
    suppressFocus?: boolean;
}
export interface BaseMenuItemParams<TData = any, TContext = any> extends MenuItemDef, AgGridCommon<TData, TContext> {
    /** Level within the menu tree (starts at 0). */
    level: number;
    /** Returns `true` if another sub menu is open. */
    isAnotherSubMenuOpen: () => boolean;
    /**
     * Open the sub menu for this item.
     * @param activateFirstItem If `true`, activate the first item in the sub menu.
     */
    openSubMenu: (activateFirstItem?: boolean) => void;
    /** Close the sub menu for this item. */
    closeSubMenu: () => void;
    /** Close the entire menu. */
    closeMenu: (event?: KeyboardEvent | MouseEvent) => void;
    /**
     * Updates the grid-provided tooltip this component.
     * @param tooltip The value to be displayed by the tooltip
     * @param shouldDisplayTooltip A function returning a boolean that allows the tooltip to be displayed conditionally. This option does not work when `enableBrowserTooltips={true}`.
     */
    updateTooltip: (tooltip?: string, shouldDisplayTooltip?: () => boolean) => void;
}
export interface IMenuItemParams<TData = any, TContext = any> extends BaseMenuItemParams<TData, TContext> {
    /**
     * Callback to let the menu know that the current item has become active.
     * Required if updating the active status within the menu item.
     */
    onItemActivated: () => void;
}
export interface BaseMenuItem {
    /** Called when the item is selected, e.g. clicked or Enter is pressed. */
    select?(): void;
    /**
     * Configure the default grid behaviour for this item, including styling,
     * and mouse and keyboard interactions.
     *
     * @returns `true` to use all default behaviour, `false` to use no default behaviour
     * (equivalent to `configureDefaults` not being defined),
     * or `IMenuConfigParams` to choose what default behaviour to use.
     */
    configureDefaults?(): boolean | IMenuConfigParams;
}
export interface IMenuItem extends BaseMenuItem {
    /** Called when the item is activated/deactivated, either via mouseover or keyboard navigation. */
    setActive?(active: boolean): void;
    /** If the item has a sub menu, called when the sub menu is opened/closed. */
    setExpanded?(expanded: boolean): void;
}
export interface IMenuItemComp<TData = any, TContext = any> extends IComponent<IMenuItemParams<TData, TContext>>, IMenuItem {
}
export type DefaultMenuItem = 'pinSubMenu' | 'pinLeft' | 'pinRight' | 'pinRowSubMenu' | 'pinTop' | 'pinBottom' | 'unpinRow' | 'clearPinned' | 'valueAggSubMenu' | 'autoSizeThis' | 'autoSizeAll' | 'rowGroup' | 'rowUnGroup' | 'resetColumns' | 'expandAll' | 'contractAll' | 'copy' | 'copyWithHeaders' | 'copyWithGroupHeaders' | 'cut' | 'paste' | 'export' | 'csvExport' | 'excelExport' | 'separator' | 'pivotChart' | 'chartRange' | 'columnFilter' | 'columnChooser' | 'sortAscending' | 'sortDescending' | 'sortUnSort' | 'separator';
