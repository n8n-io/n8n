import { zodToJsonSchema } from "zod-to-json-schema";

type Check<A, B> = A extends B ? true : false;

export const isFunction: Check<typeof zodToJsonSchema, Function> = true;
export const isNotArray: Check<typeof zodToJsonSchema, []> = false;

export function $schemaIsString(schema: ReturnType<typeof zodToJsonSchema>) {
  if ("$schema" in schema && schema.$schema) {
    schema.$schema.toLowerCase();
    // @ts-expect-error
    schema.$schema * 2;
  }
}
