import { objectWithoutOptionalProperties, string, stringLiteral } from "../../../../src/core/schemas/builders";
import { itSchema } from "../utils/itSchema";

describe("objectWithoutOptionalProperties", () => {
    itSchema(
        "all properties are required",
        objectWithoutOptionalProperties({
            foo: string(),
            bar: stringLiteral("bar").optional(),
        }),
        {
            raw: {
                foo: "hello",
            },
            // @ts-expect-error
            parsed: {
                foo: "hello",
            },
        }
    );
});
