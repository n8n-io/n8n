import type { Scope } from "./parser/tokenizer/state";
import type TokenProcessor from "./TokenProcessor";
/**
 * Traverse the given tokens and modify them if necessary to indicate that some names shadow global
 * variables.
 */
export default function identifyShadowedGlobals(tokens: TokenProcessor, scopes: Array<Scope>, globalNames: Set<string>): void;
/**
 * We can do a fast up-front check to see if there are any declarations to global names. If not,
 * then there's no point in computing scope assignments.
 */
export declare function hasShadowedGlobals(tokens: TokenProcessor, globalNames: Set<string>): boolean;
