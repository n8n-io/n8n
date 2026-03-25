import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
export declare class ColumnAnimationService extends BeanStub implements NamedBean {
    beanName: "colAnimation";
    private gridBodyCtrl;
    private executeNextFuncs;
    private executeLaterFuncs;
    private active;
    private activeNext;
    private suppressAnimation;
    private animationThreadCount;
    postConstruct(): void;
    isActive(): boolean;
    setSuppressAnimation(suppress: boolean): void;
    start(): void;
    finish(): void;
    executeNextVMTurn(func: (...args: any[]) => any): void;
    executeLaterVMTurn(func: (...args: any[]) => any): void;
    private ensureAnimationCssClassPresent;
    private flush;
}
