import { ZodTypeDef } from "zod";
import { Options, Targets } from "./Options.js";
import { JsonSchema7Type } from "./parseDef.js";
export type Refs = {
    seen: Map<ZodTypeDef, Seen>;
    currentPath: string[];
    propertyPath: string[] | undefined;
} & Options<Targets>;
export type Seen = {
    def: ZodTypeDef;
    path: string[];
    jsonSchema: JsonSchema7Type | undefined;
};
export declare const getRefs: (options?: string | Partial<Options<Targets>>) => Refs;
