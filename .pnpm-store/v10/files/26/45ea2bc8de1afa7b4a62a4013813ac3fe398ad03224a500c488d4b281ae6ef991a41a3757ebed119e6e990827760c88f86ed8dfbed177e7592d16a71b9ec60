import { lazyObject, number, object, string } from "../../../../src/core/schemas/builders";
import { itSchemaIdentity } from "../utils/itSchema";

describe("lazy", () => {
    itSchemaIdentity(
        lazyObject(() => object({ foo: string() })),
        { foo: "hello" }
    );

    itSchemaIdentity(
        lazyObject(() => object({ foo: string() })).extend(object({ bar: number() })),
        {
            foo: "hello",
            bar: 42,
        },
        { title: "returned schema has object utils" }
    );
});
