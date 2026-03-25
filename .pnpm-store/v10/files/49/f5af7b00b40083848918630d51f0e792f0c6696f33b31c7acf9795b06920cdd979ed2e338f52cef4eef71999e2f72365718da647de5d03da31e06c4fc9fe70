import type { GroupResizeFeature } from '../../../columnResize/groupResizeFeature';
import type { BeanStub } from '../../../context/beanStub';
import type { AgColumnGroup } from '../../../entities/agColumnGroup';
import type { HeaderClassParams } from '../../../entities/colDef';
import type { ColumnEventType } from '../../../events';
import type { UserCompDetails } from '../../../interfaces/iUserCompDetails';
import type { IAbstractHeaderCellComp } from '../abstractCell/abstractHeaderCellCtrl';
import { AbstractHeaderCellCtrl } from '../abstractCell/abstractHeaderCellCtrl';
import type { IHeaderGroupComp } from './headerGroupComp';
export interface IHeaderGroupCellComp extends IAbstractHeaderCellComp {
    setResizableDisplayed(displayed: boolean): void;
    setWidth(width: string): void;
    setHeaderWrapperMaxHeight(value: number | null): void;
    setHeaderWrapperHidden(value: boolean): void;
    setAriaExpanded(expanded: 'true' | 'false' | undefined): void;
    setUserCompDetails(compDetails: UserCompDetails): void;
    getUserCompInstance(): IHeaderGroupComp | undefined;
}
export declare class HeaderGroupCellCtrl extends AbstractHeaderCellCtrl<IHeaderGroupCellComp, AgColumnGroup, GroupResizeFeature> {
    private expandable;
    private displayName;
    private tooltipFeature;
    setComp(comp: IHeaderGroupCellComp, eGui: HTMLElement, eResize: HTMLElement, eHeaderCompWrapper: HTMLElement, compBean: BeanStub<any> | undefined): void;
    protected getHeaderClassParams(): HeaderClassParams;
    private refreshMaxHeaderHeight;
    private addHighlightListeners;
    private onLeafColumnHighlightChanged;
    protected resizeHeader(delta: number, shiftKey: boolean): void;
    resizeLeafColumnsToFit(source: ColumnEventType): void;
    private setupUserComp;
    private addHeaderMouseListeners;
    private handleMouseOverChange;
    private setupTooltip;
    private setupExpandable;
    private refreshExpanded;
    private addClasses;
    private setupMovingCss;
    private onSuppressColMoveChange;
    private onFocusIn;
    protected handleKeyDown(e: KeyboardEvent): void;
    setDragSource(eHeaderGroup: HTMLElement): void;
    private isSuppressMoving;
    destroy(): void;
}
