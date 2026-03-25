import type { BeanCollection } from '../context/context';
import type { ComponentSelector } from '../widgets/component';
import { AbstractFakeScrollComp } from './abstractFakeScrollComp';
export declare class FakeHScrollComp extends AbstractFakeScrollComp {
    private visibleCols;
    private scrollVisibleSvc;
    wireBeans(beans: BeanCollection): void;
    private readonly eLeftSpacer;
    private readonly eRightSpacer;
    private enableRtl;
    constructor();
    postConstruct(): void;
    destroy(): void;
    protected initialiseInvisibleScrollbar(): void;
    private refreshCompBottom;
    protected onScrollVisibilityChanged(): void;
    private setFakeHScrollSpacerWidths;
    private setScrollVisibleDebounce;
    protected setScrollVisible(): void;
    getScrollPosition(): number;
    setScrollPosition(value: number): void;
}
export declare const FakeHScrollSelector: ComponentSelector;
