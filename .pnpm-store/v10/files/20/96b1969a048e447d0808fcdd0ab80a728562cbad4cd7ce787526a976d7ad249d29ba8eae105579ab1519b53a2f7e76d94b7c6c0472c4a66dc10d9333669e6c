import { HttpRequest } from "@smithy/protocol-http";
import { NoOpLogger } from "@smithy/smithy-client";
const CONTENT_LENGTH_HEADER = "content-length";
const DECODED_CONTENT_LENGTH_HEADER = "x-amz-decoded-content-length";
export function checkContentLengthHeader() {
    return (next, context) => async (args) => {
        const { request } = args;
        if (HttpRequest.isInstance(request)) {
            if (!(CONTENT_LENGTH_HEADER in request.headers) && !(DECODED_CONTENT_LENGTH_HEADER in request.headers)) {
                const message = `Are you using a Stream of unknown length as the Body of a PutObject request? Consider using Upload instead from @aws-sdk/lib-storage.`;
                if (typeof context?.logger?.warn === "function" && !(context.logger instanceof NoOpLogger)) {
                    context.logger.warn(message);
                }
                else {
                    console.warn(message);
                }
            }
        }
        return next({ ...args });
    };
}
export const checkContentLengthHeaderMiddlewareOptions = {
    step: "finalizeRequest",
    tags: ["CHECK_CONTENT_LENGTH_HEADER"],
    name: "getCheckContentLengthHeaderPlugin",
    override: true,
};
export const getCheckContentLengthHeaderPlugin = (unused) => ({
    applyToStack: (clientStack) => {
        clientStack.add(checkContentLengthHeader(), checkContentLengthHeaderMiddlewareOptions);
    },
});
