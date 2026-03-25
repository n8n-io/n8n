import type { IFilterOptionDef, ISimpleFilterParams } from './iSimpleFilter';
export declare class OptionsFactory {
    protected customFilterOptions: {
        [name: string]: IFilterOptionDef;
    };
    filterOptions: (IFilterOptionDef | string)[];
    defaultOption?: string;
    init(params: ISimpleFilterParams, defaultOptions: string[]): void;
    refresh(params: ISimpleFilterParams, defaultOptions: string[]): void;
    private mapCustomOptions;
    private getDefaultItem;
    getCustomOption(name?: string | null): IFilterOptionDef | undefined;
}
