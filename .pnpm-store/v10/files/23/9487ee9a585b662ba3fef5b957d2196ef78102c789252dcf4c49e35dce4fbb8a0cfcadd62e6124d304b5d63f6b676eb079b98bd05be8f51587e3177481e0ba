import type { ElementParams } from '../utils/element';
import { Component } from '../widgets/component';
import type { ScrollPartner } from './gridBodyScrollFeature';
export declare abstract class AbstractFakeScrollComp extends Component implements ScrollPartner {
    private readonly direction;
    readonly eViewport: HTMLElement;
    protected readonly eContainer: HTMLElement;
    protected invisibleScrollbar: boolean;
    protected hideTimeout: number;
    protected abstract setScrollVisible(): void;
    abstract getScrollPosition(): number;
    abstract setScrollPosition(value: number): void;
    constructor(template: ElementParams, direction: 'horizontal' | 'vertical');
    postConstruct(): void;
    destroy(): void;
    protected initialiseInvisibleScrollbar(): void;
    protected addActiveListenerToggles(): void;
    protected onScrollVisibilityChanged(): void;
    protected hideAndShowInvisibleScrollAsNeeded(): void;
    protected attemptSettingScrollPosition(value: number): void;
    onScrollCallback(fn: () => void): void;
}
