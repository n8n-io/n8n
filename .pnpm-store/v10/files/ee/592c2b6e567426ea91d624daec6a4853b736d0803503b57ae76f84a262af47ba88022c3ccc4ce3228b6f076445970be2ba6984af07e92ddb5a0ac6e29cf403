import { HttpRequest } from "@smithy/protocol-http";
import { isWebSocketRequest } from "./utils";
export class WebsocketSignatureV4 {
    signer;
    constructor(options) {
        this.signer = options.signer;
    }
    presign(originalRequest, options = {}) {
        return this.signer.presign(originalRequest, options);
    }
    async sign(toSign, options) {
        if (HttpRequest.isInstance(toSign) && isWebSocketRequest(toSign)) {
            const signedRequest = await this.signer.presign({ ...toSign, body: "" }, {
                ...options,
                expiresIn: 60,
                unsignableHeaders: new Set(Object.keys(toSign.headers).filter((header) => header !== "host")),
            });
            return {
                ...signedRequest,
                body: toSign.body,
            };
        }
        else {
            return this.signer.sign(toSign, options);
        }
    }
}
