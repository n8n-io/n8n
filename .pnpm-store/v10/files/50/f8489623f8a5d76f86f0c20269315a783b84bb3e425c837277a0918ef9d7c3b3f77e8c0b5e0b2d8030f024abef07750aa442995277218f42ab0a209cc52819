import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
export declare class AnimationFrameService extends BeanStub implements NamedBean {
    beanName: "animationFrameSvc";
    private p1;
    private p2;
    private f1;
    private destroyTasks;
    private ticking;
    active: boolean;
    private batchFrameworkComps;
    private scrollGoingDown;
    private lastScrollTop;
    private taskCount;
    setScrollTop(scrollTop: number): void;
    postConstruct(): void;
    private verify;
    createTask(task: () => void, index: number, list: 'p1' | 'p2', isFramework: boolean, isDeferred?: boolean): void;
    private addTaskToList;
    private sortTaskList;
    addDestroyTask(task: () => void): void;
    private executeFrame;
    flushAllFrames(): void;
    schedule(): void;
    private requestFrame;
    isQueueEmpty(): boolean;
}
