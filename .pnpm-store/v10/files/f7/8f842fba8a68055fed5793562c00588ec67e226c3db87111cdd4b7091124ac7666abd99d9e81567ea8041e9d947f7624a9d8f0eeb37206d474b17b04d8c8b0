import { object, string } from "../../../../src/core/schemas/builders";
import { itSchema } from "../utils/itSchema";

describe("getSchemaUtils", () => {
    describe("optional()", () => {
        itSchema("optional fields allow original schema", string().optional(), {
            raw: "hello",
            parsed: "hello",
        });

        itSchema("optional fields are not required", string().optional(), {
            raw: null,
            parsed: undefined,
        });
    });

    describe("transform()", () => {
        itSchema(
            "transorm and untransform run correctly",
            string().transform({
                transform: (x) => x + "X",
                untransform: (x) => (x as string).slice(0, -1),
            }),
            {
                raw: "hello",
                parsed: "helloX",
            }
        );
    });

    describe("parseOrThrow()", () => {
        it("parses valid value", async () => {
            const value = string().parseOrThrow("hello");
            expect(value).toBe("hello");
        });

        it("throws on invalid value", async () => {
            const value = () => object({ a: string(), b: string() }).parseOrThrow({ a: 24 });
            expect(value).toThrowError(new Error('a: Expected string. Received 24.; Missing required key "b"'));
        });
    });

    describe("jsonOrThrow()", () => {
        it("serializes valid value", async () => {
            const value = string().jsonOrThrow("hello");
            expect(value).toBe("hello");
        });

        it("throws on invalid value", async () => {
            const value = () => object({ a: string(), b: string() }).jsonOrThrow({ a: 24 });
            expect(value).toThrowError(new Error('a: Expected string. Received 24.; Missing required key "b"'));
        });
    });

    describe("omitUndefined", () => {
        it("serializes undefined as null", async () => {
            const value = object({
                a: string().optional(),
                b: string().optional(),
            }).jsonOrThrow({
                a: "hello",
                b: undefined,
            });
            expect(value).toEqual({ a: "hello", b: null });
        });

        it("omits undefined values", async () => {
            const value = object({
                a: string().optional(),
                b: string().optional(),
            }).jsonOrThrow(
                {
                    a: "hello",
                    b: undefined,
                },
                {
                    omitUndefined: true,
                }
            );
            expect(value).toEqual({ a: "hello" });
        });
    });
});
