import type { NamedBean } from '../../context/bean';
import { BeanStub } from '../../context/beanStub';
import type { AgColumn } from '../../entities/agColumn';
import type { AgProvidedColumnGroup } from '../../entities/agProvidedColumnGroup';
import type { ColumnEventType } from '../../events';
import type { ContainerType } from '../../interfaces/iAfterGuiAttachedParams';
import type { Column } from '../../interfaces/iColumn';
interface BaseShowColumnMenuParams {
    column?: Column;
    onClosedCallback?: () => void;
}
interface BaseShowFilterMenuParams {
    column: Column;
    containerType: ContainerType;
}
interface MouseShowMenuParams {
    mouseEvent: MouseEvent | Touch;
    positionBy: 'mouse';
}
interface ButtonShowMenuParams {
    buttonElement: HTMLElement;
    positionBy: 'button';
}
interface AutoShowMenuParams {
    positionBy: 'auto';
}
type ShowColumnMenuParams = (MouseShowMenuParams | ButtonShowMenuParams | AutoShowMenuParams) & BaseShowColumnMenuParams;
type ShowFilterMenuParams = (MouseShowMenuParams | ButtonShowMenuParams | AutoShowMenuParams) & BaseShowFilterMenuParams;
export declare class MenuService extends BeanStub implements NamedBean {
    beanName: "menuSvc";
    private activeMenuFactory?;
    postConstruct(): void;
    showColumnMenu(params: ShowColumnMenuParams): void;
    showFilterMenu(params: ShowFilterMenuParams): void;
    showHeaderContextMenu(column: AgColumn | AgProvidedColumnGroup | undefined, mouseEvent?: MouseEvent, touchEvent?: TouchEvent): void;
    hidePopupMenu(): void;
    hideFilterMenu(): void;
    isColumnMenuInHeaderEnabled(column: AgColumn): boolean;
    isFilterMenuInHeaderEnabled(column: AgColumn): boolean;
    isHeaderContextMenuEnabled(column?: AgColumn | AgProvidedColumnGroup): boolean;
    isHeaderMenuButtonAlwaysShowEnabled(): boolean;
    isHeaderMenuButtonEnabled(): boolean;
    isHeaderFilterButtonEnabled(column: AgColumn): boolean;
    isFilterMenuItemEnabled(column: AgColumn): boolean;
    isFloatingFilterButtonEnabled(column: AgColumn): boolean;
    private isFloatingFilterButtonDisplayed;
    private isSuppressMenuHide;
    private showColumnMenuCommon;
}
export declare function _setColMenuVisible(column: AgColumn, visible: boolean, source: ColumnEventType): void;
export {};
