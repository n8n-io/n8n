import { HttpRequest } from "@smithy/protocol-http";
export function addExpectContinueMiddleware(options) {
    return (next) => async (args) => {
        const { request } = args;
        if (HttpRequest.isInstance(request) && request.body && options.runtime === "node") {
            if (options.requestHandler?.constructor?.name !== "FetchHttpHandler") {
                request.headers = {
                    ...request.headers,
                    Expect: "100-continue",
                };
            }
        }
        return next({
            ...args,
            request,
        });
    };
}
export const addExpectContinueMiddlewareOptions = {
    step: "build",
    tags: ["SET_EXPECT_HEADER", "EXPECT_HEADER"],
    name: "addExpectContinueMiddleware",
    override: true,
};
export const getAddExpectContinuePlugin = (options) => ({
    applyToStack: (clientStack) => {
        clientStack.add(addExpectContinueMiddleware(options), addExpectContinueMiddlewareOptions);
    },
});
