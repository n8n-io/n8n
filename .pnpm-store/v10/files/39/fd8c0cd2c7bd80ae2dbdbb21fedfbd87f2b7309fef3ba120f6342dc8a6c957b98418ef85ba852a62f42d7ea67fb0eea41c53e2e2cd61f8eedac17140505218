import { object } from "../../../../../src/core/schemas/builders/object";
import { optional } from "../../../../../src/core/schemas/builders/schema-utils";
import { schemaA } from "./a";

// @ts-expect-error
export const schemaB = object({
    a: optional(schemaA),
});
