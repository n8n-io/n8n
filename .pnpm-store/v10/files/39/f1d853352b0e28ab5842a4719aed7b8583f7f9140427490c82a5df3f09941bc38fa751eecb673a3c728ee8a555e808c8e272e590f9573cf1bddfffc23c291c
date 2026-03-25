import type { Ref } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import type { MenuProps } from './menu';
export interface MenuItemRegistered {
    index: string;
    indexPath: string[];
    active: boolean;
}
export interface MenuItemClicked {
    index: string;
    indexPath: string[];
    route?: RouteLocationRaw;
}
export interface MenuProvider {
    openedMenus: string[];
    items: Record<string, MenuItemRegistered>;
    subMenus: Record<string, MenuItemRegistered>;
    activeIndex?: string;
    isMenuPopup: boolean;
    props: MenuProps;
    addMenuItem: (item: MenuItemRegistered) => void;
    removeMenuItem: (item: MenuItemRegistered) => void;
    addSubMenu: (item: MenuItemRegistered) => void;
    removeSubMenu: (item: MenuItemRegistered) => void;
    openMenu: (index: string, indexPath: string[]) => void;
    closeMenu: (index: string, indexPath: string[]) => void;
    handleMenuItemClick: (item: MenuItemClicked) => void;
    handleSubMenuClick: (subMenu: MenuItemRegistered) => void;
}
export interface SubMenuProvider {
    addSubMenu: (item: MenuItemRegistered) => void;
    removeSubMenu: (item: MenuItemRegistered) => void;
    handleMouseleave?: (deepDispatch: boolean) => void;
    mouseInChild: Ref<boolean>;
    level: number;
}
