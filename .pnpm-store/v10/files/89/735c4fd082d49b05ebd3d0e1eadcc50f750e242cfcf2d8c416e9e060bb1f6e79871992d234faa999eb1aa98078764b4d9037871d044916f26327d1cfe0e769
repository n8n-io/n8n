import { set, string } from "../../../../src/core/schemas/builders";
import { itSchema } from "../utils/itSchema";
import { itValidateJson, itValidateParse } from "../utils/itValidate";

describe("set", () => {
    itSchema("converts between raw list and parsed Set", set(string()), {
        raw: ["A", "B"],
        parsed: new Set(["A", "B"]),
    });

    itValidateParse("not a list", set(string()), 42, [
        {
            path: [],
            message: "Expected list. Received 42.",
        },
    ]);

    itValidateJson(
        "not a Set",
        set(string()),
        [],
        [
            {
                path: [],
                message: "Expected Set. Received list.",
            },
        ]
    );

    itValidateParse(
        "invalid item type",
        set(string()),
        [42],
        [
            {
                path: ["[0]"],
                message: "Expected string. Received 42.",
            },
        ]
    );

    itValidateJson("invalid item type", set(string()), new Set([42]), [
        {
            path: ["[0]"],
            message: "Expected string. Received 42.",
        },
    ]);
});
