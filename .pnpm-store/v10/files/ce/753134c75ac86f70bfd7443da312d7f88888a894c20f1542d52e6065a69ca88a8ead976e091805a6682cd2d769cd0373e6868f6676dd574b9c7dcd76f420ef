import type { ComputedRef, Ref } from 'vue';
import type { FormItemContext } from '../types';
export declare const useFormItem: () => {
    form: import("../types").FormContext | undefined;
    formItem: FormItemContext | undefined;
};
export declare type IUseFormItemInputCommonProps = {
    id?: string;
    label?: string | number | boolean | Record<string, any>;
};
export declare const useFormItemInputId: (props: Partial<IUseFormItemInputCommonProps>, { formItemContext, disableIdGeneration, disableIdManagement, }: {
    formItemContext?: FormItemContext | undefined;
    disableIdGeneration?: Ref<boolean> | ComputedRef<boolean> | undefined;
    disableIdManagement?: Ref<boolean> | ComputedRef<boolean> | undefined;
}) => {
    isLabeledByFormItem: ComputedRef<boolean>;
    inputId: Ref<string | undefined>;
};
