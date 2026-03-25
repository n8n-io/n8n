import { recursionDetectionMiddlewareOptions } from "./configuration";
import { recursionDetectionMiddleware } from "./recursionDetectionMiddleware";
export const getRecursionDetectionPlugin = (options) => ({
    applyToStack: (clientStack) => {
        clientStack.add(recursionDetectionMiddleware(), recursionDetectionMiddlewareOptions);
    },
});
