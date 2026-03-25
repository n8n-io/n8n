import { date } from "../../../../src/core/schemas/builders/date";
import { itSchema } from "../utils/itSchema";
import { itValidateJson, itValidateParse } from "../utils/itValidate";

describe("date", () => {
    itSchema("converts between raw ISO string and parsed Date", date(), {
        raw: "2022-09-29T05:41:21.939Z",
        parsed: new Date("2022-09-29T05:41:21.939Z"),
    });

    itValidateParse("non-string", date(), 42, [
        {
            message: "Expected string. Received 42.",
            path: [],
        },
    ]);

    itValidateParse("non-ISO", date(), "hello world", [
        {
            message: 'Expected ISO 8601 date string. Received "hello world".',
            path: [],
        },
    ]);

    itValidateJson("non-Date", date(), "hello", [
        {
            message: 'Expected Date object. Received "hello".',
            path: [],
        },
    ]);
});
