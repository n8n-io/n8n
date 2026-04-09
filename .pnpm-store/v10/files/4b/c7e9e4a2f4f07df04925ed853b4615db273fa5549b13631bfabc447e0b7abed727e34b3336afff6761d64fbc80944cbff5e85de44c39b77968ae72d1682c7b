import { AgPopupComponent } from '../../agStack/popup/agPopupComponent';
import type { AgAbstractField } from '../../agStack/widgets/agAbstractField';
import type { BeanCollection } from '../../context/context';
import type { AgEventTypeParams } from '../../events';
import type { GridOptionsWithDefaults } from '../../gridOptionsDefault';
import type { GridOptionsService } from '../../gridOptionsService';
import type { ICellEditorComp, ICellEditorParams } from '../../interfaces/iCellEditor';
import type { AgGridCommon } from '../../interfaces/iCommon';
import type { AgComponentSelectorType } from '../../widgets/component';
export declare abstract class AgAbstractCellEditor<P extends ICellEditorParams = any, TValue = any> extends AgPopupComponent<BeanCollection, GridOptionsWithDefaults, AgEventTypeParams, AgGridCommon<any, any>, GridOptionsService, AgComponentSelectorType> implements ICellEditorComp {
    protected abstract eEditor: AgAbstractField<BeanCollection, GridOptionsWithDefaults, AgEventTypeParams, AgGridCommon<any, any>, GridOptionsService, AgComponentSelectorType, any, any, any>;
    protected params: P;
    protected abstract initialiseEditor(params: P): void;
    abstract getValidationElement(tooltip: boolean): HTMLElement | HTMLInputElement;
    abstract getValue(): TValue | null | undefined;
    abstract getValidationErrors(): string[] | null;
    errorMessages: string[] | null;
    init(params: P): void;
    destroy(): void;
}
