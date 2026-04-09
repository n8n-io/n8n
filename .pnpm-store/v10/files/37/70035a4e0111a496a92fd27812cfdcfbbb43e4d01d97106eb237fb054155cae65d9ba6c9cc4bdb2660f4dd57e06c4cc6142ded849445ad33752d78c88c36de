import type { Component, ComponentSelector } from '../widgets/component';
import type { SideBarState } from './gridState';
import type { IToolPanel } from './iToolPanel';
export interface ISideBarService {
    comp: ISideBar;
    getSelector(): ComponentSelector<Component>;
}
export interface ISideBar {
    refresh(): void;
    setDisplayed(show: boolean): void;
    setSideBarPosition(position?: 'left' | 'right'): void;
    isToolPanelShowing(): boolean;
    openToolPanel(key: string, source?: 'sideBarButtonClicked' | 'sideBarInitializing' | 'api', parent?: HTMLElement | null): void;
    getToolPanelInstance(key: string): IToolPanel | undefined;
    close(source?: 'sideBarButtonClicked' | 'sideBarInitializing' | 'api'): void;
    openedItem(): string | null;
    isDisplayed(): boolean;
    getDef(): SideBarDef | undefined;
    getState(): SideBarState;
    setState(state?: SideBarState): void;
}
export interface ToolPanelDef {
    /** The unique ID for this panel. Used in the API and elsewhere to refer to the panel. */
    id: string;
    /** The key used for localisation for displaying the label. The label is displayed in the tab button. */
    labelKey: string;
    /** The default label if `labelKey` is missing or does not map to valid text through localisation. */
    labelDefault: string;
    /**
     * The min width of the tool panel.
     * @default 100
     */
    minWidth?: number;
    /** The max width of the tool panel. */
    maxWidth?: number;
    /**
     * The initial width of the tool panel.
     * @default $side-bar-panel-width (theme variable)
     */
    width?: number;
    /** The key of the icon to be used as a graphical aid beside the label in the side bar. */
    iconKey: string;
    /**
     * The tool panel component to use as the panel.
     * The provided panels use components `agColumnsToolPanel`, `agFiltersToolPanel` and `agNewFiltersToolPanel`.
     * To provide your own custom panel component, you reference it here.
     */
    toolPanel?: any;
    /** Customise the parameters provided to the `toolPanel` component. */
    toolPanelParams?: any;
    /**
     * DOM element to use as the parent for the tool panel to allow it to appear outside the grid.
     * Set to `null` or omit the property for tool panel to appear inside the grid.
     */
    parent?: HTMLElement | null;
}
export interface SideBarDef {
    /**
     * A list of all the panels to place in the side bar. The panels will be displayed in the provided order from top to bottom.
     */
    toolPanels?: (ToolPanelDef | string)[];
    /** The panel (identified by ID) to open by default. If none specified, the side bar is initially displayed closed. */
    defaultToolPanel?: string;
    /** To hide the side bar by default, set this to `true`. If left undefined the side bar will be shown. */
    hiddenByDefault?: boolean;
    /** Sets the side bar position relative to the grid. */
    position?: 'left' | 'right';
    /** To hide the side bar buttons by default set this to true. If left undefined the buttons will be shown. This is useful if you want to show a tool panel without showing the buttons. */
    hideButtons?: boolean;
}
