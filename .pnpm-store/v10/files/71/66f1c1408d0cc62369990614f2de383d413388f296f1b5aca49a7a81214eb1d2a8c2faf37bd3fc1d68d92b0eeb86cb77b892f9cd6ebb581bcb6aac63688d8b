import type NameManager from "../NameManager";
import type TokenProcessor from "../TokenProcessor";
import Transformer from "./Transformer";
/**
 * Transformer supporting the optional chaining and nullish coalescing operators.
 *
 * Tech plan here:
 * https://github.com/alangpierce/sucrase/wiki/Sucrase-Optional-Chaining-and-Nullish-Coalescing-Technical-Plan
 *
 * The prefix and suffix code snippets are handled by TokenProcessor, and this transformer handles
 * the operators themselves.
 */
export default class OptionalChainingNullishTransformer extends Transformer {
    readonly tokens: TokenProcessor;
    readonly nameManager: NameManager;
    constructor(tokens: TokenProcessor, nameManager: NameManager);
    process(): boolean;
    /**
     * Determine if the current token is the last of its chain, so that we know whether it's eligible
     * to have a delete op inserted.
     *
     * We can do this by walking forward until we determine one way or another. Each
     * isOptionalChainStart token must be paired with exactly one isOptionalChainEnd token after it in
     * a nesting way, so we can track depth and walk to the end of the chain (the point where the
     * depth goes negative) and see if any other subscript token is after us in the chain.
     */
    isLastSubscriptInChain(): boolean;
    /**
     * Determine if we are the open-paren in an expression like super.a()?.b.
     *
     * We can do this by walking backward to find the previous subscript. If that subscript was
     * preceded by a super, then we must be the subscript after it, so if this is a call expression,
     * we'll need to attach the right context.
     */
    justSkippedSuper(): boolean;
}
