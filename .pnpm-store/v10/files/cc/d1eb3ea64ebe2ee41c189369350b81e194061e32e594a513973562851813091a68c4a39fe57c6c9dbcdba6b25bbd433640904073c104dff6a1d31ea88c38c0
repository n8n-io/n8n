import type { CSSProperties } from 'vue';
import type { RuleItem } from 'async-validator';
import type { Arrayable } from 'element-plus/es/utils';
import type { FormItemContext, FormItemRule, FormValidateFailure } from './types';
import type { FormItemValidateState } from './form-item';
declare const _default: import("vue").DefineComponent<{
    readonly label: StringConstructor;
    readonly labelWidth: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
    readonly prop: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("./form-item").FormItemProp & {}) | (() => import("./form-item").FormItemProp) | ((new (...args: any[]) => import("./form-item").FormItemProp & {}) | (() => import("./form-item").FormItemProp))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly required: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, undefined, boolean>;
    readonly rules: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => FormItemRule | FormItemRule[]) | (() => Arrayable<FormItemRule>) | ((new (...args: any[]) => FormItemRule | FormItemRule[]) | (() => Arrayable<FormItemRule>))[], unknown, unknown>>;
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
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("./form-item").FormItemProp & {}) | (() => import("./form-item").FormItemProp) | ((new (...args: any[]) => import("./form-item").FormItemProp & {}) | (() => import("./form-item").FormItemProp))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly required: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, undefined, boolean>;
        readonly rules: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => FormItemRule | FormItemRule[]) | (() => Arrayable<FormItemRule>) | ((new (...args: any[]) => FormItemRule | FormItemRule[]) | (() => Arrayable<FormItemRule>))[], unknown, unknown>>;
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
    formContext: import("./types").FormContext | undefined;
    parentFormItemContext: FormItemContext | undefined;
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
    labelStyle: import("vue").ComputedRef<CSSProperties>;
    contentStyle: import("vue").ComputedRef<CSSProperties>;
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
    normalizedRules: import("vue").ComputedRef<FormItemRule[]>;
    validateEnabled: import("vue").ComputedRef<boolean>;
    getFilteredRule: (trigger: string) => RuleItem[];
    isRequired: import("vue").ComputedRef<boolean>;
    shouldShowError: import("vue").ComputedRef<import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>>;
    currentLabel: import("vue").ComputedRef<string>;
    setValidationState: (state: FormItemValidateState) => void;
    onValidationFailed: (error: FormValidateFailure) => void;
    onValidationSucceeded: () => void;
    doValidate: (rules: RuleItem[]) => Promise<true>;
    validate: (trigger: string, callback?: import("./types").FormValidateCallback | undefined) => import("./types").FormValidationResult;
    clearValidate: () => void;
    resetField: () => void;
    addInputId: (id: string) => void;
    removeInputId: (id: string) => void;
    context: FormItemContext;
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
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("./form-item").FormItemProp & {}) | (() => import("./form-item").FormItemProp) | ((new (...args: any[]) => import("./form-item").FormItemProp & {}) | (() => import("./form-item").FormItemProp))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly required: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, undefined, boolean>;
    readonly rules: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => FormItemRule | FormItemRule[]) | (() => Arrayable<FormItemRule>) | ((new (...args: any[]) => FormItemRule | FormItemRule[]) | (() => Arrayable<FormItemRule>))[], unknown, unknown>>;
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
export default _default;
