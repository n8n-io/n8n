import type { AgEvent } from '../events';
import type { IEventEmitter, IEventListener } from '../interfaces/iEventEmitter';
export interface TapEvent extends AgEvent<'tap'> {
    touchStart: Touch;
}
export interface DoubleTapEvent extends AgEvent<'doubleTap'> {
    touchStart: Touch;
}
export interface LongTapEvent extends AgEvent<'longTap'> {
    touchStart: Touch;
    touchEvent: TouchEvent;
}
export type TouchListenerEvent = 'tap' | 'doubleTap' | 'longTap';
export declare class TouchListener implements IEventEmitter<TouchListenerEvent> {
    private DOUBLE_TAP_MILLIS;
    private destroyFuncs;
    private moved;
    private touching;
    private touchStart;
    private lastTapTime;
    private localEventService;
    private preventMouseClick;
    constructor(eElement: Element, preventMouseClick?: boolean);
    private getActiveTouch;
    addEventListener<T extends TouchListenerEvent>(eventType: T, listener: IEventListener<T>): void;
    removeEventListener<T extends TouchListenerEvent>(eventType: T, listener: IEventListener<T>): void;
    private onTouchStart;
    private onTouchMove;
    private onTouchEnd;
    private checkForDoubleTap;
    destroy(): void;
}
