import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { BeanCollection } from '../context/context';
import type { AgColumn } from '../entities/agColumn';
import type { AgProvidedColumnGroup } from '../entities/agProvidedColumnGroup';
import type { ContainerType } from '../interfaces/iAfterGuiAttachedParams';
import type { IMenuFactory } from '../interfaces/iMenuFactory';
export declare class FilterMenuFactory extends BeanStub implements NamedBean, IMenuFactory {
    beanName: "filterMenuFactory";
    private popupSvc?;
    wireBeans(beans: BeanCollection): void;
    private hidePopup;
    private tabListener;
    private activeMenu?;
    hideActiveMenu(): void;
    showMenuAfterMouseEvent(column: AgColumn | AgProvidedColumnGroup | undefined, mouseEvent: MouseEvent | Touch, containerType: ContainerType, onClosedCallback?: () => void): void;
    showMenuAfterButtonClick(column: AgColumn | AgProvidedColumnGroup | undefined, eventSource: HTMLElement, containerType: ContainerType, onClosedCallback?: () => void): void;
    private showPopup;
    private trapFocusWithin;
    private dispatchVisibleChangedEvent;
    isMenuEnabled(column: AgColumn): boolean;
    showMenuAfterContextMenuEvent(): void;
    destroy(): void;
}
