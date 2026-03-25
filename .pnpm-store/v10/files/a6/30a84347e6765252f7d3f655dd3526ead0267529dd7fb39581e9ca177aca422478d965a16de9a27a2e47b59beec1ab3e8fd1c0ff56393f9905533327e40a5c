import { z } from "zod";
import { ZepDataType } from "./base";
import { HasOptionalValue } from "./index";
export declare const ZepNumberSchema: z.ZodObject<z.objectUtil.extendShape<{
    zep_type: z.ZodNativeEnum<typeof ZepDataType>;
    description: z.ZodString;
}, {
    zep_type: z.ZodUnion<[z.ZodLiteral<ZepDataType.ZepNumber>, z.ZodLiteral<ZepDataType.ZepFloat>]>;
    value: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, number, string | number>>;
    default: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, number, string | number>>;
}>, "strip", z.ZodTypeAny, {
    description: string;
    zep_type: ZepDataType.ZepFloat | ZepDataType.ZepNumber;
    value?: number | undefined;
    default?: number | undefined;
}, {
    description: string;
    zep_type: ZepDataType.ZepFloat | ZepDataType.ZepNumber;
    value?: string | number | undefined;
    default?: string | number | undefined;
}>;
export interface ZepNumberField extends HasOptionalValue<number> {
    zep_type: ZepDataType.ZepNumber | ZepDataType.ZepFloat;
    description: string;
}
export declare const zepNumberField: (description: string) => ZepNumberField;
export declare const zepFloatField: (description: string) => ZepNumberField;
