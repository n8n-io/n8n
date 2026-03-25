import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { BeanCollection } from '../context/context';
export interface SetScrollsVisibleParams {
    horizontalScrollShowing: boolean;
    verticalScrollShowing: boolean;
}
export declare class ScrollVisibleService extends BeanStub implements NamedBean {
    beanName: "scrollVisibleSvc";
    private ctrlsSvc;
    private colAnimation?;
    private scrollbarWidth;
    wireBeans(beans: BeanCollection): void;
    horizontalScrollShowing: boolean;
    verticalScrollShowing: boolean;
    horizontalScrollGap: boolean;
    verticalScrollGap: boolean;
    postConstruct(): void;
    private updateScrollVisible;
    private updateScrollVisibleImpl;
    updateScrollGap(): void;
    setScrollsVisible(params: SetScrollsVisibleParams): void;
    getScrollbarWidth(): number;
}
