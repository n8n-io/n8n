import { flexibleChecksumsInputMiddleware, flexibleChecksumsInputMiddlewareOptions, } from "./flexibleChecksumsInputMiddleware";
import { flexibleChecksumsMiddleware, flexibleChecksumsMiddlewareOptions, } from "./flexibleChecksumsMiddleware";
import { flexibleChecksumsResponseMiddleware, flexibleChecksumsResponseMiddlewareOptions, } from "./flexibleChecksumsResponseMiddleware";
export const getFlexibleChecksumsPlugin = (config, middlewareConfig) => ({
    applyToStack: (clientStack) => {
        clientStack.add(flexibleChecksumsMiddleware(config, middlewareConfig), flexibleChecksumsMiddlewareOptions);
        clientStack.addRelativeTo(flexibleChecksumsInputMiddleware(config, middlewareConfig), flexibleChecksumsInputMiddlewareOptions);
        clientStack.addRelativeTo(flexibleChecksumsResponseMiddleware(config, middlewareConfig), flexibleChecksumsResponseMiddlewareOptions);
    },
});
