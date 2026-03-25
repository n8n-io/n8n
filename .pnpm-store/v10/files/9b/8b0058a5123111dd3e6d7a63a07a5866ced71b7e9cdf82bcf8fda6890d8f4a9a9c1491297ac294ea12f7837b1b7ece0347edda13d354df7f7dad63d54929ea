import { SugGetOptions } from './SUGGET';
import { SuggestionWithPayload } from './SUGGET_WITHPAYLOADS';
import { SuggestionWithScores } from './SUGGET_WITHSCORES';
export { IS_READ_ONLY } from './SUGGET';
export declare function transformArguments(key: string, prefix: string, options?: SugGetOptions): Array<string>;
type SuggestionWithScoresAndPayloads = SuggestionWithScores & SuggestionWithPayload;
export declare function transformReply(rawReply: Array<string | null> | null): Array<SuggestionWithScoresAndPayloads> | null;
