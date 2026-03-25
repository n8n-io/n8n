import { BeanStub } from '../context/beanStub';
export interface IGridHeaderComp {
    toggleCss(cssClassName: string, on: boolean): void;
    setHeightAndMinHeight(height: string): void;
}
export declare class GridHeaderCtrl extends BeanStub {
    private comp;
    eGui: HTMLElement;
    headerHeight: number;
    setComp(comp: IGridHeaderComp, eGui: HTMLElement, eFocusableElement: HTMLElement): void;
    private setupHeaderHeight;
    private setHeaderHeight;
    private onPivotModeChanged;
    private onDisplayedColumnsChanged;
    protected onTabKeyDown(e: KeyboardEvent): void;
    protected handleKeyDown(e: KeyboardEvent): void;
    protected onFocusOut(e: FocusEvent): void;
    private onHeaderContextMenu;
}
