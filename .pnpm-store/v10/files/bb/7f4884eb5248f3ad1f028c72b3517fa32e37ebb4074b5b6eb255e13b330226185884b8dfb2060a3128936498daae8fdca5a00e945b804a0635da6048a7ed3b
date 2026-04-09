import type { IComponent } from '../agStack/interfaces/iComponent';
import type { DateFilterParams } from '../filter/provided/date/iDateFilter';
import type { IAfterGuiAttachedParams } from '../interfaces/iAfterGuiAttachedParams';
import type { AgGridCommon } from '../interfaces/iCommon';
export interface BaseDate {
    /** Optional: Sets the disabled state of this component */
    setDisabled?(disabled: boolean): void;
    /** Optional: Sets the current input placeholder */
    setInputPlaceholder?(placeholder: string): void;
    /** Optional: Sets the current input aria label */
    setInputAriaLabel?(placeholder: string): void;
    /**
     * Optional: A hook to perform any necessary operation just after
     * the GUI for this component has been rendered on the screen.
     * If a parent popup is closed and reopened (e.g. for filters),
     * this method is called each time the component is shown.
     * This is useful for any logic that requires attachment before executing,
     * such as putting focus on a particular DOM element.
     */
    afterGuiAttached?(params?: IAfterGuiAttachedParams): void;
}
export interface IDate extends BaseDate {
    /** Returns the current date represented by this component */
    getDate(): Date | null;
    /** Sets the date represented by this component */
    setDate(date: Date | null): void;
    /**
     * When used in a floating filter, a hook to perform any necessary operations
     * when the column definition is updated.
     */
    refresh?(params: IDateParams): void;
}
export interface BaseDateParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    filterParams: DateFilterParams;
    location?: 'filter' | 'floatingFilter';
}
export interface IDateParams<TData = any, TContext = any> extends BaseDateParams<TData, TContext> {
    /** Method for component to tell AG Grid that the date has changed. */
    onDateChanged: () => void;
}
export interface IDateComp extends IComponent<IDateParams>, IDate {
}
