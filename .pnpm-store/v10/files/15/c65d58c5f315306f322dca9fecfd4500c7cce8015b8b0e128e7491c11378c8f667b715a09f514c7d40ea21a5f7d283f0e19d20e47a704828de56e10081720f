import type { Comparator, IScalarFilterParams } from './iScalarFilter';
import type { ISimpleFilterModel, ISimpleFilterModelType, Tuple } from './iSimpleFilter';
import { SimpleFilterHandler } from './simpleFilterHandler';
export declare abstract class ScalarFilterHandler<TModel extends ISimpleFilterModel, TValue, TParams extends IScalarFilterParams> extends SimpleFilterHandler<TModel, TValue, TParams> {
    protected abstract comparator(): Comparator<TValue>;
    protected abstract isValid(value: TValue): boolean;
    protected evaluateNullValue(filterType?: ISimpleFilterModelType | null): boolean;
    protected evaluateNonNullValue(values: Tuple<TValue>, cellValue: TValue, filterModel: TModel): boolean;
}
