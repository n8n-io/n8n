import { makeBearerDataListing } from '../request';

/**
 * Source: MiniMax's `/models`.
 * Note: we don't rewrite this to the Anthropic-compatible base — that's only
 * required by `@ai-sdk/minimax`, which isn't used here.
 */
export const listMiniMaxModels = makeBearerDataListing('minimax', 'https://api.minimax.io/v1');
