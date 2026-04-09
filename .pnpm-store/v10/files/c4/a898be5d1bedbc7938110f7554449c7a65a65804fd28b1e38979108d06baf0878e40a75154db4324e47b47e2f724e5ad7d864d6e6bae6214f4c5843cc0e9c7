import type { AgColumn } from '../entities/agColumn';
import type { AgProvidedColumnGroup } from '../entities/agProvidedColumnGroup';
import type { ContainerType } from './iAfterGuiAttachedParams';
type MenuColumn = AgColumn | AgProvidedColumnGroup | undefined;
export interface IMenuFactory {
    showMenuAfterButtonClick(column: MenuColumn, eventSource: HTMLElement, containerType: ContainerType, onClosedCallback?: () => void, filtersOnly?: boolean): void;
    showMenuAfterMouseEvent(column: MenuColumn, mouseEvent: MouseEvent | Touch, containerType: ContainerType, onClosedCallback?: () => void, filtersOnly?: boolean): void;
    showMenuAfterContextMenuEvent(column: MenuColumn, mouseEvent?: MouseEvent | null, touchEvent?: TouchEvent | null): void;
    isMenuEnabled(column: AgColumn): boolean;
    hideActiveMenu(): void;
}
export {};
