import type { Request, RequestUrl } from "./Request.js";
import type { Warnings } from "./Warnings.js";
export { COMMON_SUPPORTED_ARGS } from "./curl/opts.js";
export { getFirst } from "./Request.js";
export type { Request, RequestUrl, Warnings };
export declare function clip(s: string, maxLength?: number): string;
/**
 * Accepts a string of Bash code or a tokenized argv array.
 * Returns an array of parsed curl objects.
 * @param command a string of Bash code containing at least one curl command or an
 * array of shell argument tokens (meant for passing process.argv).
 */
export declare function parse(command: string | string[], supportedArgs?: Set<string>, warnings?: Warnings): Request[];
