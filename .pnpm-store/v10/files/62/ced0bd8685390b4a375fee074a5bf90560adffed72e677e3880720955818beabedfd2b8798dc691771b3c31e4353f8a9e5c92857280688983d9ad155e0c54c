import { number, record, string } from "../../../../src/core/schemas/builders";
import { itSchemaIdentity } from "../utils/itSchema";
import { itValidate } from "../utils/itValidate";

describe("record", () => {
    itSchemaIdentity(record(string(), string()), { hello: "world" });
    itSchemaIdentity(record(number(), string()), { 42: "world" });

    itValidate(
        "non-record",
        record(number(), string()),
        [],
        [
            {
                path: [],
                message: "Expected object. Received list.",
            },
        ]
    );

    itValidate("invalid key type", record(number(), string()), { hello: "world" }, [
        {
            path: ["hello (key)"],
            message: 'Expected number. Received "hello".',
        },
    ]);

    itValidate("invalid value type", record(string(), number()), { hello: "world" }, [
        {
            path: ["hello"],
            message: 'Expected number. Received "world".',
        },
    ]);
});
