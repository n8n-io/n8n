import Form from './src/form.vue';
import FormItem from './src/form-item.vue';
export declare const ElForm: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
    readonly model: ObjectConstructor;
    readonly rules: {
        readonly type: import("vue").PropType<Partial<Record<string, import("element-plus/es/utils").Arrayable<import("./src/types").FormItemRule>>>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly labelPosition: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "top" | "right" | "left", unknown, "right", boolean>;
    readonly requireAsteriskPosition: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "right" | "left", unknown, "left", boolean>;
    readonly labelWidth: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
    readonly labelSuffix: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    readonly inline: BooleanConstructor;
    readonly inlineMessage: BooleanConstructor;
    readonly statusIcon: BooleanConstructor;
    readonly showMessage: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly validateOnRuleChange: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly hideRequiredAsterisk: BooleanConstructor;
    readonly scrollToError: BooleanConstructor;
    readonly scrollIntoViewOptions: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<readonly [ObjectConstructor, BooleanConstructor], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly size: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly disabled: BooleanConstructor;
}, {
    COMPONENT_NAME: string;
    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
        readonly model: ObjectConstructor;
        readonly rules: {
            readonly type: import("vue").PropType<Partial<Record<string, import("element-plus/es/utils").Arrayable<import("./src/types").FormItemRule>>>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly labelPosition: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "top" | "right" | "left", unknown, "right", boolean>;
        readonly requireAsteriskPosition: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "right" | "left", unknown, "left", boolean>;
        readonly labelWidth: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
        readonly labelSuffix: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
        readonly inline: BooleanConstructor;
        readonly inlineMessage: BooleanConstructor;
        readonly statusIcon: BooleanConstructor;
        readonly showMessage: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly validateOnRuleChange: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly hideRequiredAsterisk: BooleanConstructor;
        readonly scrollToError: BooleanConstructor;
        readonly scrollIntoViewOptions: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<readonly [ObjectConstructor, BooleanConstructor], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly size: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly disabled: BooleanConstructor;
    }>> & {
        onValidate?: ((prop: import("./src/form-item").FormItemProp, isValid: boolean, message: string) => any) | undefined;
    }>>;
    emit: (event: "validate", prop: import("./src/form-item").FormItemProp, isValid: boolean, message: string) => void;
    fields: import("./src/types").FormItemContext[];
    formSize: import("vue").ComputedRef<"" | "default" | "small" | "large">;
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
    formClasses: import("vue").ComputedRef<(string | {
        [x: string]: boolean | import("element-plus/es/utils").EpPropMergeType<StringConstructor, "top" | "right" | "left", unknown>;
    })[]>;
    addField: (field: import("./src/types").FormItemContext) => void;
    removeField: (field: import("./src/types").FormItemContext) => void;
    resetFields: (props?: import("element-plus/es/utils").Arrayable<import("./src/form-item").FormItemProp> | undefined) => void;
    clearValidate: (props?: import("element-plus/es/utils").Arrayable<import("./src/form-item").FormItemProp> | undefined) => void;
    isValidatable: import("vue").ComputedRef<boolean>;
    obtainValidateFields: (props: import("element-plus/es/utils").Arrayable<import("./src/form-item").FormItemProp>) => import("./src/types").FormItemContext[];
    validate: (callback?: import("./src/types").FormValidateCallback | undefined) => import("./src/types").FormValidationResult;
    doValidateField: (props?: import("element-plus/es/utils").Arrayable<import("./src/form-item").FormItemProp>) => Promise<boolean>;
    validateField: (props?: import("element-plus/es/utils").Arrayable<import("./src/form-item").FormItemProp> | undefined, callback?: import("./src/types").FormValidateCallback | undefined) => import("./src/types").FormValidationResult;
    scrollToField: (prop: import("./src/form-item").FormItemProp) => void;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    validate: (prop: import("./src/form-item").FormItemProp, isValid: boolean, message: string) => boolean;
}, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
    readonly model: ObjectConstructor;
    readonly rules: {
        readonly type: import("vue").PropType<Partial<Record<string, import("element-plus/es/utils").Arrayable<import("./src/types").FormItemRule>>>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly labelPosition: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "top" | "right" | "left", unknown, "right", boolean>;
    readonly requireAsteriskPosition: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "right" | "left", unknown, "left", boolean>;
    readonly labelWidth: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
    readonly labelSuffix: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    readonly inline: BooleanConstructor;
    readonly inlineMessage: BooleanConstructor;
    readonly statusIcon: BooleanConstructor;
    readonly showMessage: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly validateOnRuleChange: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly hideRequiredAsterisk: BooleanConstructor;
    readonly scrollToError: BooleanConstructor;
    readonly scrollIntoViewOptions: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<readonly [ObjectConstructor, BooleanConstructor], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly size: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly disabled: BooleanConstructor;
}>> & {
    onValidate?: ((prop: import("./src/form-item").FormItemProp, isValid: boolean, message: string) => any) | undefined;
}, {
    readonly disabled: boolean;
    readonly labelPosition: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "top" | "right" | "left", unknown>;
    readonly requireAsteriskPosition: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "right" | "left", unknown>;
    readonly labelWidth: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
    readonly labelSuffix: string;
    readonly showMessage: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    readonly validateOnRuleChange: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    readonly inline: boolean;
    readonly inlineMessage: boolean;
    readonly statusIcon: boolean;
    readonly hideRequiredAsterisk: boolean;
    readonly scrollToError: boolean;
}>> & {
    FormItem: import("vue").DefineComponent<{
        readonly label: StringConstructor;
        readonly labelWidth: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
        readonly prop: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("./src/form-item").FormItemProp & {}) | (() => import("./src/form-item").FormItemProp) | ((new (...args: any[]) => import("./src/form-item").FormItemProp & {}) | (() => import("./src/form-item").FormItemProp))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly required: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, undefined, boolean>;
        readonly rules: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("./src/types").FormItemRule | import("./src/types").FormItemRule[]) | (() => import("element-plus/es/utils").Arrayable<import("./src/types").FormItemRule>) | ((new (...args: any[]) => import("./src/types").FormItemRule | import("./src/types").FormItemRule[]) | (() => import("element-plus/es/utils").Arrayable<import("./src/types").FormItemRule>))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly error: StringConstructor;
        readonly validateStatus: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "error" | "success" | "validating", unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly for: StringConstructor;
        readonly inlineMessage: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, BooleanConstructor], unknown, unknown, "", boolean>;
        readonly showMessage: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly size: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
    }, {
        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
            readonly label: StringConstructor;
            readonly labelWidth: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
            readonly prop: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("./src/form-item").FormItemProp & {}) | (() => import("./src/form-item").FormItemProp) | ((new (...args: any[]) => import("./src/form-item").FormItemProp & {}) | (() => import("./src/form-item").FormItemProp))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly required: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, undefined, boolean>;
            readonly rules: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("./src/types").FormItemRule | import("./src/types").FormItemRule[]) | (() => import("element-plus/es/utils").Arrayable<import("./src/types").FormItemRule>) | ((new (...args: any[]) => import("./src/types").FormItemRule | import("./src/types").FormItemRule[]) | (() => import("element-plus/es/utils").Arrayable<import("./src/types").FormItemRule>))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly error: StringConstructor;
            readonly validateStatus: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "error" | "success" | "validating", unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly for: StringConstructor;
            readonly inlineMessage: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, BooleanConstructor], unknown, unknown, "", boolean>;
            readonly showMessage: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly size: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
        }>> & {
            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
        }>>;
        slots: Readonly<{
            [name: string]: import("vue").Slot | undefined;
        }>;
        formContext: import("./src/types").FormContext | undefined;
        parentFormItemContext: import("./src/types").FormItemContext | undefined;
        _size: import("vue").ComputedRef<"" | "default" | "small" | "large">;
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
        labelId: string;
        inputIds: import("vue").Ref<string[]>;
        validateState: import("vue").Ref<"" | "error" | "success" | "validating">;
        validateStateDebounced: Readonly<import("vue").Ref<"" | "error" | "success" | "validating">>;
        validateMessage: import("vue").Ref<string>;
        formItemRef: import("vue").Ref<HTMLDivElement | undefined>;
        initialValue: any;
        isResettingField: boolean;
        labelStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
        contentStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
        formItemClasses: import("vue").ComputedRef<(string | {
            [x: string]: boolean | undefined;
        })[]>;
        _inlineMessage: import("vue").ComputedRef<boolean>;
        validateClasses: import("vue").ComputedRef<(string | {
            [x: string]: boolean;
        })[]>;
        propString: import("vue").ComputedRef<string>;
        hasLabel: import("vue").ComputedRef<boolean>;
        labelFor: import("vue").ComputedRef<string | undefined>;
        isGroup: import("vue").ComputedRef<boolean>;
        isNested: boolean;
        fieldValue: import("vue").ComputedRef<any>;
        normalizedRules: import("vue").ComputedRef<import("./src/types").FormItemRule[]>;
        validateEnabled: import("vue").ComputedRef<boolean>;
        getFilteredRule: (trigger: string) => import("async-validator").RuleItem[];
        isRequired: import("vue").ComputedRef<boolean>;
        shouldShowError: import("vue").ComputedRef<import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>>;
        currentLabel: import("vue").ComputedRef<string>;
        setValidationState: (state: "" | "error" | "success" | "validating") => void;
        onValidationFailed: (error: import("./src/types").FormValidateFailure) => void;
        onValidationSucceeded: () => void;
        doValidate: (rules: import("async-validator").RuleItem[]) => Promise<true>;
        validate: (trigger: string, callback?: import("./src/types").FormValidateCallback | undefined) => import("./src/types").FormValidationResult;
        clearValidate: () => void;
        resetField: () => void;
        addInputId: (id: string) => void;
        removeInputId: (id: string) => void;
        context: import("./src/types").FormItemContext;
        FormLabelWrap: import("vue").DefineComponent<{
            isAutoWidth: BooleanConstructor;
            updateAll: BooleanConstructor;
        }, () => JSX.Element | null, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
            isAutoWidth: BooleanConstructor;
            updateAll: BooleanConstructor;
        }>>, {
            isAutoWidth: boolean;
            updateAll: boolean;
        }>;
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
        readonly label: StringConstructor;
        readonly labelWidth: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
        readonly prop: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("./src/form-item").FormItemProp & {}) | (() => import("./src/form-item").FormItemProp) | ((new (...args: any[]) => import("./src/form-item").FormItemProp & {}) | (() => import("./src/form-item").FormItemProp))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly required: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, undefined, boolean>;
        readonly rules: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("./src/types").FormItemRule | import("./src/types").FormItemRule[]) | (() => import("element-plus/es/utils").Arrayable<import("./src/types").FormItemRule>) | ((new (...args: any[]) => import("./src/types").FormItemRule | import("./src/types").FormItemRule[]) | (() => import("element-plus/es/utils").Arrayable<import("./src/types").FormItemRule>))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly error: StringConstructor;
        readonly validateStatus: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "error" | "success" | "validating", unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly for: StringConstructor;
        readonly inlineMessage: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, BooleanConstructor], unknown, unknown, "", boolean>;
        readonly showMessage: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly size: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
    }>>, {
        readonly required: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        readonly labelWidth: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
        readonly showMessage: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        readonly inlineMessage: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, BooleanConstructor], unknown, unknown>;
    }>;
};
export default ElForm;
export declare const ElFormItem: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
    readonly label: StringConstructor;
    readonly labelWidth: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
    readonly prop: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("./src/form-item").FormItemProp & {}) | (() => import("./src/form-item").FormItemProp) | ((new (...args: any[]) => import("./src/form-item").FormItemProp & {}) | (() => import("./src/form-item").FormItemProp))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly required: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, undefined, boolean>;
    readonly rules: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("./src/types").FormItemRule | import("./src/types").FormItemRule[]) | (() => import("element-plus/es/utils").Arrayable<import("./src/types").FormItemRule>) | ((new (...args: any[]) => import("./src/types").FormItemRule | import("./src/types").FormItemRule[]) | (() => import("element-plus/es/utils").Arrayable<import("./src/types").FormItemRule>))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly error: StringConstructor;
    readonly validateStatus: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "error" | "success" | "validating", unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly for: StringConstructor;
    readonly inlineMessage: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, BooleanConstructor], unknown, unknown, "", boolean>;
    readonly showMessage: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly size: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
}, {
    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
        readonly label: StringConstructor;
        readonly labelWidth: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
        readonly prop: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("./src/form-item").FormItemProp & {}) | (() => import("./src/form-item").FormItemProp) | ((new (...args: any[]) => import("./src/form-item").FormItemProp & {}) | (() => import("./src/form-item").FormItemProp))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly required: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, undefined, boolean>;
        readonly rules: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("./src/types").FormItemRule | import("./src/types").FormItemRule[]) | (() => import("element-plus/es/utils").Arrayable<import("./src/types").FormItemRule>) | ((new (...args: any[]) => import("./src/types").FormItemRule | import("./src/types").FormItemRule[]) | (() => import("element-plus/es/utils").Arrayable<import("./src/types").FormItemRule>))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly error: StringConstructor;
        readonly validateStatus: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "error" | "success" | "validating", unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly for: StringConstructor;
        readonly inlineMessage: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, BooleanConstructor], unknown, unknown, "", boolean>;
        readonly showMessage: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly size: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
    }>> & {
        [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
    }>>;
    slots: Readonly<{
        [name: string]: import("vue").Slot | undefined;
    }>;
    formContext: import("./src/types").FormContext | undefined;
    parentFormItemContext: import("./src/types").FormItemContext | undefined;
    _size: import("vue").ComputedRef<"" | "default" | "small" | "large">;
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
    labelId: string;
    inputIds: import("vue").Ref<string[]>;
    validateState: import("vue").Ref<"" | "error" | "success" | "validating">;
    validateStateDebounced: Readonly<import("vue").Ref<"" | "error" | "success" | "validating">>;
    validateMessage: import("vue").Ref<string>;
    formItemRef: import("vue").Ref<HTMLDivElement | undefined>;
    initialValue: any;
    isResettingField: boolean;
    labelStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
    contentStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
    formItemClasses: import("vue").ComputedRef<(string | {
        [x: string]: boolean | undefined;
    })[]>;
    _inlineMessage: import("vue").ComputedRef<boolean>;
    validateClasses: import("vue").ComputedRef<(string | {
        [x: string]: boolean;
    })[]>;
    propString: import("vue").ComputedRef<string>;
    hasLabel: import("vue").ComputedRef<boolean>;
    labelFor: import("vue").ComputedRef<string | undefined>;
    isGroup: import("vue").ComputedRef<boolean>;
    isNested: boolean;
    fieldValue: import("vue").ComputedRef<any>;
    normalizedRules: import("vue").ComputedRef<import("./src/types").FormItemRule[]>;
    validateEnabled: import("vue").ComputedRef<boolean>;
    getFilteredRule: (trigger: string) => import("async-validator").RuleItem[];
    isRequired: import("vue").ComputedRef<boolean>;
    shouldShowError: import("vue").ComputedRef<import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>>;
    currentLabel: import("vue").ComputedRef<string>;
    setValidationState: (state: "" | "error" | "success" | "validating") => void;
    onValidationFailed: (error: import("./src/types").FormValidateFailure) => void;
    onValidationSucceeded: () => void;
    doValidate: (rules: import("async-validator").RuleItem[]) => Promise<true>;
    validate: (trigger: string, callback?: import("./src/types").FormValidateCallback | undefined) => import("./src/types").FormValidationResult;
    clearValidate: () => void;
    resetField: () => void;
    addInputId: (id: string) => void;
    removeInputId: (id: string) => void;
    context: import("./src/types").FormItemContext;
    FormLabelWrap: import("vue").DefineComponent<{
        isAutoWidth: BooleanConstructor;
        updateAll: BooleanConstructor;
    }, () => JSX.Element | null, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
        isAutoWidth: BooleanConstructor;
        updateAll: BooleanConstructor;
    }>>, {
        isAutoWidth: boolean;
        updateAll: boolean;
    }>;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
    readonly label: StringConstructor;
    readonly labelWidth: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
    readonly prop: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("./src/form-item").FormItemProp & {}) | (() => import("./src/form-item").FormItemProp) | ((new (...args: any[]) => import("./src/form-item").FormItemProp & {}) | (() => import("./src/form-item").FormItemProp))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly required: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, undefined, boolean>;
    readonly rules: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("./src/types").FormItemRule | import("./src/types").FormItemRule[]) | (() => import("element-plus/es/utils").Arrayable<import("./src/types").FormItemRule>) | ((new (...args: any[]) => import("./src/types").FormItemRule | import("./src/types").FormItemRule[]) | (() => import("element-plus/es/utils").Arrayable<import("./src/types").FormItemRule>))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly error: StringConstructor;
    readonly validateStatus: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "error" | "success" | "validating", unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly for: StringConstructor;
    readonly inlineMessage: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, BooleanConstructor], unknown, unknown, "", boolean>;
    readonly showMessage: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly size: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
}>>, {
    readonly required: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    readonly labelWidth: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
    readonly showMessage: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    readonly inlineMessage: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, BooleanConstructor], unknown, unknown>;
}>>;
export * from './src/form';
export * from './src/form-item';
export * from './src/types';
export * from './src/constants';
export * from './src/hooks';
export declare type FormInstance = InstanceType<typeof Form>;
export declare type FormItemInstance = InstanceType<typeof FormItem>;
