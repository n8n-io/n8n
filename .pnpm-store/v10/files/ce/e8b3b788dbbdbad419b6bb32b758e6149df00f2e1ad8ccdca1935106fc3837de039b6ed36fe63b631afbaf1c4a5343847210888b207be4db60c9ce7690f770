import { Message } from './types';
export interface MixedLocale {
    default?: Message;
    required?: Message;
    oneOf?: Message<{
        values: any;
    }>;
    notOneOf?: Message<{
        values: any;
    }>;
    notType?: Message;
    defined?: Message;
}
export interface StringLocale {
    length?: Message<{
        length: number;
    }>;
    min?: Message<{
        min: number;
    }>;
    max?: Message<{
        max: number;
    }>;
    matches?: Message<{
        regex: RegExp;
    }>;
    email?: Message<{
        regex: RegExp;
    }>;
    url?: Message<{
        regex: RegExp;
    }>;
    uuid?: Message<{
        regex: RegExp;
    }>;
    trim?: Message;
    lowercase?: Message;
    uppercase?: Message;
}
export interface NumberLocale {
    min?: Message<{
        min: number;
    }>;
    max?: Message<{
        max: number;
    }>;
    lessThan?: Message<{
        less: number;
    }>;
    moreThan?: Message<{
        more: number;
    }>;
    positive?: Message<{
        more: number;
    }>;
    negative?: Message<{
        less: number;
    }>;
    integer?: Message;
}
export interface DateLocale {
    min?: Message<{
        min: Date | string;
    }>;
    max?: Message<{
        max: Date | string;
    }>;
}
export interface ObjectLocale {
    noUnknown?: Message;
}
export interface ArrayLocale {
    length?: Message<{
        length: number;
    }>;
    min?: Message<{
        min: number;
    }>;
    max?: Message<{
        max: number;
    }>;
}
export interface BooleanLocale {
    isValue?: Message;
}
export interface LocaleObject {
    mixed?: MixedLocale;
    string?: StringLocale;
    number?: NumberLocale;
    date?: DateLocale;
    boolean?: BooleanLocale;
    object?: ObjectLocale;
    array?: ArrayLocale;
}
export declare let mixed: Required<MixedLocale>;
export declare let string: Required<StringLocale>;
export declare let number: Required<NumberLocale>;
export declare let date: Required<DateLocale>;
export declare let boolean: BooleanLocale;
export declare let object: Required<ObjectLocale>;
export declare let array: Required<ArrayLocale>;
declare const _default: any;
export default _default;
