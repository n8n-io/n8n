import { TableOptions, RowData } from '@tanstack/table-core';
import { MaybeRef } from 'vue';
export * from '@tanstack/table-core';
export type TableOptionsWithReactiveData<TData extends RowData> = Omit<TableOptions<TData>, 'data'> & {
    data: MaybeRef<TData[]>;
};
export declare const FlexRender: import("vue").DefineComponent<Readonly<{
    props?: any;
    render?: any;
}>, () => any, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<Readonly<{
    props?: any;
    render?: any;
}>>>, {
    readonly props?: any;
    readonly render?: any;
}, {}>;
export declare function useVueTable<TData extends RowData>(initialOptions: TableOptionsWithReactiveData<TData>): import("@tanstack/table-core").Table<TData>;
