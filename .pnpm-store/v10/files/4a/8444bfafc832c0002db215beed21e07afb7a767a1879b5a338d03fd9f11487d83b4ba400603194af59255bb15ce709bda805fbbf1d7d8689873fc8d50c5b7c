import { z } from "zod";
import { ZepDataType } from "./base";
import { HasOptionalValue } from "./index";
export declare const ZepTextSchema: z.ZodObject<z.objectUtil.extendShape<{
    zep_type: z.ZodNativeEnum<typeof ZepDataType>;
    description: z.ZodString;
}, {
    zep_type: z.ZodUnion<[z.ZodLiteral<ZepDataType.ZepText>, z.ZodLiteral<ZepDataType.ZepZipCode>, z.ZodLiteral<ZepDataType.ZepEmail>, z.ZodLiteral<ZepDataType.ZepPhoneNumber>]>;
    value: z.ZodOptional<z.ZodString>;
    default: z.ZodOptional<z.ZodString>;
}>, "strip", z.ZodTypeAny, {
    description: string;
    zep_type: ZepDataType.ZepText | ZepDataType.ZepZipCode | ZepDataType.ZepEmail | ZepDataType.ZepPhoneNumber;
    value?: string | undefined;
    default?: string | undefined;
}, {
    description: string;
    zep_type: ZepDataType.ZepText | ZepDataType.ZepZipCode | ZepDataType.ZepEmail | ZepDataType.ZepPhoneNumber;
    value?: string | undefined;
    default?: string | undefined;
}>;
export interface ZepTextField extends HasOptionalValue<string> {
    zep_type: ZepDataType.ZepText | ZepDataType.ZepZipCode | ZepDataType.ZepEmail | ZepDataType.ZepPhoneNumber;
    description: string;
}
export declare const zepTextField: (description: string) => ZepTextField;
export declare const zepZipcodeField: (description: string) => ZepTextField;
export declare const zepPhoneNumberField: (description: string) => ZepTextField;
export declare const zepEmailField: (description: string) => ZepTextField;
