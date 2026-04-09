import type { WidgetType } from "@huggingface/tasks";
import type { InferenceProvider, InferenceProviderMappingEntry, InferenceProviderOrPolicy, ModelId } from "../types.js";
export declare const inferenceProviderMappingCache: Map<string, InferenceProviderMappingEntry[]>;
export declare function fetchInferenceProviderMappingForModel(modelId: ModelId, accessToken?: string, options?: {
    fetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}): Promise<InferenceProviderMappingEntry[]>;
export declare function getInferenceProviderMapping(params: {
    accessToken?: string;
    modelId: ModelId;
    provider: InferenceProvider;
    task: WidgetType;
}, options: {
    fetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}): Promise<InferenceProviderMappingEntry | null>;
export declare function resolveProvider(provider?: InferenceProviderOrPolicy, modelId?: string, endpointUrl?: string): Promise<InferenceProvider>;
//# sourceMappingURL=getInferenceProviderMapping.d.ts.map