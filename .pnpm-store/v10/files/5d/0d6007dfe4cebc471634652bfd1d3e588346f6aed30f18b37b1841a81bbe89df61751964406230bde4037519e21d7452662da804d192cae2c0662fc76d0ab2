import type { InternalSelector } from "../types.js";
import { type Traversal } from "css-what";
export declare function isTraversal(token: InternalSelector): token is Traversal;
/**
 * Sort the parts of the passed selector, as there is potential for
 * optimization (some types of selectors are faster than others).
 *
 * @param arr Selector to sort
 */
export declare function sortRules(arr: InternalSelector[]): void;
/**
 * Determine the quality of the passed token. The higher the number, the
 * faster the token is to execute.
 *
 * @param token Token to get the quality of.
 * @returns The token's quality.
 */
export declare function getQuality(token: InternalSelector): number;
export declare function includesScopePseudo(t: InternalSelector): boolean;
//# sourceMappingURL=selectors.d.ts.map