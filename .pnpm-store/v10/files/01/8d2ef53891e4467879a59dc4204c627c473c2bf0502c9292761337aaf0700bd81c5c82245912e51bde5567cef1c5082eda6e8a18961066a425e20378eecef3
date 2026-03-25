import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { AgColumn } from '../entities/agColumn';
import type { HeaderCellCtrl } from '../headerRendering/cells/column/headerCellCtrl';
import type { HeaderGroupCellCtrl } from '../headerRendering/cells/columnGroup/headerGroupCellCtrl';
import type { ICellEditor } from '../interfaces/iCellEditor';
import type { CellCtrl } from '../rendering/cell/cellCtrl';
import type { RowCtrl } from '../rendering/row/rowCtrl';
import type { TooltipFeature } from './tooltipFeature';
export declare class TooltipService extends BeanStub implements NamedBean {
    beanName: "tooltipSvc";
    setupHeaderTooltip(existingTooltipFeature: TooltipFeature | undefined, ctrl: HeaderCellCtrl, value?: string, shouldDisplayTooltip?: () => boolean): TooltipFeature | undefined;
    setupHeaderGroupTooltip(existingTooltipFeature: TooltipFeature | undefined, ctrl: HeaderGroupCellCtrl, value?: string, shouldDisplayTooltip?: () => boolean): TooltipFeature | undefined;
    enableCellTooltipFeature(ctrl: CellCtrl, value?: string, shouldDisplayTooltip?: () => boolean): TooltipFeature | undefined;
    setupFullWidthRowTooltip(existingTooltipFeature: TooltipFeature | undefined, ctrl: RowCtrl, value: string, shouldDisplayTooltip?: () => boolean): TooltipFeature | undefined;
    setupCellEditorTooltip(cellCtrl: CellCtrl, editor: ICellEditor): TooltipFeature | undefined;
    initCol(column: AgColumn): void;
    private createTooltipFeature;
}
