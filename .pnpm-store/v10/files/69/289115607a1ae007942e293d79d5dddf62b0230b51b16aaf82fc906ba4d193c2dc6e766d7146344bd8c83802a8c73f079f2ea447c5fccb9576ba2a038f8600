import { number, object, property, string, undiscriminatedUnion } from "../../../../src/core/schemas/builders";
import { itSchema, itSchemaIdentity } from "../utils/itSchema";

describe("undiscriminatedUnion", () => {
    itSchemaIdentity(undiscriminatedUnion([string(), number()]), "hello world");

    itSchemaIdentity(undiscriminatedUnion([object({ hello: string() }), object({ goodbye: string() })]), {
        goodbye: "foo",
    });

    itSchema(
        "Correctly transforms",
        undiscriminatedUnion([object({ hello: string() }), object({ helloWorld: property("hello_world", string()) })]),
        {
            raw: { hello_world: "foo " },
            parsed: { helloWorld: "foo " },
        }
    );

    it("Returns errors for all variants", async () => {
        const result = await undiscriminatedUnion([string(), number()]).parse(true);
        if (result.ok) {
            throw new Error("Unexpectedly passed validation");
        }
        expect(result.errors).toEqual([
            {
                message: "[Variant 0] Expected string. Received true.",
                path: [],
            },
            {
                message: "[Variant 1] Expected number. Received true.",
                path: [],
            },
        ]);
    });

    describe("compile", () => {
        // eslint-disable-next-line jest/expect-expect
        it("doesn't compile with zero members", () => {
            // @ts-expect-error
            () => undiscriminatedUnion([]);
        });
    });
});
