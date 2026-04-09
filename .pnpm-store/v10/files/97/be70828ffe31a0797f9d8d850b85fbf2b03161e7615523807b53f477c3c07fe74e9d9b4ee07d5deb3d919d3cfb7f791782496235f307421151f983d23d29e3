import { Direction } from '../agStack/constants/direction';
import { BeanStub } from '../context/beanStub';
import type { FocusableContainer } from '../interfaces/iFocusableContainer';
import type { LayoutView } from '../styling/layoutFeature';
import type { Component, ComponentSelector } from '../widgets/component';
export interface IGridComp extends LayoutView {
    setRtlClass(cssClass: string): void;
    destroyGridUi(): void;
    forceFocusOutOfContainer(up: boolean): void;
    getFocusableContainers(): FocusableContainer[];
    setCursor(value: string | null): void;
    setUserSelect(value: string | null): void;
}
export interface OptionalGridComponents {
    paginationSelector?: ComponentSelector<Component>;
    gridHeaderDropZonesSelector?: ComponentSelector<Component>;
    sideBarSelector?: ComponentSelector<Component>;
    statusBarSelector?: ComponentSelector<Component>;
    watermarkSelector?: ComponentSelector<Component>;
}
export declare class GridCtrl extends BeanStub {
    private view;
    private eGridHostDiv;
    private eGui;
    private readonly additionalFocusableContainers;
    setComp(view: IGridComp, eGridDiv: HTMLElement, eGui: HTMLElement): void;
    isDetailGrid(): boolean;
    getOptionalSelectors(): OptionalGridComponents;
    private onGridSizeChanged;
    destroyGridUi(): void;
    getGui(): HTMLElement;
    setResizeCursor(direction: Direction | false): void;
    disableUserSelect(on: boolean): void;
    focusNextInnerContainer(backwards: boolean): boolean;
    focusInnerElement(fromBottom?: boolean): boolean;
    forceFocusOutOfContainer(up?: boolean): void;
    addFocusableContainer(container: FocusableContainer): void;
    removeFocusableContainer(container: FocusableContainer): void;
    allowFocusForNextCoreContainer(up?: boolean): void;
    isFocusable(): boolean;
    private getNextFocusableIndex;
    private focusContainer;
    private getFocusableContainers;
    destroy(): void;
}
