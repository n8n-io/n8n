import type { ICellEditorParams } from '../../interfaces/iCellEditor';
import type { ElementParams } from '../../utils/dom';
import type { AgInputTextField } from '../../widgets/agInputTextField';
import type { ComponentSelector } from '../../widgets/component';
export interface CellEditorInput<TValue, P extends ICellEditorParams, I extends AgInputTextField> {
    getTemplate(): ElementParams;
    getAgComponents(): ComponentSelector[];
    init(eInput: I, params: P): void;
    getValue(): TValue | null | undefined;
    getStartValue(): string | null | undefined;
    getValidationErrors(): string[] | null;
    setCaret?(): void;
}
