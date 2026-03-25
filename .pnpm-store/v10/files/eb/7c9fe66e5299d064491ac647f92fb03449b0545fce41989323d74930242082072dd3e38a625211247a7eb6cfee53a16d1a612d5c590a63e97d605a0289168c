// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createHmac } from "crypto";
import { StorageSharedKeyCredentialPolicy } from "../policies/StorageSharedKeyCredentialPolicy";
import { Credential } from "./Credential";
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 *
 * StorageSharedKeyCredential for account key authorization of Azure Storage service.
 */
export class StorageSharedKeyCredential extends Credential {
    /**
     * Creates an instance of StorageSharedKeyCredential.
     * @param accountName -
     * @param accountKey -
     */
    constructor(accountName, accountKey) {
        super();
        this.accountName = accountName;
        this.accountKey = Buffer.from(accountKey, "base64");
    }
    /**
     * Creates a StorageSharedKeyCredentialPolicy object.
     *
     * @param nextPolicy -
     * @param options -
     */
    create(nextPolicy, options) {
        return new StorageSharedKeyCredentialPolicy(nextPolicy, options, this);
    }
    /**
     * Generates a hash signature for an HTTP request or for a SAS.
     *
     * @param stringToSign -
     */
    computeHMACSHA256(stringToSign) {
        return createHmac("sha256", this.accountKey).update(stringToSign, "utf8").digest("base64");
    }
}
//# sourceMappingURL=StorageSharedKeyCredential.js.map