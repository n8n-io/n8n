import type { getProviderHelper } from "../lib/getProviderHelper.js";
import type { InferenceTask, Options, RequestArgs } from "../types.js";
export interface ResponseWrapper<T> {
    data: T;
    requestContext: {
        url: string;
        info: RequestInit;
    };
}
/**
 * Primitive to make custom calls to the inference provider
 */
export declare function innerRequest<T>(args: RequestArgs, providerHelper: ReturnType<typeof getProviderHelper>, options?: Options & {
    /** In most cases (unless we pass a endpointUrl) we know the task */
    task?: InferenceTask;
    /** Is chat completion compatible */
    chatCompletion?: boolean;
}): Promise<ResponseWrapper<T>>;
/**
 * Primitive to make custom inference calls that expect server-sent events, and returns the response through a generator
 */
export declare function innerStreamingRequest<T>(args: RequestArgs, providerHelper: ReturnType<typeof getProviderHelper>, options?: Options & {
    /** In most cases (unless we pass a endpointUrl) we know the task */
    task?: InferenceTask;
    /** Is chat completion compatible */
    chatCompletion?: boolean;
}): AsyncGenerator<T>;
//# sourceMappingURL=request.d.ts.map