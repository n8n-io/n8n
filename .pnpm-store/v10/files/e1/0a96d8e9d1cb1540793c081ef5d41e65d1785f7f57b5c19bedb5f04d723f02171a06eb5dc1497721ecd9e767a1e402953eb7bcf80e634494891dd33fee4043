import { z } from "zod";
import { ZepDataType } from "./base";
import { HasOptionalValue } from "./index";
export declare const ZepRegexSchema: z.ZodObject<z.objectUtil.extendShape<{
    zep_type: z.ZodNativeEnum<typeof ZepDataType>;
    description: z.ZodString;
}, {
    zep_type: z.ZodLiteral<ZepDataType.ZepRegex>;
    value: z.ZodOptional<z.ZodString>;
    pattern: z.ZodEffects<z.ZodString, string, string>;
    default: z.ZodOptional<z.ZodString>;
}>, "strip", z.ZodTypeAny, {
    description: string;
    zep_type: ZepDataType.ZepRegex;
    pattern: string;
    value?: string | undefined;
    default?: string | undefined;
}, {
    description: string;
    zep_type: ZepDataType.ZepRegex;
    pattern: string;
    value?: string | undefined;
    default?: string | undefined;
}>;
export interface ZepRegexField extends HasOptionalValue<string> {
    zep_type: ZepDataType.ZepRegex;
    description: string;
    pattern: string;
}
export declare const zepRegexField: (description: string, pattern: RegExp) => ZepRegexField;
