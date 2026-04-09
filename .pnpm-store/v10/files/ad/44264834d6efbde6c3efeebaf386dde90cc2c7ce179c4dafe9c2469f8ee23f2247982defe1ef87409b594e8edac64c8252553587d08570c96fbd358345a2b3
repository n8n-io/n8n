import type { UserComponentFactory } from '../../../components/framework/userComponentFactory';
import type { Context } from '../../../context/context';
import type { ColDef } from '../../../entities/colDef';
import type { IDateParams } from '../../../interfaces/dateComponent';
import type { IAfterGuiAttachedParams } from '../../../interfaces/iAfterGuiAttachedParams';
/** Provides sync access to async component. Date component can be lazy created - this class encapsulates
 * this by keeping value locally until DateComp has loaded, then passing DateComp the value. */
export declare class DateCompWrapper {
    private dateComp;
    private tempValue;
    private disabled;
    private alive;
    private readonly context;
    private readonly eParent;
    constructor(context: Context, userCompFactory: UserComponentFactory, colDef: ColDef, dateComponentParams: IDateParams, eParent: HTMLElement, onReady?: (comp: DateCompWrapper) => void);
    destroy(): void;
    getDate(): Date | null;
    setDate(value: Date | null): void;
    setDisabled(disabled: boolean): void;
    setDisplayed(displayed: boolean): void;
    setInputPlaceholder(placeholder: string): void;
    setInputAriaLabel(label: string): void;
    afterGuiAttached(params?: IAfterGuiAttachedParams): void;
    updateParams(params: IDateParams): void;
}
