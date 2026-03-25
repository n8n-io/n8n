import { z } from "zod";
import { ZepDateField } from "./date";
import { ZepNumberField } from "./number";
import { ZepTextField } from "./text";
import { ZepRegexField } from "./regex";
export declare const DataExtractorFields: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodObject<z.objectUtil.extendShape<{
    zep_type: z.ZodNativeEnum<typeof import("./base").ZepDataType>;
    description: z.ZodString;
}, {
    zep_type: z.ZodUnion<[z.ZodLiteral<import("./base").ZepDataType.ZepNumber>, z.ZodLiteral<import("./base").ZepDataType.ZepFloat>]>;
    value: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, number, string | number>>;
    default: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, number, string | number>>;
}>, "strip", z.ZodTypeAny, {
    description: string;
    zep_type: import("./base").ZepDataType.ZepFloat | import("./base").ZepDataType.ZepNumber;
    value?: number | undefined;
    default?: number | undefined;
}, {
    description: string;
    zep_type: import("./base").ZepDataType.ZepFloat | import("./base").ZepDataType.ZepNumber;
    value?: string | number | undefined;
    default?: string | number | undefined;
}>, z.ZodObject<z.objectUtil.extendShape<{
    zep_type: z.ZodNativeEnum<typeof import("./base").ZepDataType>;
    description: z.ZodString;
}, {
    zep_type: z.ZodUnion<[z.ZodLiteral<import("./base").ZepDataType.ZepText>, z.ZodLiteral<import("./base").ZepDataType.ZepZipCode>, z.ZodLiteral<import("./base").ZepDataType.ZepEmail>, z.ZodLiteral<import("./base").ZepDataType.ZepPhoneNumber>]>;
    value: z.ZodOptional<z.ZodString>;
    default: z.ZodOptional<z.ZodString>;
}>, "strip", z.ZodTypeAny, {
    description: string;
    zep_type: import("./base").ZepDataType.ZepText | import("./base").ZepDataType.ZepZipCode | import("./base").ZepDataType.ZepEmail | import("./base").ZepDataType.ZepPhoneNumber;
    value?: string | undefined;
    default?: string | undefined;
}, {
    description: string;
    zep_type: import("./base").ZepDataType.ZepText | import("./base").ZepDataType.ZepZipCode | import("./base").ZepDataType.ZepEmail | import("./base").ZepDataType.ZepPhoneNumber;
    value?: string | undefined;
    default?: string | undefined;
}>, z.ZodObject<z.objectUtil.extendShape<{
    zep_type: z.ZodNativeEnum<typeof import("./base").ZepDataType>;
    description: z.ZodString;
}, {
    zep_type: z.ZodUnion<[z.ZodLiteral<import("./base").ZepDataType.ZepDate>, z.ZodLiteral<import("./base").ZepDataType.ZepDateTime>]>;
    value: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
}>, "strip", z.ZodTypeAny, {
    description: string;
    zep_type: import("./base").ZepDataType.ZepDate | import("./base").ZepDataType.ZepDateTime;
    value?: Date | undefined;
}, {
    description: string;
    zep_type: import("./base").ZepDataType.ZepDate | import("./base").ZepDataType.ZepDateTime;
    value?: string | Date | undefined;
}>, z.ZodObject<z.objectUtil.extendShape<{
    zep_type: z.ZodNativeEnum<typeof import("./base").ZepDataType>;
    description: z.ZodString;
}, {
    zep_type: z.ZodLiteral<import("./base").ZepDataType.ZepRegex>;
    value: z.ZodOptional<z.ZodString>;
    pattern: z.ZodEffects<z.ZodString, string, string>;
    default: z.ZodOptional<z.ZodString>;
}>, "strip", z.ZodTypeAny, {
    description: string;
    zep_type: import("./base").ZepDataType.ZepRegex;
    pattern: string;
    value?: string | undefined;
    default?: string | undefined;
}, {
    description: string;
    zep_type: import("./base").ZepDataType.ZepRegex;
    pattern: string;
    value?: string | undefined;
    default?: string | undefined;
}>]>>;
export declare type SupportedZepField = ZepNumberField | ZepDateField | ZepRegexField | ZepTextField;
export interface HasOptionalValue<V = any> {
    value?: V;
}
/**
 * Extracts the data types from the fields defined in the schema T. Each field in T
 * is expected to conform to the HasOptionalValue interface, which optionally includes
 * a 'value' of type V. This type definition maps each field in T to its corresponding
 * 'value' type, but since 'value' is optional, the resulting type for each field also
 * includes 'undefined'.
 *
 * @template T - The schema object from which to extract data types. Each property of T
 *               should implement the HasOptionalValue interface.
 *
 * @returns An object type with the same keys as T, but where the type of each key is
 *          either the type of 'value' in the corresponding field of T or 'undefined'
 *          if 'value' is optional.
 *
 * @example
 * ```
 * interface PersonSchema {
 *   name: HasOptionalValue<string>; // ZepTextField
 *   age: HasOptionalValue<number>; // ZepNumberField
 * }
 *
 * type PersonData = ExtractedData<PersonSchema>;
 * // PersonData would be equivalent to:
 * // { name: string | undefined; age: number | undefined; }
 * ```
 * This example demonstrates how `ExtractedData` would transform a hypothetical `PersonSchema`
 * into `PersonData`, clarifying how the types are derived and what to expect in the output.
 */
