// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createHmac } from "crypto";
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 *
 * UserDelegationKeyCredential is only used for generation of user delegation SAS.
 * @see https://docs.microsoft.com/en-us/rest/api/storageservices/create-user-delegation-sas
 */
export class UserDelegationKeyCredential {
    /**
     * Creates an instance of UserDelegationKeyCredential.
     * @param accountName -
     * @param userDelegationKey -
     */
    constructor(accountName, userDelegationKey) {
        this.accountName = accountName;
        this.userDelegationKey = userDelegationKey;
        this.key = Buffer.from(userDelegationKey.value, "base64");
    }
    /**
     * Generates a hash signature for an HTTP request or for a SAS.
     *
     * @param stringToSign -
     */
    computeHMACSHA256(stringToSign) {
        // console.log(`stringToSign: ${JSON.stringify(stringToSign)}`);
        return createHmac("sha256", this.key).update(stringToSign, "utf8").digest("base64");
    }
}
//# sourceMappingURL=UserDelegationKeyCredential.js.map