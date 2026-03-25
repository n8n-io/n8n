import type { Bean } from '../../../context/bean';
export interface FloatingFilterInputService extends Bean {
    setupGui(parentElement: HTMLElement): void;
    setEditable(editable: boolean): void;
    getValue(): string | null | undefined;
    setValue(value: string | null | undefined, silent?: boolean): void;
    setValueChangedListener(listener: (e: KeyboardEvent) => void): void;
    setParams(params: {
        ariaLabel: string;
        autoComplete?: boolean | string;
    }): void;
}
