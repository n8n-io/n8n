// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { StorageClient } from "./generated/src";
/**
 * @internal
 */
export class StorageContextClient extends StorageClient {
    async sendOperationRequest(operationArguments, operationSpec) {
        const operationSpecToSend = Object.assign({}, operationSpec);
        if (operationSpecToSend.path === "/{containerName}" ||
            operationSpecToSend.path === "/{containerName}/{blob}") {
            operationSpecToSend.path = "";
        }
        return super.sendOperationRequest(operationArguments, operationSpecToSend);
    }
}
//# sourceMappingURL=StorageContextClient.js.map