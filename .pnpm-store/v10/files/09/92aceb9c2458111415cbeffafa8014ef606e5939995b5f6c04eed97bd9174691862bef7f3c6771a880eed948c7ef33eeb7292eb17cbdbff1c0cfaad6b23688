/**
 * Serializes BigInt and NumericValue to JSON-number.
 * @internal
 */
export declare class JsonReplacer {
    /**
     * Stores placeholder key to true serialized value lookup.
     */
    private readonly values;
    private counter;
    private stage;
    /**
     * Creates a jsonReplacer function that reserves big integer and big decimal values
     * for later replacement.
     */
    createReplacer(): (key: string, value: unknown) => unknown;
    /**
     * Replaces placeholder keys with their true values.
     */
    replaceInJson(json: string): string;
}
