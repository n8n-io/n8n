import type { ExtractPropTypes } from 'vue';
import type Checkbox from './checkbox.vue';
export declare type CheckboxValueType = string | number | boolean;
export declare const checkboxProps: {
    /**
     * @description binding value
     */
    modelValue: {
        type: (NumberConstructor | BooleanConstructor | StringConstructor)[];
        default: undefined;
    };
    /**
     * @description value of the Checkbox when used inside a `checkbox-group`
     */
    label: {
        type: (ObjectConstructor | NumberConstructor | BooleanConstructor | StringConstructor)[];
        default: undefined;
    };
    /**
     * @description Set indeterminate state, only responsible for style control
     */
    indeterminate: BooleanConstructor;
    /**
     * @description whether the Checkbox is disabled
     */
    disabled: BooleanConstructor;
    /**
     * @description if the Checkbox is checked
     */
    checked: BooleanConstructor;
    /**
     * @description native 'name' attribute
     */
    name: {
        type: StringConstructor;
        default: undefined;
    };
    /**
     * @description value of the Checkbox if it's checked
     */
    trueLabel: {
        type: (NumberConstructor | StringConstructor)[];
        default: undefined;
    };
    /**
     * @description value of the Checkbox if it's not checked
     */
    falseLabel: {
        type: (NumberConstructor | StringConstructor)[];
        default: undefined;
    };
    /**
     * @description input id
     */
    id: {
        type: StringConstructor;
        default: undefined;
    };
    /**
     * @description same as [aria-controls](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-controls), takes effect when `indeterminate` is `true`
     */
    controls: {
        type: StringConstructor;
        default: undefined;
    };
    /**
     * @description whether to add a border around Checkbox
     */
    border: BooleanConstructor;
    /**
     * @description size of the Checkbox
     */
    size: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    /**
     * @description input tabindex
     */
    tabindex: (NumberConstructor | StringConstructor)[];
    /**
     * @description whether to trigger form validation
     */
    validateEvent: {
        type: BooleanConstructor;
        default: boolean;
    };
};
export declare const checkboxEmits: {
    "update:modelValue": (val: CheckboxValueType) => boolean;
    change: (val: CheckboxValueType) => boolean;
};
export declare type CheckboxProps = ExtractPropTypes<typeof checkboxProps>;
export declare type CheckboxEmits = typeof checkboxEmits;
export declare type CheckboxInstance = InstanceType<typeof Checkbox>;
