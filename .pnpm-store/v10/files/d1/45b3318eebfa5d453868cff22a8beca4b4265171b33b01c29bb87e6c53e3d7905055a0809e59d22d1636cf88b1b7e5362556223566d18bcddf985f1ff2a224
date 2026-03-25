import type { PropType } from 'vue';
import type { Store } from '../store';
import type { ColumnCls, ColumnStyle, Table } from '../table/defaults';
import type { TableOverflowTooltipOptions } from '../util';
interface TableBodyProps<T> {
    store: Store<T>;
    stripe?: boolean;
    context: Table<T>;
    rowClassName: ColumnCls<T>;
    rowStyle: ColumnStyle<T>;
    fixed: string;
    highlight: boolean;
    tooltipEffect?: string;
    tooltipOptions?: TableOverflowTooltipOptions;
}
declare const defaultProps: {
    store: {
        required: boolean;
        type: PropType<any>;
    };
    stripe: BooleanConstructor;
    tooltipEffect: StringConstructor;
    tooltipOptions: {
        type: PropType<Partial<Pick<import("../../..").ElTooltipProps, "offset" | "effect" | "placement" | "popperClass" | "showAfter" | "hideAfter" | "popperOptions" | "enterable" | "showArrow">> | undefined>;
    };
    context: {
        default: () => {};
        type: PropType<Table<any>>;
    };
    rowClassName: PropType<ColumnCls<any>>;
    rowStyle: PropType<ColumnStyle<any>>;
    fixed: {
        type: StringConstructor;
        default: string;
    };
    highlight: BooleanConstructor;
};
export { TableBodyProps };
export default defaultProps;
