import type { Logger } from "../client.js";
import { BetaContentBlock, BetaJSONOutputFormat, BetaMessage, BetaTextBlock, MessageCreateParams } from "../resources/beta/messages/messages.js";
type Simplify<T> = {
    [KeyType in keyof T]: T[KeyType];
} & {};
export type BetaParseableMessageCreateParams = Simplify<Omit<MessageCreateParams, 'output_format'> & {
    output_format?: BetaJSONOutputFormat | AutoParseableBetaOutputFormat<any> | null;
}>;
export type ExtractParsedContentFromBetaParams<Params extends BetaParseableMessageCreateParams> = Params['output_format'] extends AutoParseableBetaOutputFormat<infer P> ? P : null;
export type AutoParseableBetaOutputFormat<ParsedT> = BetaJSONOutputFormat & {
    parse(content: string): ParsedT;
};
export type ParsedBetaMessage<ParsedT> = BetaMessage & {
    content: Array<ParsedBetaContentBlock<ParsedT>>;
    parsed_output: ParsedT | null;
};
export type ParsedBetaContentBlock<ParsedT> = (BetaTextBlock & {
    parsed_output: ParsedT | null;
}) | Exclude<BetaContentBlock, BetaTextBlock>;
export declare function maybeParseBetaMessage<Params extends BetaParseableMessageCreateParams | null>(message: BetaMessage, params: Params, opts: {
    logger: Logger;
}): ParsedBetaMessage<ExtractParsedContentFromBetaParams<NonNullable<Params>>>;
export declare function parseBetaMessage<Params extends BetaParseableMessageCreateParams>(message: BetaMessage, params: Params, opts: {
    logger: Logger;
}): ParsedBetaMessage<ExtractParsedContentFromBetaParams<Params>>;
export {};
//# sourceMappingURL=beta-parser.d.ts.map