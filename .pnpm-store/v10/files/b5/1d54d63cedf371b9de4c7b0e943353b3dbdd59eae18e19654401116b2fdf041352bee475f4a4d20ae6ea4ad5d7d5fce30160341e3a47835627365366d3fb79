import type { HorizontalDirection } from '../agStack/constants/direction';
import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { GridDragSource } from '../dragAndDrop/dragAndDropService';
import type { AgColumn } from '../entities/agColumn';
import type { AgColumnGroup } from '../entities/agColumnGroup';
import type { ColKey } from '../entities/colDef';
import type { ColumnEventType } from '../events';
import type { ColumnPinnedType } from '../interfaces/iColumn';
import { BodyDropTarget } from './columnDrag/bodyDropTarget';
export declare class ColumnMoveService extends BeanStub implements NamedBean {
    beanName: "colMoves";
    moveColumnByIndex(fromIndex: number, toIndex: number, source: ColumnEventType): void;
    moveColumns(columnsToMoveKeys: ColKey[], toIndex: number, source: ColumnEventType, finished?: boolean): void;
    private doesMovePassRules;
    doesOrderPassRules(gridOrder: AgColumn[]): boolean;
    getProposedColumnOrder(columnsToMove: AgColumn[], toIndex: number): AgColumn[];
    createBodyDropTarget(pinned: ColumnPinnedType, dropContainer: HTMLElement): BodyDropTarget;
    moveHeader(hDirection: HorizontalDirection, eGui: HTMLElement, column: AgColumn | AgColumnGroup, pinned: ColumnPinnedType, bean: BeanStub): void;
    setDragSourceForHeader(eSource: HTMLElement, column: AgColumn | AgColumnGroup, displayName: string | null): GridDragSource;
}
