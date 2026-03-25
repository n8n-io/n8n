import { BeanStub } from '../../context/beanStub';
import type { DoesFilterPassParams, FilterHandler, FilterHandlerParams, IDoesFilterPassParams } from '../../interfaces/iFilter';
import type { ICombinedSimpleModel, ISimpleFilterModel, ISimpleFilterModelType, ISimpleFilterParams, MapValuesFromSimpleFilterModel, Tuple } from './iSimpleFilter';
import { OptionsFactory } from './optionsFactory';
import type { SimpleFilterModelFormatter } from './simpleFilterModelFormatter';
export declare abstract class SimpleFilterHandler<TModel extends ISimpleFilterModel, TValue, TParams extends ISimpleFilterParams> extends BeanStub implements FilterHandler<any, any, TModel | ICombinedSimpleModel<TModel>, TParams> {
    private readonly mapValuesFromModel;
    private readonly defaultOptions;
    /** Used to get the filter type for filter models. */
    abstract readonly filterType: 'text' | 'number' | 'date';
    protected abstract readonly FilterModelFormatterClass: new (optionsFactory: OptionsFactory, filterParams: ISimpleFilterParams) => SimpleFilterModelFormatter<ISimpleFilterParams>;
    protected params: FilterHandlerParams<any, any, TModel | ICombinedSimpleModel<TModel>, TParams>;
    private optionsFactory;
    private filterModelFormatter;
    constructor(mapValuesFromModel: MapValuesFromSimpleFilterModel<TModel, TValue>, defaultOptions: string[]);
    protected abstract evaluateNullValue(filterType?: ISimpleFilterModelType | null): boolean;
    protected abstract evaluateNonNullValue(range: Tuple<TValue>, cellValue: TValue, filterModel: TModel, params: IDoesFilterPassParams): boolean;
    init(params: FilterHandlerParams<any, any, TModel | ICombinedSimpleModel<TModel>, TParams>): void;
    refresh(params: FilterHandlerParams<any, any, TModel | ICombinedSimpleModel<TModel>, TParams>): void;
    protected updateParams(params: FilterHandlerParams<any, any, TModel | ICombinedSimpleModel<TModel>, TParams>): void;
    doesFilterPass(params: DoesFilterPassParams<any, TModel | ICombinedSimpleModel<TModel>>): boolean;
    getModelAsString(model: TModel | ICombinedSimpleModel<TModel> | null, source?: 'floating' | 'filterToolPanel'): string;
    protected validateModel(params: FilterHandlerParams<any, any, TModel | ICombinedSimpleModel<TModel>, TParams>): void;
    /** returns true if the row passes the said condition */
    private individualConditionPasses;
}
