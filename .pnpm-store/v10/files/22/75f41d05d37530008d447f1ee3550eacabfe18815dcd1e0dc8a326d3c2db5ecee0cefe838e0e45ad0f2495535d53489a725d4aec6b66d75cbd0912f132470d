import type { ISelectProps } from './token';
import type { Option } from './select.types';
export interface Props {
    label?: string;
    value?: string;
    disabled?: string;
    options?: string;
}
export declare const defaultProps: Required<Props>;
export declare function useProps(props: Pick<ISelectProps, 'props'>): {
    aliasProps: import("vue").ComputedRef<{
        label: string;
        value: string;
        disabled: string;
        options: string;
    }>;
    getLabel: (option: Option) => any;
    getValue: (option: Option) => any;
    getDisabled: (option: Option) => any;
    getOptions: (option: Option) => any;
};
