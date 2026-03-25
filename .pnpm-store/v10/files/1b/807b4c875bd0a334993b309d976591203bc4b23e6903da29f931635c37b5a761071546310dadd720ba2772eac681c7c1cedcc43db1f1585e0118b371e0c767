import * as tasks from "./tasks/index.js";
import type { Options } from "./types.js";
type Task = typeof tasks;
export declare class InferenceClient {
    private readonly accessToken;
    private readonly defaultOptions;
    constructor(accessToken?: string, defaultOptions?: Options & {
        endpointUrl?: string;
    });
    /**
     * Returns a new instance of InferenceClient tied to a specified endpoint.
     *
     * For backward compatibility mostly.
     */
    endpoint(endpointUrl: string): InferenceClient;
}
export interface InferenceClient extends Task {
}
/**
 * For backward compatibility only, will remove soon.
 * @deprecated replace with InferenceClient
 */
export declare class HfInference extends InferenceClient {
}
/**
 * For backward compatibility only, will remove soon.
 * @deprecated replace with InferenceClient
 */
export declare class InferenceClientEndpoint extends InferenceClient {
}
export {};
//# sourceMappingURL=InferenceClient.d.ts.map