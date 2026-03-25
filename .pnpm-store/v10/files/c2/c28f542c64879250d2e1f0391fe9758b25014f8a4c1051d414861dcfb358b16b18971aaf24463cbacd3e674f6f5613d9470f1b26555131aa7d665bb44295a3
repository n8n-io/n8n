import type { InferenceTask, Options, RequestArgs } from "../types.js";
import type { InferenceProviderMappingEntry } from "./getInferenceProviderMapping.js";
import type { getProviderHelper } from "./getProviderHelper.js";
/**
 * Helper that prepares request arguments.
 * This async version handle the model ID resolution step.
 */
export declare function makeRequestOptions(args: RequestArgs & {
    data?: Blob | ArrayBuffer;
    stream?: boolean;
}, providerHelper: ReturnType<typeof getProviderHelper>, options?: Options & {
    /** In most cases (unless we pass a endpointUrl) we know the task */
    task?: InferenceTask;
}): Promise<{
    url: string;
    info: RequestInit;
}>;
/**
 * Helper that prepares request arguments. - for internal use only
 * This sync version skips the model ID resolution step
 */
export declare function makeRequestOptionsFromResolvedModel(resolvedModel: string, providerHelper: ReturnType<typeof getProviderHelper>, args: RequestArgs & {
    data?: Blob | ArrayBuffer;
    stream?: boolean;
}, mapping: InferenceProviderMappingEntry | undefined, options?: Options & {
    task?: InferenceTask;
}): {
    url: string;
    info: RequestInit;
};
//# sourceMappingURL=makeRequestOptions.d.ts.map