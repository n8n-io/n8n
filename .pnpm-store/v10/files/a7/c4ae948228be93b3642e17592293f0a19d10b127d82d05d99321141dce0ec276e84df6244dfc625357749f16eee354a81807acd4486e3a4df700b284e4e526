import { getSmithyContext } from "@smithy/util-middleware";
import { operation } from "../schemas/operation";
export const schemaSerializationMiddleware = (config) => (next, context) => async (args) => {
    const { operationSchema } = getSmithyContext(context);
    const [, ns, n, t, i, o] = operationSchema ?? [];
    const endpoint = context.endpointV2?.url && config.urlParser
        ? async () => config.urlParser(context.endpointV2.url)
        : config.endpoint;
    const request = await config.protocol.serializeRequest(operation(ns, n, t, i, o), args.input, {
        ...config,
        ...context,
        endpoint,
    });
    return next({
        ...args,
        request,
    });
};
