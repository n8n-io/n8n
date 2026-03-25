import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { GridBodyCtrl } from '../gridBodyComp/gridBodyCtrl';
import type { RowContainerEventsFeature } from '../gridBodyComp/rowContainer/rowContainerEventsFeature';
import type { HeaderComp } from '../headerRendering/cells/column/headerComp';
import type { HeaderGroupComp } from '../headerRendering/cells/columnGroup/headerGroupComp';
import type { GridHeaderCtrl } from '../headerRendering/gridHeaderCtrl';
import type { CellMouseListenerFeature } from '../rendering/cell/cellMouseListenerFeature';
export declare class TouchService extends BeanStub implements NamedBean {
    beanName: "touchSvc";
    mockBodyContextMenu(ctrl: GridBodyCtrl, listener: (mouseListener?: MouseEvent, touch?: Touch, touchEvent?: TouchEvent) => void): void;
    mockHeaderContextMenu(ctrl: GridHeaderCtrl, listener: (mouseListener?: MouseEvent, touch?: Touch, touchEvent?: TouchEvent) => void): void;
    mockRowContextMenu(ctrl: RowContainerEventsFeature): void;
    handleCellDoubleClick(ctrl: CellMouseListenerFeature, mouseEvent: MouseEvent): boolean;
    setupForHeader(comp: HeaderComp): void;
    setupForHeaderGroup(comp: HeaderGroupComp): void;
    setupForHeaderGroupElement(comp: HeaderGroupComp, eElement: HTMLElement, action: (event: MouseEvent) => void): void;
    private mockContextMenu;
}
