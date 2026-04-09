import type { AgEvent } from '../agStack/interfaces/agEvent';
import type { FilterAction } from '../interfaces/iFilter';
import type { ComponentSelector } from '../widgets/component';
import { Component } from '../widgets/component';
interface FilterButtonCompParams {
    className?: string;
}
export interface FilterButtonEvent extends AgEvent<FilterAction> {
    event?: Event;
}
export interface FilterButton {
    type: FilterAction;
    label: string;
}
export declare class FilterButtonComp extends Component<FilterAction> {
    private buttons;
    private listeners;
    private eApply?;
    private validationTooltipFeature?;
    private validationMessage;
    private readonly className;
    constructor(config?: FilterButtonCompParams);
    updateButtons(buttons: FilterButton[], useForm?: boolean): void;
    getApplyButton(): HTMLElement | undefined;
    updateValidity(valid: boolean, message?: string | null): void;
    private destroyListeners;
    destroy(): void;
}
export declare const AgFilterButtonSelector: ComponentSelector;
export {};
