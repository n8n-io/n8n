import { HistoryService } from './HistoryService';
import type { SpecStore } from './models';
import type { ScrollService } from './ScrollService';
import type { IMenuItem } from './types';
/** Generic interface for MenuItems */
export declare const SECTION_ATTR = "data-section-id";
/**
 * Stores all side-menu related information
 */
export declare class MenuStore {
    scroll: ScrollService;
    history: HistoryService;
    /**
     * Statically try update scroll position
     * Used before hydrating from server-side rendered html to scroll page faster
     */
    static updateOnHistory(id: string | undefined, scroll: ScrollService): void;
    /**
     * active item absolute index (when flattened). -1 means nothing is selected
     */
    activeItemIdx: number;
    /**
     * whether sidebar with menu is opened or not
     */
    sideBarOpened: boolean;
    items: IMenuItem[];
    flatItems: IMenuItem[];
    /**
     * cached flattened menu items to support absolute indexing
     */
    private _unsubscribe;
    private _hashUnsubscribe;
    /**
     *
     * @param spec [SpecStore](#SpecStore) which contains page content structure
     * @param scroll scroll service instance used by this menu
     */
    constructor(spec: SpecStore, scroll: ScrollService, history: HistoryService);
    subscribe(): void;
    toggleSidebar(): void;
    closeSidebar(): void;
    /**
     * update active items on scroll
     * @param isScrolledDown whether last scroll was downside
     */
    updateOnScroll: (isScrolledDown: boolean) => void;
    /**
     * update active items on hash change
     * @param id current hash
     */
    updateOnHistory: (id?: string) => void;
    /**
     * get section/operation DOM Node related to the item or null if it doesn't exist
     * @param idx item absolute index
     */
    getElementAt(idx: number): Element | null;
    /**
     * get section/operation DOM Node related to the item or if it is group item, returns first item of the group
     * @param idx item absolute index
     */
    getElementAtOrFirstChild(idx: number): Element | null;
    /**
     * current active item
     */
    get activeItem(): IMenuItem;
    getItemById: (id: string) => IMenuItem | undefined;
    /**
     * activate menu item
     * @param item item to activate
     * @param updateLocation [true] whether to update location
     * @param rewriteHistory [false] whether to rewrite browser history (do not create new entry)
     */
    activate(item: IMenuItem | undefined, updateLocation?: boolean, rewriteHistory?: boolean): void;
    /**
     * makes item and all the parents not active
     * @param item item to deactivate
     */
    deactivate(item: IMenuItem | undefined): void;
    /**
     * activate menu item and scroll to it
     * @see MenuStore.activate
     */
    activateAndScroll(item: IMenuItem | undefined, updateLocation?: boolean, rewriteHistory?: boolean): void;
    /**
     * scrolls to active section
     */
    scrollToActive(): void;
    dispose(): void;
}
