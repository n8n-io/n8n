import { BeanStub } from '../context/beanStub';
import type { BeanCollection } from '../context/context';
import type { RowContainerCtrl } from './rowContainer/rowContainerCtrl';
export declare class ViewportSizeFeature extends BeanStub {
    private readonly centerContainerCtrl;
    private scrollVisibleSvc;
    wireBeans(beans: BeanCollection): void;
    private gridBodyCtrl;
    private centerWidth;
    private bodyHeight;
    constructor(centerContainerCtrl: RowContainerCtrl);
    postConstruct(): void;
    private listenForResize;
    private onScrollbarWidthChanged;
    private onCenterViewportResized;
    private checkViewportAndScrolls;
    getBodyHeight(): number;
    private checkBodyHeight;
    private updateScrollVisibleService;
    private updateScrollVisibleServiceImpl;
    private onHorizontalViewportChanged;
}
