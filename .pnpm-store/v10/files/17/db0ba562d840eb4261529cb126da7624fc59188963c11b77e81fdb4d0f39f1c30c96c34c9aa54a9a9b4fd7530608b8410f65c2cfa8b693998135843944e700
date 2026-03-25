import type { NamedBean } from '../../context/bean';
import { BeanStub } from '../../context/beanStub';
import type { AgColumn } from '../../entities/agColumn';
import type { IHeaderCellComp } from '../../headerRendering/cells/column/headerCellCtrl';
import type { IHeaderFilterCellComp } from '../../headerRendering/cells/floatingFilter/iHeaderFilterCellComp';
import type { ICellComp } from '../../rendering/cell/cellCtrl';
export declare class ColumnHoverService extends BeanStub implements NamedBean {
    beanName: "colHover";
    private selectedColumns;
    postConstruct(): void;
    setMouseOver(columns: AgColumn[]): void;
    clearMouseOver(): void;
    isHovered(column: AgColumn): boolean;
    addHeaderColumnHoverListener(compBean: BeanStub, comp: IHeaderCellComp, column: AgColumn): void;
    onCellColumnHover(column: AgColumn, cellComp?: ICellComp): void;
    addHeaderFilterColumnHoverListener(compBean: BeanStub, comp: IHeaderFilterCellComp, column: AgColumn, eGui: HTMLElement): void;
    createHoverFeature(compBean: BeanStub, columns: AgColumn[], eGui: HTMLElement): void;
    private updateState;
}
