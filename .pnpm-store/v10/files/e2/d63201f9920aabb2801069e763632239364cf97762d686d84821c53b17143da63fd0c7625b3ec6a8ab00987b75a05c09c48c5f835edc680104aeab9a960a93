import type { AgEvent } from './agEvent';
export interface AgCheckboxChangedEvent extends AgEvent<'checkboxChanged'> {
    id: string;
    name: string;
    selected?: boolean;
    previousValue: boolean | undefined;
}
export type ScrollDirection = 'horizontal' | 'vertical';
interface AgBodyScrollEvent extends AgEvent<'bodyScroll'> {
    direction: ScrollDirection;
    left: number;
    top: number;
}
interface AgBaseDragEvent<TEventType extends 'dragStarted' | 'dragStopped' | 'dragCancelled'> extends AgEvent<TEventType> {
    target: Element;
}
interface AgDragStartedEvent extends AgBaseDragEvent<'dragStarted'> {
}
interface AgDragStoppedEvent extends AgBaseDragEvent<'dragStopped'> {
}
interface AgDragCancelledEvent extends AgBaseDragEvent<'dragCancelled'> {
}
interface AgTooltipEvent<TEventType extends 'tooltipShow' | 'tooltipHide'> extends AgEvent<TEventType> {
    parentGui: HTMLElement;
}
interface AgTooltipShowEvent extends AgTooltipEvent<'tooltipShow'> {
    tooltipGui: HTMLElement;
}
interface AgTooltipHideEvent extends AgTooltipEvent<'tooltipHide'> {
}
/** Events required by AG Stack */
export interface BaseEvents {
    checkboxChanged: AgCheckboxChangedEvent;
    bodyScroll: AgBodyScrollEvent;
    dragStarted: AgDragStartedEvent;
    dragStopped: AgDragStoppedEvent;
    dragCancelled: AgDragCancelledEvent;
    tooltipShow: AgTooltipShowEvent;
    tooltipHide: AgTooltipHideEvent;
}
export {};
