/* eslint-disable no-console */

import { boolean, number, object, property, string, undiscriminatedUnion } from "../../../src/core/schemas/builders";

describe("skipValidation", () => {
    it("allows data that doesn't conform to the schema", async () => {
        const warningLogs: string[] = [];
        const originalConsoleWarn = console.warn;
        console.warn = (...args) => warningLogs.push(args.join(" "));

        const schema = object({
            camelCase: property("snake_case", string()),
            numberProperty: number(),
            requiredProperty: boolean(),
            anyPrimitive: undiscriminatedUnion([string(), number(), boolean()]),
        });

        const parsed = await schema.parse(
            {
                snake_case: "hello",
                numberProperty: "oops",
                anyPrimitive: true,
            },
            {
                skipValidation: true,
            }
        );

        expect(parsed).toEqual({
            ok: true,
            value: {
                camelCase: "hello",
                numberProperty: "oops",
                anyPrimitive: true,
            },
        });

        expect(warningLogs).toEqual([
            `Failed to validate.
  - numberProperty: Expected number. Received "oops".`,
        ]);

        console.warn = originalConsoleWarn;
    });
});
