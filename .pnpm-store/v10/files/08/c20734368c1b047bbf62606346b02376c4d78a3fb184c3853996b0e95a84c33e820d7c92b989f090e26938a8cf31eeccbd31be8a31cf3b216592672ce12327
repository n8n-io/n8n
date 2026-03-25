import { httpSigningMiddlewareOptions } from "@smithy/core";
import { HttpRequest } from "@smithy/protocol-http";
import { SMITHY_CONTEXT_KEY, } from "@smithy/types";
import { getSmithyContext } from "@smithy/util-middleware";
import { signS3Express } from "./signS3Express";
const defaultErrorHandler = (signingProperties) => (error) => {
    throw error;
};
const defaultSuccessHandler = (httpResponse, signingProperties) => { };
export const s3ExpressHttpSigningMiddlewareOptions = httpSigningMiddlewareOptions;
export const s3ExpressHttpSigningMiddleware = (config) => (next, context) => async (args) => {
    if (!HttpRequest.isInstance(args.request)) {
        return next(args);
    }
    const smithyContext = getSmithyContext(context);
    const scheme = smithyContext.selectedHttpAuthScheme;
    if (!scheme) {
        throw new Error(`No HttpAuthScheme was selected: unable to sign request`);
    }
    const { httpAuthOption: { signingProperties = {} }, identity, signer, } = scheme;
    let request;
    if (context.s3ExpressIdentity) {
        request = await signS3Express(context.s3ExpressIdentity, signingProperties, args.request, await config.signer());
    }
    else {
        request = await signer.sign(args.request, identity, signingProperties);
    }
    const output = await next({
        ...args,
        request,
    }).catch((signer.errorHandler || defaultErrorHandler)(signingProperties));
    (signer.successHandler || defaultSuccessHandler)(output.response, signingProperties);
    return output;
};
export const getS3ExpressHttpSigningPlugin = (config) => ({
    applyToStack: (clientStack) => {
        clientStack.addRelativeTo(s3ExpressHttpSigningMiddleware(config), httpSigningMiddlewareOptions);
    },
});
