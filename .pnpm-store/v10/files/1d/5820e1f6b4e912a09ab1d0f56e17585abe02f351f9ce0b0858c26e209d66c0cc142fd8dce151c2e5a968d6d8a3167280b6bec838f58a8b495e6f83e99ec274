import { Duplex, DuplexOptions, Transform, TransformOptions, Writable, WritableOptions } from "stream";
import FilterBase = require("../filters/FilterBase");
import Parser = require("../Parser");
import StreamBase = require("../streamers/StreamBase");
import Chain = require("stream-chain");
export = withParser;

declare function withParser(
    fn: (options: FilterBase.FilterOptions) => FilterBase,
    options?: withParser.FilterOptions,
): Chain;

declare function withParser(
    fn: (options?: StreamBase.StreamOptions) => StreamBase,
    options?: withParser.StreamOptions,
): Chain;

declare function withParser(fn: (options?: TransformOptions) => Transform, options?: Parser.ParserOptions): Chain;

declare namespace withParser {
    interface FilterOptions extends FilterBase.FilterOptions {
        // copied from ParserOptions
        packValues?: boolean | undefined;
        packKeys?: boolean | undefined;
        packStrings?: boolean | undefined;
        packNumbers?: boolean | undefined;
        streamValues?: boolean | undefined;
        streamKeys?: boolean | undefined;
        streamStrings?: boolean | undefined;
        streamNumbers?: boolean | undefined;
        jsonStreaming?: boolean | undefined;
    }

    interface StreamOptions extends StreamBase.StreamOptions {
        // copied from ParserOptions
        packValues?: boolean | undefined;
        packKeys?: boolean | undefined;
        packStrings?: boolean | undefined;
        packNumbers?: boolean | undefined;
        streamValues?: boolean | undefined;
        streamKeys?: boolean | undefined;
        streamStrings?: boolean | undefined;
        streamNumbers?: boolean | undefined;
        jsonStreaming?: boolean | undefined;
    }
}
