import { boolean } from "../../../../src/core/schemas/builders";
import { itSchemaIdentity } from "../utils/itSchema";
import { itValidate } from "../utils/itValidate";

describe("boolean", () => {
    itSchemaIdentity(boolean(), true);

    itValidate("non-boolean", boolean(), {}, [
        {
            path: [],
            message: "Expected boolean. Received object.",
        },
    ]);
});
