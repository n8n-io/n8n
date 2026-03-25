// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { BaseRequestPolicy } from "./RequestPolicy";
/**
 * Credential policy used to sign HTTP(S) requests before sending. This is an
 * abstract class.
 */
export class CredentialPolicy extends BaseRequestPolicy {
    /**
     * Sends out request.
     *
     * @param request -
     */
    sendRequest(request) {
        return this._nextPolicy.sendRequest(this.signRequest(request));
    }
    /**
     * Child classes must implement this method with request signing. This method
     * will be executed in {@link sendRequest}.
     *
     * @param request -
     */
    signRequest(request) {
        // Child classes must override this method with request signing. This method
        // will be executed in sendRequest().
        return request;
    }
}
//# sourceMappingURL=CredentialPolicy.js.map