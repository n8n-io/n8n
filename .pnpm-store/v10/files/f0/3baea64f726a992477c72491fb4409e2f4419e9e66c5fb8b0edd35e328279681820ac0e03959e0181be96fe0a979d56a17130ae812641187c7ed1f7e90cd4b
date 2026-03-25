import { z } from "zod";
export declare enum ZepDataType {
    ZepText = "ZepText",
    ZepZipCode = "ZepZipCode",
    ZepDate = "ZepDate",
    ZepDateTime = "ZepDateTime",
    ZepEmail = "ZepEmail",
    ZepPhoneNumber = "ZepPhoneNumber",
    ZepFloat = "ZepFloat",
    ZepNumber = "ZepNumber",
    ZepRegex = "ZepRegex"
}
export declare const BaseSchema: z.ZodObject<{
    zep_type: z.ZodNativeEnum<typeof ZepDataType>;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    description: string;
    zep_type: ZepDataType;
}, {
    description: string;
    zep_type: ZepDataType;
}>;
