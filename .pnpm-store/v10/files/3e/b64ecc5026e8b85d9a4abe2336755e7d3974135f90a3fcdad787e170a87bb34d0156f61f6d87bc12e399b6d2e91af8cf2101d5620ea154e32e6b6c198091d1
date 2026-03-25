import { z } from "zod";
import { ZepDataType } from "./base";
import { HasOptionalValue } from "./index";
export declare const ZepDateSchema: z.ZodObject<z.objectUtil.extendShape<{
    zep_type: z.ZodNativeEnum<typeof ZepDataType>;
    description: z.ZodString;
}, {
    zep_type: z.ZodUnion<[z.ZodLiteral<ZepDataType.ZepDate>, z.ZodLiteral<ZepDataType.ZepDateTime>]>;
    value: z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodDate]>, Date, string | Date>>;
}>, "strip", z.ZodTypeAny, {
    description: string;
    zep_type: ZepDataType.ZepDate | ZepDataType.ZepDateTime;
    value?: Date | undefined;
}, {
    description: string;
    zep_type: ZepDataType.ZepDate | ZepDataType.ZepDateTime;
    value?: string | Date | undefined;
}>;
export interface ZepDateField extends HasOptionalValue<Date> {
    zep_type: ZepDataType.ZepDate | ZepDataType.ZepDateTime;
    description: string;
}
export declare const zepDateField: (description: string) => ZepDateField;
export declare const zepDateTimeField: (description: string) => ZepDateField;
