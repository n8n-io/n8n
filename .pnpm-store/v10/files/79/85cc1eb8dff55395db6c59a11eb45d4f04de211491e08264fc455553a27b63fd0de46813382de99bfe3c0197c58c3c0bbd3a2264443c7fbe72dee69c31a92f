export declare type RuleType = 'string' | 'number' | 'boolean' | 'method' | 'regexp' | 'integer' | 'float' | 'array' | 'object' | 'enum' | 'date' | 'url' | 'hex' | 'email' | 'pattern' | 'any';
export interface ValidateOption {
    suppressWarning?: boolean;
    suppressValidatorError?: boolean;
    first?: boolean;
    firstFields?: boolean | string[];
    messages?: Partial<ValidateMessages>;
    /** The name of rules need to be trigger. Will validate all rules if leave empty */
    keys?: string[];
    error?: (rule: InternalRuleItem, message: string) => ValidateError;
}
export declare type SyncErrorType = Error | string;
export declare type SyncValidateResult = boolean | SyncErrorType | SyncErrorType[];
export declare type ValidateResult = void | Promise<void> | SyncValidateResult;
export interface RuleItem {
    type?: RuleType;
    required?: boolean;
    pattern?: RegExp | string;
    min?: number;
    max?: number;
    len?: number;
    enum?: Array<string | number | boolean | null | undefined>;
    whitespace?: boolean;
    fields?: Record<string, Rule>;
    options?: ValidateOption;
    defaultField?: Rule;
    transform?: (value: Value) => Value;
    message?: string | ((a?: string) => string);
    asyncValidator?: (rule: InternalRuleItem, value: Value, callback: (error?: string | Error) => void, source: Values, options: ValidateOption) => void | Promise<void>;
    validator?: (rule: InternalRuleItem, value: Value, callback: (error?: string | Error) => void, source: Values, options: ValidateOption) => SyncValidateResult | void;
}
export declare type Rule = RuleItem | RuleItem[];
export declare type Rules = Record<string, Rule>;
/**
 *  Rule for validating a value exists in an enumerable list.
 *
 *  @param rule The validation rule.
 *  @param value The value of the field on the source object.
 *  @param source The source object being validated.
 *  @param errors An array of errors that this rule may add
 *  validation errors to.
 *  @param options The validation options.
 *  @param options.messages The validation messages.
 *  @param type Rule type
 */
export declare type ExecuteRule = (rule: InternalRuleItem, value: Value, source: Values, errors: string[], options: ValidateOption, type?: string) => void;
/**
 *  Performs validation for any type.
 *
 *  @param rule The validation rule.
 *  @param value The value of the field on the source object.
 *  @param callback The callback function.
 *  @param source The source object being validated.
 *  @param options The validation options.
 *  @param options.messages The validation messages.
 */
export declare type ExecuteValidator = (rule: InternalRuleItem, value: Value, callback: (error?: string[]) => void, source: Values, options: ValidateOption) => void;
declare type ValidateMessage<T extends any[] = unknown[]> = string | ((...args: T) => string);
declare type FullField = string | undefined;
declare type EnumString = string | undefined;
declare type Pattern = string | RegExp | undefined;
declare type Range = number | undefined;
declare type Type = string | undefined;
export interface ValidateMessages {
    default?: ValidateMessage;
    required?: ValidateMessage<[FullField]>;
    enum?: ValidateMessage<[FullField, EnumString]>;
    whitespace?: ValidateMessage<[FullField]>;
    date?: {
        format?: ValidateMessage;
        parse?: ValidateMessage;
        invalid?: ValidateMessage;
    };
    types?: {
        string?: ValidateMessage<[FullField, Type]>;
        method?: ValidateMessage<[FullField, Type]>;
        array?: ValidateMessage<[FullField, Type]>;
        object?: ValidateMessage<[FullField, Type]>;
        number?: ValidateMessage<[FullField, Type]>;
        date?: ValidateMessage<[FullField, Type]>;
        boolean?: ValidateMessage<[FullField, Type]>;
        integer?: ValidateMessage<[FullField, Type]>;
        float?: ValidateMessage<[FullField, Type]>;
        regexp?: ValidateMessage<[FullField, Type]>;
        email?: ValidateMessage<[FullField, Type]>;
        url?: ValidateMessage<[FullField, Type]>;
        hex?: ValidateMessage<[FullField, Type]>;
    };
    string?: {
        len?: ValidateMessage<[FullField, Range]>;
        min?: ValidateMessage<[FullField, Range]>;
        max?: ValidateMessage<[FullField, Range]>;
        range?: ValidateMessage<[FullField, Range, Range]>;
    };
    number?: {
        len?: ValidateMessage<[FullField, Range]>;
        min?: ValidateMessage<[FullField, Range]>;
        max?: ValidateMessage<[FullField, Range]>;
        range?: ValidateMessage<[FullField, Range, Range]>;
    };
    array?: {
        len?: ValidateMessage<[FullField, Range]>;
        min?: ValidateMessage<[FullField, Range]>;
        max?: ValidateMessage<[FullField, Range]>;
        range?: ValidateMessage<[FullField, Range, Range]>;
    };
    pattern?: {
        mismatch?: ValidateMessage<[FullField, Value, Pattern]>;
    };
}
export interface InternalValidateMessages extends ValidateMessages {
    clone: () => InternalValidateMessages;
}
export declare type Value = any;
export declare type Values = Record<string, Value>;
export interface ValidateError {
    message?: string;
    fieldValue?: Value;
    field?: string;
}
export declare type ValidateFieldsError = Record<string, ValidateError[]>;
export declare type ValidateCallback = (errors: ValidateError[] | null, fields: ValidateFieldsError | Values) => void;
export interface RuleValuePackage {
    rule: InternalRuleItem;
    value: Value;
    source: Values;
    field: string;
}
export interface InternalRuleItem extends Omit<RuleItem, 'validator'> {
    field?: string;
    fullField?: string;
    fullFields?: string[];
    validator?: RuleItem['validator'] | ExecuteValidator;
}
export {};
