import { boolean, object, property, string, stringLiteral } from "../../../../src/core/schemas/builders";
import { itSchema, itSchemaIdentity } from "../utils/itSchema";

describe("extend", () => {
    itSchemaIdentity(
        object({
            foo: string(),
        }).extend(
            object({
                bar: stringLiteral("bar"),
            })
        ),
        {
            foo: "",
            bar: "bar",
        } as const,
        {
            title: "extended properties are included in schema",
        }
    );

    itSchemaIdentity(
        object({
            foo: string(),
        })
            .extend(
                object({
                    bar: stringLiteral("bar"),
                })
            )
            .extend(
                object({
                    baz: boolean(),
                })
            ),
        {
            foo: "",
            bar: "bar",
            baz: true,
        } as const,
        {
            title: "extensions can be extended",
        }
    );

    itSchema(
        "converts nested object",
        object({
            item: object({
                helloWorld: property("hello_world", string()),
            }),
        }).extend(
            object({
                goodbye: property("goodbye_raw", string()),
            })
        ),
        {
            raw: { item: { hello_world: "yo" }, goodbye_raw: "peace" },
            parsed: { item: { helloWorld: "yo" }, goodbye: "peace" },
        }
    );

    itSchema(
        "extensions work with raw/parsed property name conversions",
        object({
            item: property("item_raw", string()),
        }).extend(
            object({
                goodbye: property("goodbye_raw", string()),
            })
        ),
        {
            raw: { item_raw: "hi", goodbye_raw: "peace" },
            parsed: { item: "hi", goodbye: "peace" },
        }
    );

    describe("compile", () => {
        // eslint-disable-next-line jest/expect-expect
        it("doesn't compile with non-object schema", () => {
            () =>
                object({
                    foo: string(),
                })
                    // @ts-expect-error
                    .extend([]);
        });
    });
});
