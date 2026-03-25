import type { ComponentEvent } from './component';
import { Component } from './component';
import type { TabGuardParams } from './tabGuardFeature';
import { TabGuardFeature } from './tabGuardFeature';
export declare class TabGuardComp<TLocalEvent extends string = ComponentEvent> extends Component<TLocalEvent> {
    protected tabGuardFeature: TabGuardFeature;
    protected initialiseTabGuard(params: TabGuardParams): void;
    forceFocusOutOfContainer(up?: boolean): void;
    appendChild(newChild: Component | HTMLElement, container?: HTMLElement | undefined): void;
}
