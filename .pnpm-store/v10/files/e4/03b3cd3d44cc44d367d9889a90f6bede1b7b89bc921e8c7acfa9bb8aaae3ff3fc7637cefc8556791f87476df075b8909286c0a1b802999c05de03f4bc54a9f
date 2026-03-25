export const injectSessionIdMiddleware = () => (next) => async (args) => {
    const requestParams = {
        ...args.input,
    };
    const response = await next(args);
    const output = response.output;
    if (requestParams.SessionId && output.SessionId == null) {
        output.SessionId = requestParams.SessionId;
    }
    return response;
};
export const injectSessionIdMiddlewareOptions = {
    step: "initialize",
    name: "injectSessionIdMiddleware",
    tags: ["WEBSOCKET", "EVENT_STREAM"],
    override: true,
};
