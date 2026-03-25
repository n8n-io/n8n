import type { NumberFilterModel } from '../../provided/number/iNumberFilter';
import type { ITextInputFloatingFilterParams, TextFilterModel } from '../../provided/text/iTextFilter';
import type { FloatingFilterInputService } from './iFloatingFilterInputService';
import { SimpleFloatingFilter } from './simpleFloatingFilter';
type ModelUnion = TextFilterModel | NumberFilterModel;
export declare abstract class TextInputFloatingFilter<TParams extends ITextInputFloatingFilterParams, M extends ModelUnion> extends SimpleFloatingFilter<TParams> {
    private readonly eFloatingFilterInputContainer;
    private inputSvc;
    private applyActive;
    protected abstract createFloatingFilterInputService(params: TParams): FloatingFilterInputService;
    postConstruct(): void;
    protected defaultDebounceMs: number;
    protected onModelUpdated(model: M): void;
    protected setParams(params: TParams): void;
    private setupFloatingFilterInputService;
    private setTextInputParams;
    protected updateParams(params: TParams): void;
    protected recreateFloatingFilterInputService(params: TParams): void;
    private syncUpWithParentFilter;
    protected convertValue<TValue>(value: string | null | undefined): TValue | null;
    protected setEditable(editable: boolean): void;
}
export {};
