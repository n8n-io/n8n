import type { AgColumn } from '../entities/agColumn';
import type { AgProvidedColumnGroup } from '../entities/agProvidedColumnGroup';
import type { ContainerType } from './iAfterGuiAttachedParams';
export interface IMenuFactory {
    showMenuAfterButtonClick(column: AgColumn | AgProvidedColumnGroup | undefined, eventSource: HTMLElement, containerType: ContainerType, onClosedCallback?: () => void, filtersOnly?: boolean): void;
    showMenuAfterMouseEvent(column: AgColumn | AgProvidedColumnGroup | undefined, mouseEvent: MouseEvent | Touch, containerType: ContainerType, onClosedCallback?: () => void, filtersOnly?: boolean): void;
    showMenuAfterContextMenuEvent(column: AgColumn | AgProvidedColumnGroup | undefined, mouseEvent?: MouseEvent | null, touchEvent?: TouchEvent | null): void;
    isMenuEnabled(column: AgColumn): boolean;
    hideActiveMenu(): void;
}
