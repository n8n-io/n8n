import { Location } from '../ref-utils';
import type { Oas3Schema, Oas3_1Schema, Referenced } from '../typings/openapi';
import type { UserContext } from '../walk';
export declare function oasTypeOf(value: unknown): "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function" | "integer" | "array" | "null";
/**
 * Checks if value matches specified JSON schema type
 *
 * @param {*} value - value to check
 * @param {JSONSchemaType} type - JSON Schema type
 * @returns boolean
 */
export declare function matchesJsonSchemaType(value: unknown, type: string, nullable: boolean): boolean;
export declare function missingRequiredField(type: string, field: string): string;
export declare function missingRequiredOneOfFields(type: string, fields: string[]): string;
export declare function fieldNonEmpty(type: string, field: string): string;
export declare function validateDefinedAndNonEmpty(fieldName: string, value: any, ctx: UserContext): void;
export declare function validateOneOfDefinedAndNonEmpty(fieldNames: string[], value: any, ctx: UserContext): void;
export declare function getSuggest(given: string, variants: string[]): string[];
export declare function validateExample(example: any, schema: Referenced<Oas3Schema | Oas3_1Schema>, dataLoc: Location, { resolve, location, report }: UserContext, allowAdditionalProperties: boolean): void;
export declare function getAdditionalPropertiesOption(opts: Record<string, any>): boolean;
export declare function validateSchemaEnumType(schemaEnum: string[], propertyValue: string, propName: string, refLocation: Location | undefined, { report, location }: UserContext): void;
export declare function validateResponseCodes(responseCodes: string[], codeRange: string, { report }: UserContext): void;
