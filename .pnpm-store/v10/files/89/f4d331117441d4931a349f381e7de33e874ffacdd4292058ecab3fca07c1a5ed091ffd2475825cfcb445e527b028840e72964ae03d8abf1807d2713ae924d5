import * as z from "zod/v3";
import { Unrecognized } from "./unrecognized.js";
export type ClosedEnum<T extends Readonly<Record<string, string | number>>> = T[keyof T];
export type OpenEnum<T extends Readonly<Record<string, string | number>>> = T[keyof T] | Unrecognized<T[keyof T] extends number ? number : string>;
export declare function inboundSchema<T extends Record<string, string>>(enumObj: T): z.ZodType<OpenEnum<T>, z.ZodTypeDef, unknown>;
export declare function inboundSchemaInt<T extends Record<string, number | string>>(enumObj: T): z.ZodType<OpenEnum<T>, z.ZodTypeDef, unknown>;
export declare function outboundSchema<T extends Record<string, string>>(_: T): z.ZodType<string, z.ZodTypeDef, OpenEnum<T>>;
export declare function outboundSchemaInt<T extends Record<string, number | string>>(_: T): z.ZodType<number, z.ZodTypeDef, OpenEnum<T>>;
//# sourceMappingURL=enums.d.ts.map