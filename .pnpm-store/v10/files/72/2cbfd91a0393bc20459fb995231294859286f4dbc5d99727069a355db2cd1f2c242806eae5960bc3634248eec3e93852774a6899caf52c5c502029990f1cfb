export interface ErrorObject {
    code: string | null;
    message: string;
    param: string | null;
    type: string;
}
export interface FunctionDefinition {
    /**
     * The name of the function to be called. Must be a-z, A-Z, 0-9, or contain
     * underscores and dashes, with a maximum length of 64.
     */
    name: string;
    /**
     * A description of what the function does, used by the model to choose when and
     * how to call the function.
     */
    description?: string;
    /**
     * The parameters the functions accepts, described as a JSON Schema object. See the
     * docs on [tool use](/docs/tool-use) for examples, and the
     * [JSON Schema reference](https://json-schema.org/understanding-json-schema/) for
     * documentation about the format.
     *
     * Omitting `parameters` defines a function with an empty parameter list.
     */
    parameters?: FunctionParameters;
}
/**
 * The parameters the functions accepts, described as a JSON Schema object. See the
 * docs on [tool use](/docs/tool-use) for examples, and the
 * [JSON Schema reference](https://json-schema.org/understanding-json-schema/) for
 * documentation about the format.
 *
 * Omitting `parameters` defines a function with an empty parameter list.
 */
export type FunctionParameters = Record<string, unknown>;
//# sourceMappingURL=shared.d.ts.map