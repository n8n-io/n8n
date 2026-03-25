type Options = {
    pretty?: boolean | undefined;
    theme?: Record<string, string> | undefined;
};
export declare function tokenize(json?: unknown, options?: Options): {
    type: string;
    value: string;
}[];
/**
 * Add color to JSON.
 *
 * options
 *  pretty: set to true to pretty print the JSON (defaults to true)
 *  theme: theme to use for colorizing. See keys below for available options. All keys are optional and must be valid colors (e.g. hex code, rgb, or standard ansi color).
 *
 * Available theme keys:
 * - brace
 * - bracket
 * - colon
 * - comma
 * - key
 * - string
 * - number
 * - boolean
 * - null
 */
export default function colorizeJson(json: unknown, options?: Options): string;
export {};
