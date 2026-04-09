import type { AgInputTextFieldParams } from '../../../agStack/widgets/agInputTextField';
import { BeanStub } from '../../../context/beanStub';
import type { AgComponentSelectorType } from '../../../widgets/component';
import type { FloatingFilterInputService } from './iFloatingFilterInputService';
export declare class FloatingFilterTextInputService extends BeanStub implements FloatingFilterInputService {
    private readonly params?;
    private eInput;
    private onValueChanged;
    constructor(params?: {
        config?: AgInputTextFieldParams<AgComponentSelectorType> | undefined;
    } | undefined);
    setupGui(parentElement: HTMLElement): void;
    setEditable(editable: boolean): void;
    getValue(): string | null | undefined;
    setValue(value: string | null | undefined, silent?: boolean): void;
    setValueChangedListener(listener: (e: KeyboardEvent) => void): void;
    setParams({ ariaLabel, autoComplete }: {
        ariaLabel: string;
        autoComplete?: boolean | string;
    }): void;
}
