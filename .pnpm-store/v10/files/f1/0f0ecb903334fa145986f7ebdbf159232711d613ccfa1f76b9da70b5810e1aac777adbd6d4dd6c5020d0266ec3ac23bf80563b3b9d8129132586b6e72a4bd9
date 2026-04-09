import type { HorizontalDirection } from '../../../agStack/constants/direction';
import { BeanStub } from '../../../context/beanStub';
import type { GridDragSource } from '../../../dragAndDrop/dragAndDropService';
import type { AgColumn } from '../../../entities/agColumn';
import type { AgColumnGroup } from '../../../entities/agColumnGroup';
import type { AgProvidedColumnGroup } from '../../../entities/agProvidedColumnGroup';
import type { HeaderClassParams, HeaderStyle } from '../../../entities/colDef';
import type { BrandedType } from '../../../interfaces/brandedType';
import type { HeaderRowCtrl } from '../../row/headerRowCtrl';
export interface IAbstractHeaderCellComp {
    toggleCss(cssClassName: string, on: boolean): void;
    setUserStyles(styles: HeaderStyle): void;
}
export interface IHeaderResizeFeature {
    toggleColumnResizing(resizing: boolean): void;
}
export type HeaderCellCtrlInstanceId = BrandedType<string, 'HeaderCellCtrlInstanceId'>;
export declare const DOM_DATA_KEY_HEADER_CTRL = "headerCtrl";
export declare abstract class AbstractHeaderCellCtrl<TComp extends IAbstractHeaderCellComp = IAbstractHeaderCellComp, TColumn extends AgColumn | AgColumnGroup = AgColumn | AgColumnGroup, TFeature extends IHeaderResizeFeature = IHeaderResizeFeature> extends BeanStub {
    readonly column: TColumn;
    readonly rowCtrl: HeaderRowCtrl;
    readonly instanceId: HeaderCellCtrlInstanceId;
    private isResizing;
    private resizeToggleTimeout;
    protected resizeMultiplier: number;
    eGui: HTMLElement;
    protected resizeFeature: TFeature | null;
    protected comp: TComp;
    lastFocusEvent: KeyboardEvent | null;
    protected dragSource: GridDragSource | null;
    protected reAttemptToFocus: boolean;
    protected abstract resizeHeader(delta: number, shiftKey: boolean): void;
    protected abstract getHeaderClassParams(): HeaderClassParams;
    constructor(column: TColumn, rowCtrl: HeaderRowCtrl);
    postConstruct(): void;
    setComp(comp: TComp, eGui: HTMLElement, eResize: HTMLElement, eHeaderCompWrapper: HTMLElement, compBean: BeanStub<any> | undefined): void;
    protected abstract wireComp(comp: TComp, eGui: HTMLElement, eResize: HTMLElement, eHeaderCompWrapper: HTMLElement, compBean: BeanStub<any> | undefined): void;
    protected shouldStopEventPropagation(event: KeyboardEvent): boolean;
    protected getWrapperHasFocus(): boolean;
    protected setGui(eGui: HTMLElement, compBean: BeanStub): void;
    protected refreshHeaderStyles(): void;
    private onGuiFocus;
    protected setupAutoHeight(params: {
        wrapperElement: HTMLElement;
        checkMeasuringCallback?: (callback: () => void) => void;
        compBean: BeanStub;
    }): void;
    protected onDisplayedColumnsChanged(): void;
    protected addResizeAndMoveKeyboardListeners(compBean: BeanStub): void;
    private refreshTabIndex;
    private onGuiKeyDown;
    protected moveHeader(hDirection: HorizontalDirection): void;
    private getViewportAdjustedResizeDiff;
    private getResizeDiff;
    private onGuiKeyUp;
    protected handleKeyDown(e: KeyboardEvent): void;
    private addDomData;
    focus(event?: KeyboardEvent): boolean;
    protected focusThis(): void;
    protected removeDragSource(): void;
    protected handleContextMenuMouseEvent(mouseEvent: MouseEvent | undefined, touchEvent: TouchEvent | undefined, column: AgColumn | AgProvidedColumnGroup): void;
    protected dispatchColumnMouseEvent(eventType: 'columnHeaderContextMenu' | 'columnHeaderClicked', column: AgColumn | AgProvidedColumnGroup): void;
    private setColHeaderHeight;
    protected clearComponent(): void;
    destroy(): void;
}