export declare type ExtractedData<T> = {
    [P in keyof T]: T[P] extends HasOptionalValue<infer V> ? V | undefined : never;
};
export declare const schemas: {
    ZepNumber: z.ZodObject<z.objectUtil.extendShape<{
        zep_type: z.ZodNativeEnum<typeof import("./base").ZepDataType>;
        description: z.ZodString;
    }, {
        zep_type: z.ZodUnion<[z.ZodLiteral<import("./base").ZepDataType.ZepNumber>, z.ZodLiteral<import("./base").ZepDataType.ZepFloat>]>;
        value: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, number, string | number>>;
        default: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, number, string | number>>;
    }>, "strip", z.ZodTypeAny, {
        description: string;
        zep_type: import("./base").ZepDataType.ZepFloat | import("./base").ZepDataType.ZepNumber;
        value?: number | undefined;
        default?: number | undefined;
    }, {
        description: string;
        zep_type: import("./base").ZepDataType.ZepFloat | import("./base").ZepDataType.ZepNumber;
        value?: string | number | undefined;
        default?: string | number | undefined;
    }>;
    ZepText: z.ZodObject<z.objectUtil.extendShape<{
        zep_type: z.ZodNativeEnum<typeof import("./base").ZepDataType>;
        description: z.ZodString;
    }, {
        zep_type: z.ZodUnion<[z.ZodLiteral<import("./base").ZepDataType.ZepText>, z.ZodLiteral<import("./base").ZepDataType.ZepZipCode>, z.ZodLiteral<import("./base").ZepDataType.ZepEmail>, z.ZodLiteral<import("./base").ZepDataType.ZepPhoneNumber>]>;
        value: z.ZodOptional<z.ZodString>;
        default: z.ZodOptional<z.ZodString>;
    }>, "strip", z.ZodTypeAny, {
        description: string;
        zep_type: import("./base").ZepDataType.ZepText | import("./base").ZepDataType.ZepZipCode | import("./base").ZepDataType.ZepEmail | import("./base").ZepDataType.ZepPhoneNumber;
        value?: string | undefined;
        default?: string | undefined;
    }, {
        description: string;
        zep_type: import("./base").ZepDataType.ZepText | import("./base").ZepDataType.ZepZipCode | import("./base").ZepDataType.ZepEmail | import("./base").ZepDataType.ZepPhoneNumber;
        value?: string | undefined;
        default?: string | undefined;
    }>;
    ZepZipCode: z.ZodObject<z.objectUtil.extendShape<{
        zep_type: z.ZodNativeEnum<typeof import("./base").ZepDataType>;
        description: z.ZodString;
    }, {
        zep_type: z.ZodUnion<[z.ZodLiteral<import("./base").ZepDataType.ZepText>, z.ZodLiteral<import("./base").ZepDataType.ZepZipCode>, z.ZodLiteral<import("./base").ZepDataType.ZepEmail>, z.ZodLiteral<import("./base").ZepDataType.ZepPhoneNumber>]>;
        value: z.ZodOptional<z.ZodString>;
        default: z.ZodOptional<z.ZodString>;
    }>, "strip", z.ZodTypeAny, {
        description: string;
        zep_type: import("./base").ZepDataType.ZepText | import("./base").ZepDataType.ZepZipCode | import("./base").ZepDataType.ZepEmail | import("./base").ZepDataType.ZepPhoneNumber;
        value?: string | undefined;
        default?: string | undefined;
    }, {
        description: string;
        zep_type: import("./base").ZepDataType.ZepText | import("./base").ZepDataType.ZepZipCode | import("./base").ZepDataType.ZepEmail | import("./base").ZepDataType.ZepPhoneNumber;
        value?: string | undefined;
        default?: string | undefined;
    }>;
    ZepDate: z.ZodObject<z.objectUtil.extendShape<{
        zep_type: z.ZodNativeEnum<typeof import("./base").ZepDataType>;
        description: z.ZodString;
    }, {
        zep_type: z.ZodUnion<[z.ZodLiteral<import("./base").ZepDataType.ZepDate>, z.ZodLiteral<import("./base").ZepDataType.ZepDateTime>]>;
        value: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
    }>, "strip", z.ZodTypeAny, {
        description: string;
        zep_type: import("./base").ZepDataType.ZepDate | import("./base").ZepDataType.ZepDateTime;
        value?: Date | undefined;
    }, {
        description: string;
        zep_type: import("./base").ZepDataType.ZepDate | import("./base").ZepDataType.ZepDateTime;
        value?: string | Date | undefined;
    }>;
    ZepDateTime: z.ZodObject<z.objectUtil.extendShape<{
        zep_type: z.ZodNativeEnum<typeof import("./base").ZepDataType>;
        description: z.ZodString;
    }, {
        zep_type: z.ZodUnion<[z.ZodLiteral<import("./base").ZepDataType.ZepDate>, z.ZodLiteral<import("./base").ZepDataType.ZepDateTime>]>;
        value: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
    }>, "strip", z.ZodTypeAny, {
        description: string;
        zep_type: import("./base").ZepDataType.ZepDate | import("./base").ZepDataType.ZepDateTime;
        value?: Date | undefined;
    }, {
        description: string;
        zep_type: import("./base").ZepDataType.ZepDate | import("./base").ZepDataType.ZepDateTime;
        value?: string | Date | undefined;
    }>;
    ZepEmail: z.ZodObject<z.objectUtil.extendShape<{
        zep_type: z.ZodNativeEnum<typeof import("./base").ZepDataType>;
        description: z.ZodString;
    }, {
        zep_type: z.ZodUnion<[z.ZodLiteral<import("./base").ZepDataType.ZepText>, z.ZodLiteral<import("./base").ZepDataType.ZepZipCode>, z.ZodLiteral<import("./base").ZepDataType.ZepEmail>, z.ZodLiteral<import("./base").ZepDataType.ZepPhoneNumber>]>;
        value: z.ZodOptional<z.ZodString>;
        default: z.ZodOptional<z.ZodString>;
    }>, "strip", z.ZodTypeAny, {
        description: string;
        zep_type: import("./base").ZepDataType.ZepText | import("./base").ZepDataType.ZepZipCode | import("./base").ZepDataType.ZepEmail | import("./base").ZepDataType.ZepPhoneNumber;
        value?: string | undefined;
        default?: string | undefined;
    }, {
        description: string;
        zep_type: import("./base").ZepDataType.ZepText | import("./base").ZepDataType.ZepZipCode | import("./base").ZepDataType.ZepEmail | import("./base").ZepDataType.ZepPhoneNumber;
        value?: string | undefined;
        default?: string | undefined;
    }>;
    ZepPhoneNumber: z.ZodObject<z.objectUtil.extendShape<{
        zep_type: z.ZodNativeEnum<typeof import("./base").ZepDataType>;
        description: z.ZodString;
    }, {
        zep_type: z.ZodUnion<[z.ZodLiteral<import("./base").ZepDataType.ZepText>, z.ZodLiteral<import("./base").ZepDataType.ZepZipCode>, z.ZodLiteral<import("./base").ZepDataType.ZepEmail>, z.ZodLiteral<import("./base").ZepDataType.ZepPhoneNumber>]>;
        value: z.ZodOptional<z.ZodString>;
        default: z.ZodOptional<z.ZodString>;
    }>, "strip", z.ZodTypeAny, {
        description: string;
        zep_type: import("./base").ZepDataType.ZepText | import("./base").ZepDataType.ZepZipCode | import("./base").ZepDataType.ZepEmail | import("./base").ZepDataType.ZepPhoneNumber;
        value?: string | undefined;
        default?: string | undefined;
    }, {
        description: string;
        zep_type: import("./base").ZepDataType.ZepText | import("./base").ZepDataType.ZepZipCode | import("./base").ZepDataType.ZepEmail | import("./base").ZepDataType.ZepPhoneNumber;
        value?: string | undefined;
        default?: string | undefined;
    }>;
    ZepFloat: z.ZodObject<z.objectUtil.extendShape<{
        zep_type: z.ZodNativeEnum<typeof import("./base").ZepDataType>;
        description: z.ZodString;
    }, {
        zep_type: z.ZodUnion<[z.ZodLiteral<import("./base").ZepDataType.ZepNumber>, z.ZodLiteral<import("./base").ZepDataType.ZepFloat>]>;
        value: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, number, string | number>>;
        default: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, number, string | number>>;
    }>, "strip", z.ZodTypeAny, {
        description: string;
        zep_type: import("./base").ZepDataType.ZepFloat | import("./base").ZepDataType.ZepNumber;
        value?: number | undefined;
        default?: number | undefined;
    }, {
        description: string;
        zep_type: import("./base").ZepDataType.ZepFloat | import("./base").ZepDataType.ZepNumber;
        value?: string | number | undefined;
        default?: string | number | undefined;
    }>;
    ZepRegex: z.ZodObject<z.objectUtil.extendShape<{
        zep_type: z.ZodNativeEnum<typeof import("./base").ZepDataType>;
        description: z.ZodString;
    }, {
        zep_type: z.ZodLiteral<import("./base").ZepDataType.ZepRegex>;
        value: z.ZodOptional<z.ZodString>;
        pattern: z.ZodEffects<z.ZodString, string, string>;
        default: z.ZodOptional<z.ZodString>;
    }>, "strip", z.ZodTypeAny, {
        description: string;
        zep_type: import("./base").ZepDataType.ZepRegex;
        pattern: string;
        value?: string | undefined;
        default?: string | undefined;
    }, {
        description: string;
        zep_type: import("./base").ZepDataType.ZepRegex;
        pattern: string;
        value?: string | undefined;
        default?: string | undefined;
    }>;
};
export declare const zepFields: {
    number: (description: string) => ZepNumberField;
    text: (description: string) => ZepTextField;
    zipCode: (description: string) => ZepTextField;
    date: (description: string) => ZepDateField;
    dateTime: (description: string) => ZepDateField;
    email: (description: string) => ZepTextField;
    phoneNumber: (description: string) => ZepTextField;
    float: (description: string) => ZepNumberField;
    regex: (description: string, pattern: RegExp) => ZepRegexField;
};
