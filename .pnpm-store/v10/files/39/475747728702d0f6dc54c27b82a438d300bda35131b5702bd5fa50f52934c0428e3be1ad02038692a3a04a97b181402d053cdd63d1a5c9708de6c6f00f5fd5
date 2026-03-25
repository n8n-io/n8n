import type { BeanName } from '../../context/context';
import type { CellFocusClearedEvent, CellFocusedEvent } from '../../events';
import type { EditValue } from '../../interfaces/iEditModelService';
import type { EditPosition, EditRowPosition } from '../../interfaces/iEditService';
import type { CellCtrl } from '../../rendering/cell/cellCtrl';
import type { EditValidationAction, EditValidationResult } from './baseEditStrategy';
import { BaseEditStrategy } from './baseEditStrategy';
export declare class SingleCellEditStrategy extends BaseEditStrategy {
    beanName: BeanName | undefined;
    private rowNode?;
    private column?;
    shouldStop(position?: EditPosition, event?: KeyboardEvent | MouseEvent | null | undefined, source?: 'api' | 'ui'): boolean | null;
    midBatchInputsAllowed(position?: EditPosition): boolean;
    start(position: Required<EditPosition>, event?: KeyboardEvent | MouseEvent | null, _source?: 'api' | 'ui', ignoreEventKey?: boolean): void;
    dispatchRowEvent(_position: EditRowPosition, _type: 'rowEditingStarted' | 'rowEditingStopped' | 'rowValueChanged'): void;
    protected processValidationResults(results: EditValidationResult<Required<EditPosition> & EditValue>): EditValidationAction;
    stop(cancel?: boolean, event?: Event | null): boolean;
    onCellFocusChanged(event: CellFocusedEvent | CellFocusClearedEvent): void;
    moveToNextEditingCell(prevCell: CellCtrl, backwards: boolean, event?: KeyboardEvent, source?: 'api' | 'ui', preventNavigation?: boolean): boolean | null;
    destroy(): void;
}
