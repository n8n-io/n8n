import type { NamedBean } from './context/bean';
import { BeanStub } from './context/beanStub';
import type { FakeHScrollComp } from './gridBodyComp/fakeHScrollComp';
import type { FakeVScrollComp } from './gridBodyComp/fakeVScrollComp';
import type { GridBodyCtrl } from './gridBodyComp/gridBodyCtrl';
import type { GridBodyScrollFeature } from './gridBodyComp/gridBodyScrollFeature';
import type { RowContainerCtrl } from './gridBodyComp/rowContainer/rowContainerCtrl';
import type { GridCtrl } from './gridComp/gridCtrl';
import type { GridHeaderCtrl } from './headerRendering/gridHeaderCtrl';
import type { HeaderRowContainerCtrl } from './headerRendering/rowContainer/headerRowContainerCtrl';
import type { ColumnPinnedType } from './interfaces/iColumn';
/** If adding or removing a control, update `NUM_CTRLS` below. */
interface ReadyParams {
    gridCtrl: GridCtrl;
    gridBodyCtrl: GridBodyCtrl;
    center: RowContainerCtrl;
    left: RowContainerCtrl;
    right: RowContainerCtrl;
    bottomCenter: RowContainerCtrl;
    bottomLeft: RowContainerCtrl;
    bottomRight: RowContainerCtrl;
    topCenter: RowContainerCtrl;
    topLeft: RowContainerCtrl;
    topRight: RowContainerCtrl;
    stickyTopCenter: RowContainerCtrl;
    stickyTopLeft: RowContainerCtrl;
    stickyTopRight: RowContainerCtrl;
    stickyBottomCenter: RowContainerCtrl;
    stickyBottomLeft: RowContainerCtrl;
    stickyBottomRight: RowContainerCtrl;
    fakeHScrollComp: FakeHScrollComp;
    fakeVScrollComp: FakeVScrollComp;
    gridHeaderCtrl: GridHeaderCtrl;
    centerHeader: HeaderRowContainerCtrl;
    leftHeader: HeaderRowContainerCtrl;
    rightHeader: HeaderRowContainerCtrl;
}
type CtrlType = keyof ReadyParams;
type BeanDestroyFunc = Pick<BeanStub<any>, 'addDestroyFunc'>;
export declare class CtrlsService extends BeanStub<'ready'> implements NamedBean {
    beanName: "ctrlsSvc";
    private params;
    private ready;
    private readyCallbacks;
    postConstruct(): void;
    private updateReady;
    whenReady(caller: BeanDestroyFunc, callback: (p: ReadyParams) => void): void;
    register<K extends CtrlType, T extends ReadyParams[K]>(ctrlType: K, ctrl: T): void;
    get<K extends CtrlType>(ctrlType: K): ReadyParams[K];
    getGridBodyCtrl(): GridBodyCtrl;
    getHeaderRowContainerCtrls(): HeaderRowContainerCtrl[];
    getHeaderRowContainerCtrl(pinned?: ColumnPinnedType): HeaderRowContainerCtrl | undefined;
    getScrollFeature(): GridBodyScrollFeature;
}
export {};
