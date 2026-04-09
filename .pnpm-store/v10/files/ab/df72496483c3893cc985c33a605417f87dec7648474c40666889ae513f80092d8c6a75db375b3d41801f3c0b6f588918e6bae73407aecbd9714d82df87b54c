// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createRestError as tspCreateRestError, } from "@typespec/ts-http-runtime";
export function createRestError(messageOrResponse, response) {
    if (typeof messageOrResponse === "string") {
        return tspCreateRestError(messageOrResponse, response);
    }
    else {
        return tspCreateRestError(messageOrResponse);
    }
}
//# sourceMappingURL=restError.js.map