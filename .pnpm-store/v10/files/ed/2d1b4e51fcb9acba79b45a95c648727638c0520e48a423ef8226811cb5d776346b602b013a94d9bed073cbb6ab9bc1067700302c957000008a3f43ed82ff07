import type { BeanName } from '../../context/context';
import type { CellFocusedEvent } from '../../events';
import type { EditValue } from '../../interfaces/iEditModelService';
import type { EditPosition, EditRowPosition } from '../../interfaces/iEditService';
import type { CellCtrl } from '../../rendering/cell/cellCtrl';
import type { EditValidationAction, EditValidationResult } from './baseEditStrategy';
import { BaseEditStrategy } from './baseEditStrategy';
export declare class FullRowEditStrategy extends BaseEditStrategy {
    beanName: BeanName | undefined;
    private rowNode?;
    private startedRows;
    isCellEditable(position: Required<EditPosition>, source?: 'api' | 'ui'): boolean;
    shouldStop(position?: EditPosition, event?: KeyboardEvent | MouseEvent | null | undefined, _source?: 'api' | 'ui'): boolean | null;
    midBatchInputsAllowed({ rowNode }: EditPosition): boolean;
    clearEdits(position: EditPosition): void;
    start(position: Required<EditPosition>, event?: KeyboardEvent | MouseEvent | null | undefined, _source?: 'api' | 'ui', ignoreEventKey?: boolean): void;
    protected processValidationResults(results: EditValidationResult<Required<EditPosition> & EditValue>): EditValidationAction;
    stop(cancel?: boolean, event?: Event | null): boolean;
    onCellFocusChanged(event: CellFocusedEvent<any, any>): void;
    cleanupEditors(position?: EditRowPosition, includeEditing?: boolean): void;
    moveToNextEditingCell(prevCell: CellCtrl, backwards: boolean, event?: KeyboardEvent, source?: 'api' | 'ui', preventNavigation?: boolean): boolean | null;
    private restoreEditors;
    destroy(): void;
}
