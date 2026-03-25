import type { Store } from '../store';
import type { PropType } from 'vue';
import type { Sort, SummaryMethod } from '../table/defaults';
export interface TableFooter<T> {
    fixed: string;
    store: Store<T>;
    summaryMethod: SummaryMethod<T>;
    sumText: string;
    border: boolean;
    defaultSort: Sort;
}
declare const _default: import("vue").DefineComponent<{
    fixed: {
        type: StringConstructor;
        default: string;
    };
    store: {
        required: true;
        type: PropType<any>;
    };
    summaryMethod: PropType<SummaryMethod<any>>;
    sumText: StringConstructor;
    border: BooleanConstructor;
    defaultSort: {
        type: PropType<Sort>;
        default: () => {
            prop: string;
            order: string;
        };
    };
}, {
    ns: {
        namespace: import("vue").ComputedRef<string>;
        b: (blockSuffix?: string) => string;
        e: (element?: string | undefined) => string;
        m: (modifier?: string | undefined) => string;
        be: (blockSuffix?: string | undefined, element?: string | undefined) => string;
        em: (element?: string | undefined, modifier?: string | undefined) => string;
        bm: (blockSuffix?: string | undefined, modifier?: string | undefined) => string;
        bem: (blockSuffix?: string | undefined, element?: string | undefined, modifier?: string | undefined) => string;
        is: {
            (name: string, state: boolean | undefined): string;
            (name: string): string;
        };
        cssVar: (object: Record<string, string>) => Record<string, string>;
        cssVarName: (name: string) => string;
        cssVarBlock: (object: Record<string, string>) => Record<string, string>;
        cssVarBlockName: (name: string) => string;
    };
    getCellClasses: (columns: import("../table-column/defaults").TableColumnCtx<any>[], cellIndex: number) => string[];
    getCellStyles: (column: import("../table-column/defaults").TableColumnCtx<any>, cellIndex: number) => any;
    columns: any;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
    fixed: {
        type: StringConstructor;
        default: string;
    };
    store: {
        required: true;
        type: PropType<any>;
    };
    summaryMethod: PropType<SummaryMethod<any>>;
    sumText: StringConstructor;
    border: BooleanConstructor;
    defaultSort: {
        type: PropType<Sort>;
        default: () => {
            prop: string;
            order: string;
        };
    };
}>>, {
    fixed: string;
    border: boolean;
    defaultSort: Sort;
}>;
export default _default;
