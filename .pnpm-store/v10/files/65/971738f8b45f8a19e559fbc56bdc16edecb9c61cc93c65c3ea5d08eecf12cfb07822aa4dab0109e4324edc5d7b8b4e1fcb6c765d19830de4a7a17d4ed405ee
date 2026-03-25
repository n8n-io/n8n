import { TransformOptions } from "stream";
import Utf8Stream = require("../utils/Utf8Stream");

export = JsonlParser;

declare class JsonlParser extends Utf8Stream {
    constructor(options?: JsonlParser.JsonlParserOptions);
}

declare namespace JsonlParser {
    interface JsonlParserOptions extends TransformOptions {
        reviver?: ((this: any, key: string, value: any) => any) | undefined;
        checkErrors?: boolean | undefined;
    }

    function make(options?: JsonlParserOptions): JsonlParser;

    namespace make {
        type Constructor = JsonlParser;
        const Constructor: typeof JsonlParser;
    }

    function parser(options?: JsonlParserOptions): JsonlParser;

    namespace parser {
        type Constructor = JsonlParser;
        const Constructor: typeof JsonlParser;
    }
}
