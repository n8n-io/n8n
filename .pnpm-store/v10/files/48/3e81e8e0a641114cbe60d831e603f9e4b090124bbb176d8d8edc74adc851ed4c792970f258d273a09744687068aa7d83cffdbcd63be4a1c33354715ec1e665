import { AgPromise } from '../../agStack/utils/promise';
import type { IAfterGuiAttachedParams } from '../../interfaces/iAfterGuiAttachedParams';
import type { FilterDisplayParams } from '../../interfaces/iFilter';
import type { ElementParams } from '../../utils/element';
import type { Component, ComponentSelector } from '../../widgets/component';
import type { GridInputTextField, GridRadioButton, GridSelect } from '../../widgets/gridWidgetTypes';
import type { FilterLocaleTextKey } from '../filterLocaleText';
import type { ICombinedSimpleModel, ISimpleFilter, ISimpleFilterModel, ISimpleFilterModelType, ISimpleFilterParams, JoinOperator, MapValuesFromSimpleFilterModel, Tuple } from './iSimpleFilter';
import { OptionsFactory } from './optionsFactory';
import { ProvidedFilter } from './providedFilter';
/** temporary type until `SimpleFilterParams` is updated as breaking change */
type SimpleFilterDisplayParams<M extends ISimpleFilterModel> = ISimpleFilterParams & FilterDisplayParams<any, any, M | ICombinedSimpleModel<M>>;
type FilterModelOrCombined<M extends ISimpleFilterModel> = M | ICombinedSimpleModel<M> | null;
/**
 * Every filter with a dropdown where the user can specify a comparing type against the filter values.
 *
 * @param M type of filter-model managed by the concrete sub-class that extends this type
 * @param V type of value managed by the concrete sub-class that extends this type
 * @param E type of UI element used for collecting user-input
 */
export declare abstract class SimpleFilter<M extends ISimpleFilterModel, V, E = GridInputTextField, P extends SimpleFilterDisplayParams<M> = SimpleFilterDisplayParams<M>> extends ProvidedFilter<M | ICombinedSimpleModel<M>, V, P> implements ISimpleFilter {
    private readonly mapValuesFromModel;
    private readonly defaultOptions;
    abstract readonly filterType: 'number' | 'text' | 'date';
    protected readonly eTypes: GridSelect[];
    protected readonly eJoinPanels: HTMLElement[];
    protected readonly eJoinAnds: GridRadioButton[];
    protected readonly eJoinOrs: GridRadioButton[];
    protected readonly eConditionBodies: HTMLElement[];
    private readonly listener;
    private maxNumConditions;
    private numAlwaysVisibleConditions;
    private defaultJoinOperator;
    private filterPlaceholder;
    private lastUiCompletePosition;
    private joinOperatorId;
    private filterListOptions;
    protected optionsFactory: OptionsFactory;
    constructor(filterNameKey: FilterLocaleTextKey, mapValuesFromModel: MapValuesFromSimpleFilterModel<M, V>, defaultOptions: string[]);
    protected abstract createEValue(): HTMLElement;
    protected abstract removeEValues(startPosition: number, deleteCount?: number): void;
    protected abstract areSimpleModelsEqual(a: ISimpleFilterModel, b: ISimpleFilterModel): boolean;
    protected abstract createCondition(position: number): M;
    protected abstract getInputs(position: number): Tuple<E>;
    protected abstract getValues(position: number): Tuple<V>;
    protected setParams(params: P): void;
    protected updateParams(newParams: P, oldParams: P): void;
    protected commonUpdateSimpleParams(params: P): void;
    onFloatingFilterChanged(type: string | null | undefined, value: V | null): void;
    private setTypeFromFloatingFilter;
    getModelFromUi(): FilterModelOrCombined<M>;
    protected getConditionTypes(): (ISimpleFilterModelType | null)[];
    protected getConditionType(position: number): ISimpleFilterModelType | null;
    protected getJoinOperator(): JoinOperator;
    protected areNonNullModelsEqual(a: M | ICombinedSimpleModel<M> | null, b: M | ICombinedSimpleModel<M> | null): boolean;
    protected setModelIntoUi(model: ISimpleFilterModel | ICombinedSimpleModel<M> | null, isInitialLoad?: boolean): AgPromise<void>;
    private setNumConditions;
    private createOption;
    private createJoinOperatorPanel;
    private createJoinOperator;
    private createFilterListOptions;
    private putOptionsIntoDropdown;
    private createBoilerplateListOption;
    private createCustomListOption;
    protected createBodyTemplate(): ElementParams | null;
    protected getAgComponents(): ComponentSelector[];
    protected updateUiVisibility(): void;
    private updateNumConditions;
    private updateConditionStatusesAndValues;
    private shouldAddNewConditionAtEnd;
    private removeConditionsAndOperators;
    private removeElements;
    protected removeComponents<TEventType extends string>(components: Component<TEventType>[], startPosition: number, deleteCount?: number): void;
    afterGuiAttached(params?: IAfterGuiAttachedParams): void;
    afterGuiDetached(): void;
    getModelAsString(model: M): string;
    private getPlaceholderText;
    protected resetPlaceholder(): void;
    protected setElementValue(element: E, value: V | null, fromFloatingFilter?: boolean): void;
    protected setElementDisplayed(element: E, displayed: boolean): void;
    protected setElementDisabled(element: E, disabled: boolean): void;
    protected attachElementOnChange(element: E, listener: () => void): void;
    protected forEachInput(cb: (element: E, index: number, position: number, numberOfInputs: number) => void): void;
    protected forEachPositionInput(position: number, cb: (element: E, index: number, position: number, numberOfInputs: number) => void): void;
    private forEachPositionTypeInput;
    private isConditionDisabled;
    private isConditionBodyVisible;
    protected isConditionUiComplete(position: number): boolean;
    private getNumConditions;
    private getUiCompleteConditions;
    private createMissingConditionsAndOperators;
    private resetUiToDefaults;
    private resetType;
    private resetJoinOperatorAnd;
    private resetJoinOperatorOr;
    private resetJoinOperator;
    private updateJoinOperatorsDisabled;
    private updateJoinOperatorDisabled;
    private resetInput;
    private setConditionIntoUi;
    private setValueFromFloatingFilter;
    private addChangedListeners;
    protected hasInvalidInputs(): boolean;
    private isReadOnly;
}
export {};
