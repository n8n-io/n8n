import * as tasks from "./tasks/index.js";
import { omit } from "./utils/omit.js";
import { typedEntries } from "./utils/typedEntries.js";
export class InferenceClient {
    accessToken;
    defaultOptions;
    constructor(accessToken = "", defaultOptions = {}) {
        this.accessToken = accessToken;
        this.defaultOptions = defaultOptions;
        for (const [name, fn] of typedEntries(tasks)) {
            Object.defineProperty(this, name, {
                enumerable: false,
                value: (params, options) => 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                fn(
                /// ^ The cast of fn to any is necessary, otherwise TS can't compile because the generated union type is too complex
                { endpointUrl: defaultOptions.endpointUrl, accessToken, ...params }, {
                    ...omit(defaultOptions, ["endpointUrl"]),
                    ...options,
                }),
            });
        }
    }
    /**
     * Returns a new instance of InferenceClient tied to a specified endpoint.
     *
     * For backward compatibility mostly.
     */
    endpoint(endpointUrl) {
        return new InferenceClient(this.accessToken, { ...this.defaultOptions, endpointUrl });
    }
}
/**
 * For backward compatibility only, will remove soon.
 * @deprecated replace with InferenceClient
 */
export class HfInference extends InferenceClient {
}
/**
 * For backward compatibility only, will remove soon.
 * @deprecated replace with InferenceClient
 */
export class InferenceClientEndpoint extends InferenceClient {
}
