import { TransformOptions } from "stream";
import Utf8Stream = require("./utils/Utf8Stream");

export = Parser;

declare class Parser extends Utf8Stream {
    constructor(options?: Parser.ParserOptions);
}

declare namespace Parser {
    interface ParserOptions extends TransformOptions {
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

    function make(options?: ParserOptions): Parser;

    namespace make {
        type Constructor = Parser;
        const Constructor: typeof Parser;
    }

    function parser(options?: ParserOptions): Parser;

    namespace parser {
        type Constructor = Parser;
        const Constructor: typeof Parser;
    }
}
