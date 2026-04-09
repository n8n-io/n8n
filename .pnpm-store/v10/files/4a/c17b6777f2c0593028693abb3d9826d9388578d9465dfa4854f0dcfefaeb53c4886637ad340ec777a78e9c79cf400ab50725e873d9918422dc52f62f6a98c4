import { AutoScrollService } from '../autoScrollService';
import type { BeanCollection } from '../context/context';
import type { GridBodyCtrl } from '../gridBodyComp/gridBodyCtrl';
import type { IRowNode } from '../interfaces/iRowNode';
/**
 * Used to handle the auto-scrolling and the throttled make new group and expand logic while dragging rows.
 */
export declare class RowDragFeatureNudger {
    private readonly beans;
    readonly autoScroll: AutoScrollService;
    groupThrottled: boolean;
    scrollChanged: boolean;
    private scrollChanging;
    private oldVScroll;
    private groupTimer;
    private groupTarget;
    private readonly onGroupThrottle;
    constructor(beans: BeanCollection, gridBodyCtrl: GridBodyCtrl);
    updateGroup(target: IRowNode | null, canExpand: boolean): void;
    startGroup(target: IRowNode | null): void;
    private clearGroup;
    clear(): void;
}
